import { createClient } from "redis";

export async function connect() {
  const client = createClient({
    url: process.env.REDIS_URL ?? "redis://redis:6379",
    password: process.env.REDIS_PASSWORD,
  });
  client.on("error", (err) => console.error("redis:", err.message));
  await client.connect();
  return client;
}

export const QUEUE = "jobs:queue";
