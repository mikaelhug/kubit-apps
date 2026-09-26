import http from "node:http";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("./index.html", import.meta.url));

http.createServer((req, res) => {
  if (req.url === "/healthz") return res.end("ok\n");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(page);
}).listen(8080, () => console.log("web listening on :8080"));
