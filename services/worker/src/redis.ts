import IORedis, { type RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("REDIS_URL is required for the worker process");
}

const bullOpts: RedisOptions = {
  // BullMQ requires null for blocking commands to work correctly.
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export function createConnection(): IORedis {
  return new IORedis(REDIS_URL!, bullOpts);
}
