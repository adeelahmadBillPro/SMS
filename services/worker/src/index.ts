import { Queue, Worker } from "bullmq";
import { createConnection } from "./redis.js";

/**
 * ShopOS background worker — P0 skeleton.
 *
 * Queues that will be added in later phases:
 *   - "forecasting"   (P1 Week 7): nightly demand + reorder suggestion
 *   - "fbr"           (P1 Week 7): async FBR invoice posting + retries
 *   - "wa-reminders"  (P2 Week 12): automated WhatsApp receipts/dues
 *   - "backup-check"  (P0): verifies the latest pg_dump is recent & non-empty
 *
 * For M4 we register a single "heartbeat" queue so the process has something
 * to wait on, plus a cron job that logs once per minute. This keeps the
 * container "healthy" in docker-compose and gives a clear signal in logs that
 * Redis connectivity is good.
 */

const HEARTBEAT_QUEUE = "heartbeat";

async function main() {
  const connection = createConnection();

  const heartbeatQueue = new Queue(HEARTBEAT_QUEUE, { connection });

  const worker = new Worker(
    HEARTBEAT_QUEUE,
    async (job) => {
      // eslint-disable-next-line no-console
      console.log(`[worker] heartbeat at ${new Date().toISOString()} (job=${job.id})`);
      return { ok: true };
    },
    { connection },
  );

  worker.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[worker] error", err);
  });

  // Schedule a heartbeat every 60 seconds. Upserted — safe to run repeatedly.
  await heartbeatQueue.upsertJobScheduler(
    "heartbeat-minute",
    { every: 60_000 },
    { name: "tick", data: {}, opts: { removeOnComplete: 20, removeOnFail: 20 } },
  );

  // eslint-disable-next-line no-console
  console.log(`[worker] up; listening on queue "${HEARTBEAT_QUEUE}"`);

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`[worker] ${signal} received, draining…`);
    await worker.close();
    await heartbeatQueue.close();
    await connection.quit();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[worker] fatal", err);
  process.exit(1);
});
