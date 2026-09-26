const page = (now: Date) => `<!doctype html>
<meta charset="utf-8">
<title>Ben's clock</title>
<body style="font-family: system-ui; display: grid; place-items: center; height: 100vh; margin: 0">
  <div style="text-align: center">
    <h2>${now.toDateString()}</h2>
    <h1 id="time">${now.toLocaleTimeString("en-GB", { timeZone: "Europe/Stockholm" })}</h1>
    <p>Stockholm time, served by Ben's Deno clock, now with the date.</p>
  </div>
  <script>
    setInterval(() => {
      document.getElementById("time").textContent = new Date().toLocaleTimeString("en-GB", { timeZone: "Europe/Stockholm" });
    }, 1000);
  </script>
</body>`;

Deno.serve({ port: 8000 }, (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/healthz") return new Response("ok\n");
  if (url.pathname === "/api/time") return Response.json({ now: new Date().toISOString() });
  return new Response(page(new Date()), { headers: { "content-type": "text/html; charset=utf-8" } });
});
