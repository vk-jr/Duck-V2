import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const brandCreationQueue = new Queue("brand-creation", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});
