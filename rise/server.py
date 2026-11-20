"""RISE HTTP server.

/            product: analyze any public GitHub repository and verify its storage portability
/demo        live switch: the journey on asset-service, with real traffic, switch and source cut
/pitch       pitch visuals loaded through asset-service
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config as C
from .analysis import Analyses
from .journey import Journey, StepError
from .link import Link
from .repo import RepoError

link = Link(C.LINK_PORT, C.SOURCE.endpoint) if C.SOURCE.simulated else None
J = Journey(link)
A = Analyses()
WEB = C.ROOT / "web"


@asynccontextmanager
async def lifespan(_app):
    J.loop = asyncio.get_running_loop()
    if link:
        await link.start()
    await asyncio.to_thread(J.boot)
    yield
    J.traffic_on = False
    if link:
        await link.cut()


app = FastAPI(title="RISE", version="0.2.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=WEB), name="static")
NO_STORE = {"Cache-Control": "no-store"}


@app.get("/")
@app.get("/demo")
@app.get("/a/{aid}")
def spa(aid: str | None = None):
    return FileResponse(WEB / "index.html", headers=NO_STORE)


@app.get("/pitch")
def pitch():
    return FileResponse(WEB / "pitch.html", headers=NO_STORE)


# ---------- product: repository analyses ----------
class AnalyzeIn(BaseModel):
    url: str


@app.post("/api/analyses")
def analyze(body: AnalyzeIn):
    try:
        return A.start(body.url)
    except RepoError as e:
        raise HTTPException(422, str(e)) from e


@app.get("/api/analyses")
def analyses():
    return A.list()


@app.get("/api/analyses/{aid}")
def analysis(aid: str):
    a = A.get(aid)
    if not a:
        raise HTTPException(404, "Analysis not found")
    return a


@app.get("/api/analyses/{aid}/proof")
def analysis_proof(aid: str):
    p = A.proof(aid)
    if not p:
        raise HTTPException(404, "Analysis not found")
    return p


@app.get("/api/system")
def system():
    return {"providers": [C.SOURCE.describe(), C.DEST.describe()], "health": J.health,
            "ai": {"configured": bool(C.OPENROUTER_KEY), "model": C.OPENROUTER_MODEL}}


# ---------- live switch demo ----------
DEMO = {
    "connect": J.connect, "discover": J.discover, "analyze": J.analyze, "challenge": J.challenge,
    "adapt": J.adapt, "verify": J.verify, "switch": J.switch_to_destination, "cut": J.cut_source,
    "restore": J.restore_source, "prove": J.prove_new_operation, "reset": J.reset,
    "traffic_on": J.traffic_start, "traffic_off": J.traffic_stop,
}


@app.get("/api/demo/state")
def demo_state():
    return J.snapshot()


@app.get("/api/demo/proof")
def demo_proof():
    return J.proof()


@app.post("/api/demo/{action}")
def demo_act(action: str):  # sync on purpose: storage calls run in the threadpool, the event loop keeps the link alive
    if action not in DEMO:
        raise HTTPException(404, f"Unknown action {action!r}")
    try:
        return DEMO[action]()
    except StepError as e:
        raise HTTPException(409, str(e)) from e


@app.get("/api/events")
async def events(request: Request):
    async def stream():
        last = None
        while not await request.is_disconnected():
            v = f"{J.version}.{A.version}"
            if v != last:
                last = v
                yield f"data: {v}\n\n"
            await asyncio.sleep(0.25)
    return StreamingResponse(stream(), media_type="text/event-stream", headers=NO_STORE)


@app.get("/app/assets/{key:path}")
def asset(key: str, rid: str = ""):
    """asset-service's public route. The pitch fetches its visuals here with a unique rid (no cache)."""
    try:
        r = J.serve_asset(key, rid)
    except StepError as e:
        raise HTTPException(502, str(e)) from e
    return Response(r["body"], media_type=r["content_type"] or "application/octet-stream", headers={
        **NO_STORE, "X-RISE-Provider": r["provider"], "X-RISE-Request-Id": r["request_id"] or "",
        "X-RISE-SHA256": r["sha256"]})
