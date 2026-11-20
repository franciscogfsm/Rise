"""RISE HTTP server: dashboard, pitch, journey API, and the asset route the pitch loads through."""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import config as C
from .journey import Journey, StepError
from .link import Link

link = Link(C.LINK_PORT, C.SOURCE.endpoint) if C.SOURCE.simulated else None
J = Journey(link)
WEB = C.ROOT / "web"


@asynccontextmanager
async def lifespan(_app):
    J.loop = asyncio.get_running_loop()
    if link:
        await link.start()
    await asyncio.to_thread(J.boot)
    yield
    if link:
        await link.cut()


app = FastAPI(title="RISE", version="0.1.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=WEB), name="static")

ACTIONS = {
    "connect": J.connect, "discover": J.discover, "analyze": J.analyze, "challenge": J.challenge,
    "adapt": J.adapt, "verify": J.verify, "switch": J.switch_to_destination, "cut": J.cut_source,
    "restore": J.restore_source, "prove": J.prove_new_operation, "reset": J.reset,
}


@app.get("/")
def dashboard():
    return FileResponse(WEB / "index.html", headers={"Cache-Control": "no-store"})


@app.get("/pitch")
def pitch():
    return FileResponse(WEB / "pitch.html", headers={"Cache-Control": "no-store"})


@app.get("/api/state")
def state():
    return J.snapshot()


@app.get("/api/proof")
def proof():
    return J.proof()


@app.post("/api/{action}")
def act(action: str):  # sync on purpose: storage calls run in the threadpool, the event loop keeps the link alive
    if action not in ACTIONS:
        raise HTTPException(404, f"Unknown action {action!r}")
    try:
        return ACTIONS[action]()
    except StepError as e:
        raise HTTPException(409, str(e)) from e


@app.get("/api/events")
async def events(request: Request):
    async def stream():
        last = -1
        while not await request.is_disconnected():
            if J.version != last:
                last = J.version
                yield f"data: {last}\n\n"
            await asyncio.sleep(0.25)
    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-store"})


@app.get("/app/assets/{key:path}")
def asset(key: str, rid: str = ""):
    """asset-service's public route. The pitch fetches its visuals here with a unique rid (no cache)."""
    try:
        r = J.serve_asset(key, rid)
    except StepError as e:
        raise HTTPException(502, str(e)) from e
    return Response(r["body"], media_type=r["content_type"] or "application/octet-stream", headers={
        "Cache-Control": "no-store", "X-RISE-Provider": r["provider"], "X-RISE-Request-Id": r["request_id"] or "",
        "X-RISE-SHA256": r["sha256"]})
