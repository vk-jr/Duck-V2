import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const posterGenerationQueue = new Queue("poster-generation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000, // 1s, 5s, 30s
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});
