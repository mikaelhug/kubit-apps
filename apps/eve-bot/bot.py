import json
import os
import sys
import time
import urllib.request

TARGET = os.environ.get("CLOCK_URL", "http://ben-clock.ben-clock.svc/api/time")
EVERY = int(os.environ.get("EVERY_SECONDS", "30"))


def log(msg):
    print(time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), msg, flush=True)


token = os.environ.get("BOT_TOKEN", "")
if not token:
    log("BOT_TOKEN is missing; refusing to start")
    sys.exit(1)
log(f"eve-bot starting; token loaded ({len(token)} chars), checking {TARGET} every {EVERY}s")

while True:
    try:
        with urllib.request.urlopen(TARGET, timeout=5) as r:
            now = json.load(r)["now"]
        log(f"clock says {now}")
    except Exception as e:
        log(f"clock unreachable: {e}")
    time.sleep(EVERY)
