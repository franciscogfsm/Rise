"""RISE HTTP server.

/            product: analyze any public GitHub repository and verify its storage portability
/demo        live switch: the journey on asset-service, with real traffic, switch and source cut
/connect     connections: the two providers RISE is connected to, with a real connection test
/pitch       pitch visuals loaded through asset-service
"""
import asyncio
import base64
import os
import secrets
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config as C
from . import agent, connect, docs, fast, replay
from .analysis import Analyses
from .journey import Journey, StepError
from .link import Link
from .repo import RepoError, local as repo_local

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
    await asyncio.to_thread(fast.warm)  # start the scan workers now, not during the first analysis
    yield
    J.traffic_on = False
    if link:
        await link.cut()


app = FastAPI(title="RISE", version="0.2.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=WEB), name="static")
NO_STORE = {"Cache-Control": "no-store"}


PASSWORD = os.environ.get("RISE_PASSWORD", "")  # set it before exposing RISE beyond localhost


@app.middleware("http")
async def require_password(request, call_next):
    if PASSWORD and request.url.path != "/healthz":  # health checks carry no password; /healthz reveals nothing
        try:
            given = base64.b64decode(request.headers.get("authorization", "")[6:]).decode().partition(":")[2]
        except Exception:
            given = ""
        if not secrets.compare_digest(given.encode(), PASSWORD.encode()):
            return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="RISE"'})
    return await call_next(request)


@app.middleware("http")
async def revalidate_static(request, call_next):
    # no-cache = browser revalidates (ETag), so UI edits show on a normal reload
    r = await call_next(request)
    if request.url.path.startswith("/static/"):
        r.headers["Cache-Control"] = "no-cache"
    return r


@app.get("/")
@app.get("/demo")
@app.get("/connect")
@app.get("/replay")
@app.get("/a/{aid}")
@app.get("/c/{aid}")
def spa(aid: str | None = None):
    return FileResponse(WEB / "index.html", headers=NO_STORE)


@app.get("/pitch")
def pitch():
    return FileResponse(WEB / "pitch.html", headers=NO_STORE)


# ---------- product: repository analyses ----------
class AnalyzeIn(BaseModel):
    url: str
    reference: str = "source"
    target: str = "destination"
    targets: list[str] | None = None  # several targets = a comparison
    token: str | None = None  # GitHub token for a private repo: used for the download only
    goal: str = ""
    files: dict[str, str] | None = None  # a local folder sent by the MCP client (rise/mcp.py) instead of a GitHub URL
    name: str = ""


@app.post("/api/analyses")
def analyze(body: AnalyzeIn):
    targets = list(dict.fromkeys(body.targets or [body.target]))[:4]
    doc_keys = {t: t.removeprefix("docs:") for t in targets if t.startswith("docs:")}  # not connected: read its docs only
    if any(k not in docs.PROVIDERS for k in doc_keys.values()):
        raise HTTPException(422, "RISE has no documentation source for that provider.")
    ref_p, tgt_ps = connect.provider(body.reference), [None if t in doc_keys else connect.provider(t) for t in targets]
    if not ref_p or not all(p or t in doc_keys for p, t in zip(tgt_ps, targets)):
        raise HTTPException(422, "Unknown connection. Pick a reference and a target from Connections.")
    if body.reference in targets:
        raise HTTPException(422, "The reference cannot also be a target. Pick two different connections.")
    goal = agent.redact(body.goal.strip())[:300]  # the goal goes to the AI: strip anything key-like
    group = uuid.uuid4().hex[:10] if len(tgt_ps) > 1 else None
    try:
        local = repo_local(body.files, body.name) if body.files is not None else None
        started = [A.start(body.url, ref_p, p, body.token, goal, group, local, doc_keys.get(t)) for p, t in zip(tgt_ps, targets)]
    except RepoError as e:
        raise HTTPException(422, str(e)) from e
    return started[0] | {"compare": group, "ids": [a["id"] for a in started]}


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


@app.get("/healthz")
def healthz():
    return "ok"


@app.get("/api/system")
def system():
    return {"providers": [C.SOURCE.describe(), C.DEST.describe()], "health": J.health,
            "ai": {"configured": bool(C.OPENROUTER_KEY), "model": C.OPENROUTER_MODEL}}


# ---------- connections ----------
@app.get("/api/connections")
def connections():
    return connect.overview()


@app.post("/api/connections")
async def connection_add(request: Request):  # keys arrive once, are stored server-side, and are never returned
    try:
        body = await request.json()
    except ValueError:  # includes bodies that are not UTF-8
        raise HTTPException(422, "Expected a JSON object (UTF-8)") from None
    if not isinstance(body, dict):
        raise HTTPException(422, "Expected a JSON object")
    try:
        return connect.add(body)
    except connect.ConnError as e:
        raise HTTPException(422, str(e)) from e


@app.delete("/api/connections/{cid}")
def connection_remove(cid: str):
    try:
        if not connect.remove(cid):
            raise HTTPException(404, f"Unknown connection {cid!r}")
    except connect.ConnError as e:
        raise HTTPException(409, str(e)) from e
    return {"removed": cid}


@app.post("/api/connections/{cid}/test")
def connection_test(cid: str):  # real S3 calls against the configured provider
    if not connect.provider(cid):
        raise HTTPException(404, f"Unknown connection {cid!r}")
    return connect.test(cid)


class IntentIn(BaseModel):
    text: str


@app.post("/api/intent")
def intent(body: IntentIn):  # one-box request -> repository, from, to, goal (never the token)
    return agent.intent(body.text[:2000])


# ---------- agent ----------
# ---------- migration replay: the app's recorded call sequence, re-run on candidate providers ----------
class ReplayIn(BaseModel):
    trace: dict
    providers: list[str]


@app.get("/api/replay/trace")
def replay_trace():
    t = replay.RECORDER.trace()
    if not t["steps"]:
        raise HTTPException(404, "asset-service has not run yet: open Live switch and run Discover to record it.")
    return t


@app.post("/api/replay")
def replay_run(body: ReplayIn):
    if not body.providers or any(not connect.provider(c) for c in body.providers):
        raise HTTPException(422, "Pick connected providers to replay on.")
    try:
        return replay.run(body.trace, body.providers)
    except ValueError as e:
        raise HTTPException(422, str(e)) from e


class AgentIn(BaseModel):
    messages: list[dict]
    page: str = "/"


@app.post("/api/agent")
def agent_ask(body: AgentIn):
    try:
        return agent.ask(body.messages, body.page, A)
    except Exception as e:  # noqa: BLE001 — the agent is optional; every page works without it
        raise HTTPException(503, f"The RISE agent needs the AI (OpenRouter), which did not answer: {type(e).__name__}: {str(e)[:160]}") from e


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
