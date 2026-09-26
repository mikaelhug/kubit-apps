import http from "node:http";
import { randomUUID } from "node:crypto";
import { connect, QUEUE } from "../lib/redis.js";

const redis = await connect();

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://api");
    if (url.pathname === "/healthz") return send(res, 200, { ok: await redis.ping() === "PONG" });
    if (req.method === "POST" && url.pathname === "/api/jobs") {
      const { text = "" } = await readBody(req);
      const id = randomUUID();
      await redis.hSet(`job:${id}`, { status: "queued", text, createdAt: new Date().toISOString() });
      await redis.lPush(QUEUE, id);
      return send(res, 202, { id, status: "queued" });
    }
    const m = url.pathname.match(/^\/api\/jobs\/([0-9a-f-]+)$/);
    if (req.method === "GET" && m) {
      const job = await redis.hGetAll(`job:${m[1]}`);
      return Object.keys(job).length ? send(res, 200, { id: m[1], ...job }) : send(res, 404, { error: "no such job" });
    }
    if (req.method === "GET" && url.pathname === "/api/stats") {
      return send(res, 200, { queued: await redis.lLen(QUEUE), done: Number(await redis.get("jobs:done") ?? 0) });
    }
    send(res, 404, { error: "not found" });
  } catch (err) {
    send(res, 500, { error: err.message });
  }
}).listen(3000, () => console.log("api listening on :3000"));
