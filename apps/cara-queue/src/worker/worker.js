import { connect, QUEUE } from "../lib/redis.js";

const redis = await connect();
console.log("worker waiting for jobs");

for (;;) {
  const next = await redis.brPop(QUEUE, 0);
  const id = next.element;
  await redis.hSet(`job:${id}`, { status: "running" });
  const text = await redis.hGet(`job:${id}`, "text");
  await new Promise((r) => setTimeout(r, 500));
  const result = [...(text ?? "")].reverse().join("").toUpperCase();
  await redis.hSet(`job:${id}`, { status: "done", result, doneAt: new Date().toISOString() });
  await redis.incr("jobs:done");
  console.log(`job ${id} done`);
}
