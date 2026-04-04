import { Worker } from "bullmq";
import { redis } from "./lib/redis";
import { logger } from "./logger";
import { processImageGeneration } from "./workers/image-generation.worker";
import { processBrandCreation } from "./workers/brand-creation.worker";
import { processQualityCheck } from "./workers/quality-check.worker";
import { processPosterGeneration } from "./workers/poster-generation.worker";

// ── Required Environment Variables ───────────────────────────
const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "REDIS_URL",
  "OPENROUTER_API_KEY",
  "REPLICATE_API_TOKEN",
  "MODEL_STYLE_FINDER",
  "MODEL_PROMPT_BUILDER",
  "MODEL_IMAGE_GEN",
  "MODEL_IMG2IMG",
  "MODEL_POSTER_LAYOUT",
  "MODEL_POSTER_BG_IMAGE",
  "MODEL_SEGMENTATION",
  "MODEL_COMPOSITION_ANALYSER",
];

function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.error(`Missing ${missing.length} required environment variable(s) — check your .env`);
    process.exit(1);
  }
}

// ── Concurrency Settings ──────────────────────────────────────
const IMAGE_GEN_CONCURRENCY = parseInt(
  process.env.IMAGE_GEN_CONCURRENCY ?? "3", // was 5 — Replicate rate-limits anyway
  10
);
const BRAND_CREATION_CONCURRENCY = 2; // was 3
const QUALITY_CHECK_CONCURRENCY = 2;  // was 3
const POSTER_CONCURRENCY = parseInt(
  process.env.POSTER_CONCURRENCY ?? "2",
  10
);

// ── Shared Worker Options ─────────────────────────────────────
// lockDuration: how long a job lock is held before BullMQ considers the worker stalled.
//   Default 30 s → lock renewed every 15 s per active concurrency slot.
//   120 s → renewed every 60 s → 4× fewer lock-renewal Redis commands.
// stalledInterval: how often to scan for stalled jobs.
//   Default 30 s → 60 s halves those scans.
// drainDelay: ms to wait after finding no jobs before re-polling.
//   Default 5 ms → 300 ms smooths out burst polling at the end of a job batch.
const SHARED_WORKER_OPTIONS = {
  lockDuration: 120_000,
  stalledInterval: 60_000,
  maxStalledCount: 2,
  drainDelay: 300,
} as const;

// ── Start Workers ─────────────────────────────────────────────
function startWorkers(): Worker[] {
  const imageGenerationWorker = new Worker(
    "image-generation",
    processImageGeneration,
    {
      connection: redis,
      concurrency: IMAGE_GEN_CONCURRENCY,
      ...SHARED_WORKER_OPTIONS,
    }
  );

  const brandCreationWorker = new Worker(
    "brand-creation",
    processBrandCreation,
    {
      connection: redis,
      concurrency: BRAND_CREATION_CONCURRENCY,
      ...SHARED_WORKER_OPTIONS,
    }
  );

  const qualityCheckWorker = new Worker(
    "quality-check",
    processQualityCheck,
    {
      connection: redis,
      concurrency: QUALITY_CHECK_CONCURRENCY,
      ...SHARED_WORKER_OPTIONS,
    }
  );

  const posterGenerationWorker = new Worker(
    "poster-generation",
    processPosterGeneration,
    {
      connection: redis,
      concurrency: POSTER_CONCURRENCY,
      ...SHARED_WORKER_OPTIONS,
    }
  );

  // ── Worker Event Handlers ─────────────────────────────────
  for (const worker of [
    imageGenerationWorker,
    brandCreationWorker,
    qualityCheckWorker,
    posterGenerationWorker,
  ]) {
    worker.on("completed", (job) => {
      logger.info("Job completed", { queue: worker.name, jobId: job.id });
    });

    worker.on("failed", (job, err) => {
      logger.error("Job failed", {
        queue: worker.name,
        jobId: job?.id,
        error: err.message,
        attempt: job?.attemptsMade,
      });
    });

    worker.on("error", (err) => {
      logger.error("Worker error", { queue: worker.name, error: err.message });
    });
  }

  logger.info("All workers started and listening for jobs", {
    queues: {
      "image-generation": { concurrency: IMAGE_GEN_CONCURRENCY },
      "brand-creation": { concurrency: BRAND_CREATION_CONCURRENCY },
      "quality-check": { concurrency: QUALITY_CHECK_CONCURRENCY },
      "poster-generation": { concurrency: POSTER_CONCURRENCY },
    },
  });

  return [imageGenerationWorker, brandCreationWorker, qualityCheckWorker, posterGenerationWorker];
}

// ── Bootstrap ─────────────────────────────────────────────────
validateEnv();
const workers = startWorkers();

// ── Graceful Shutdown ─────────────────────────────────────────
// Close workers first so in-flight jobs can finish (or checkpoint) before exit.
async function shutdown(signal: string) {
  logger.info(`${signal} received — closing workers`);
  await Promise.allSettled(workers.map((w) => w.close()));
  logger.info("All workers closed — exiting");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
