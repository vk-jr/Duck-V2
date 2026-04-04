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
    } else {
      logger.info(`Env check: ${key} ✓`);
    }
  }

  if (missing.length > 0) {
    logger.error("Missing required environment variables", { missing });
    process.exit(1);
  }
}

// ── Concurrency Settings ──────────────────────────────────────
const IMAGE_GEN_CONCURRENCY = parseInt(
  process.env.IMAGE_GEN_CONCURRENCY ?? "5",
  10
);
const BRAND_CREATION_CONCURRENCY = 3;
const QUALITY_CHECK_CONCURRENCY = 3;
const POSTER_CONCURRENCY = parseInt(
  process.env.POSTER_CONCURRENCY ?? "2",
  10
);

// ── Start Workers ─────────────────────────────────────────────
function startWorkers(): void {
  const imageGenerationWorker = new Worker(
    "image-generation",
    processImageGeneration,
    {
      connection: redis,
      concurrency: IMAGE_GEN_CONCURRENCY,
    }
  );

  const brandCreationWorker = new Worker(
    "brand-creation",
    processBrandCreation,
    {
      connection: redis,
      concurrency: BRAND_CREATION_CONCURRENCY,
    }
  );

  const qualityCheckWorker = new Worker(
    "quality-check",
    processQualityCheck,
    {
      connection: redis,
      concurrency: QUALITY_CHECK_CONCURRENCY,
    }
  );

  const posterGenerationWorker = new Worker(
    "poster-generation",
    processPosterGeneration,
    {
      connection: redis,
      concurrency: POSTER_CONCURRENCY,
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
}

// ── Graceful Shutdown ─────────────────────────────────────────
process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received — shutting down gracefully");
  process.exit(0);
});

// ── Bootstrap ─────────────────────────────────────────────────
validateEnv();
startWorkers();
