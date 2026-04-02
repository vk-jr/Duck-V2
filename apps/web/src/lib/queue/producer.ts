import { Queue } from "bullmq";
import Redis from "ioredis";
import type {
  ImageGenerationJobPayload,
  BrandCreationJobPayload,
  QualityCheckJobPayload,
  PosterGenerationJobPayload,
} from "@/types";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
    });
  }
  return redis;
}

function getQueue(name: string) {
  return new Queue(name, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });
}

export async function addImageGenerationJob(
  payload: ImageGenerationJobPayload
): Promise<string> {
  const queue = getQueue("image-generation");
  const job = await queue.add("generate", payload, {
    jobId: `img-gen-${payload.generatedImageId}`,
  });
  return job.id!;
}

export async function addBrandCreationJob(
  payload: BrandCreationJobPayload
): Promise<string> {
  const queue = getQueue("brand-creation");
  const job = await queue.add("create-brand", payload, {
    jobId: `brand-${payload.brandId}`,
  });
  return job.id!;
}

export async function addQualityCheckJob(
  payload: QualityCheckJobPayload
): Promise<string> {
  const queue = getQueue("quality-check");
  const job = await queue.add("quality-check", payload, {
    jobId: payload.qualityCheckId
      ? `qc-${payload.qualityCheckId}`
      : `qc-guidelines-${payload.brandId}-${Date.now()}`,
  });
  return job.id!;
}

export async function addPosterGenerationJob(
  payload: PosterGenerationJobPayload
): Promise<string> {
  const queue = getQueue("poster-generation");
  const job = await queue.add("generate-poster", payload, {
    jobId: `poster-${payload.posterId}`,
  });
  return job.id!;
}
