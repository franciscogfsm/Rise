// RISE web app — React 18 + htm (vendored, no build step).
//   /          analyze any public GitHub repository (the product)
//   /a/:id     one analysis: evidence from the code, AI test plan, real results on the target provider
//   /demo      live switch of asset-service with real traffic, switch and source cut
// Every number on screen comes from the backend; nothing is animated on a timer.
const { useState, useEffect, useCallback, useRef, Fragment } = React;
const html = htm.bind(React.createElement);

const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "—");
const clock = (ts) => (ts ? ts.slice(11, 19) : "");

async function api(path, method = "GET", body) {
  const r = await fetch(path, { method, cache: "no-store", headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : `${r.status} ${r.statusText}`);
  return data;
}

// ---------- shared hooks & atoms ----------
function useRoute() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => { const f = () => setPath(location.pathname); addEventListener("popstate", f); return () => removeEventListener("popstate", f); }, []);
  const go = useCallback((p) => { if (p !== location.pathname) history.pushState({}, "", p); setPath(p); }, []);
  return [path, go];
}

function useTick() {  // bumps whenever the backend state changes (SSE)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const es = new EventSource("/api/events");
    let t;
    es.onmessage = () => { clearTimeout(t); t = setTimeout(() => setTick((x) => x + 1), 60); };
    return () => es.close();
  }, []);
  return tick;
}

const Pill = ({ cls, children }) => html`<span className=${`pill ${cls}`}>${children}</span>`;
const Dot = ({ cls }) => html`<span className=${`sdot ${cls}`}></span>`;
const Empty = ({ children }) => html`<p className="empty">${children}</p>`;
const Link = ({ to, go, className, children }) => html`<a href=${to} className=${className} onClick=${(e) => { e.preventDefault(); go(to); }}>${children}</a>`;

function Ring({ value, total, color }) {
  const r = 26, c = 2 * Math.PI * r, f = total ? value / total : 0;
  return html`<svg className="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r=${r} className="ring-bg" />
    <circle cx="32" cy="32" r=${r} className="ring-fg" style=${color ? { stroke: color } : null} strokeDasharray=${c} strokeDashoffset=${c * (1 - f)} /></svg>`;
}

function SourceBadge({ src }) {
  if (!src) return null;
  const text = src.mode === "live" ? `AI LIVE · ${src.model} · ${(src.ms / 1000).toFixed(1)} s`
    : src.mode === "cached" ? `CACHED AI RESULT · ${src.at}` : "RULE-BASED FALLBACK";
  return html`<span className=${`src-badge ${src.mode}`} title=${src.live_error || ""}>${text}</span>`;
}

const ICON = {
  scan: html`<svg viewBox="0 0 24 24"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10"/></svg>`,
  live: html`<svg viewBox="0 0 24 24"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>`,
  proof: html`<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 14l2 2 4-4"/></svg>`,
};

function Sidebar({ path, go, system, recent, children }) {
  const P = system?.providers || [];
  const H = system?.health || {};
  return html`<aside className="side glass" aria-label="Navigation">
    <div className="brand"><img src="/static/brand/rise-icon.svg" alt="" />
      <div><div className="wm">RISE</div><div className="tag">Proof of Cloud Freedom</div></div></div>
    <nav className="nav">
      <${Link} to="/" go=${go} className=${path === "/" || path.startsWith("/a/") ? "on" : ""}>${ICON.scan}Analyze a repository<//>
      <${Link} to="/demo" go=${go} className=${path === "/demo" ? "on" : ""}>${ICON.live}Live switch<span className="badge">LIVE</span><//>
    </nav>
    ${children}
    ${recent && html`<${Fragment}>
      <div className="side-h">Recent analyses</div>
      <div className="recent">${recent.length ? recent.map((a) => {
        const pct = a.score?.percent;
        const cls = pct == null ? "" : pct >= 90 ? "score-ok" : pct >= 60 ? "score-mid" : "score-bad";
        return html`<${Link} key=${a.id} to=${`/a/${a.id}`} go=${go} className=${path === `/a/${a.id}` ? "on" : ""}>
          <span className="rn">${a.repo.owner}/${a.repo.name}</span>
          <span className=${`rs ${cls}`}>${a.status === "done" ? (pct == null ? "—" : `${pct}%`) : a.status === "error" ? "!" : "…"}</span>
          <span className="ro">${a.status === "done" ? `${a.score?.verified ?? 0}/${a.score?.total ?? 0} verified · ${clock(a.created)}` : a.status}</span><//>`;
      }) : html`<${Empty}>No analyses yet.<//>`}</div><//>`}
    <div className="sys">
      ${P.map((p, i) => html`<div key=${p.id} className="sys-row"><${Dot} cls=${H[p.id]?.ok ? "ok" : H[p.id] ? "bad" : "idle"} />
        <span>${i === 0 ? "Reference" : "Target"} · ${p.name}</span><b>${p.simulated ? "sim" : "real"}</b></div>`)}
      <div className="sys-row"><${Dot} cls=${system?.ai?.configured ? "live" : "warn"} /><span>AI</span><b>${system?.ai?.configured ? "ready" : "no key"}</b></div>
      <div className="sys-meta">${system?.ai?.model || ""}${P.map((p) => html`<${Fragment} key=${p.id}><br />${p.name} · ${p.documented_region}<//>`)}</div>
    </div>
  </aside>`;
}

// =====================================================================================
// PRODUCT
// =====================================================================================
const EXAMPLES = [
  ["CandyShare · Next.js", "https://github.com/Anonymous961/CandyShare"],
  ["assetstorageservice · Python", "https://github.com/priteshgudge/assetstorageservice"],
  ["s3PresignedUrl_v3 · TypeScript", "https://github.com/ucapistranmtz/s3PresignedUrl_v3"],
];
const ITEM = {
  PutObject: "Upload objects", GetObject: "Download objects", HeadObject: "Read object metadata", ListObjectsV2: "List objects",
  DeleteObject: "Delete objects", GeneratePresignedUrl: "Presigned URLs", PresignedGet: "Presigned downloads", CopyObject: "Server-side copy",
  MultipartUpload: "Multipart upload", "user-metadata": "Custom metadata", "content-type": "Content types", "range-read": "Range reads",
  "prefix-list": "Prefix listing", "hierarchical-keys": "Folder-style keys", "unicode-key": "Non-ASCII keys", "object-tagging": "Object tags",
  "server-side-encryption": "Server-side encryption", "storage-class": "Storage classes", acl: "Access control lists", versioning: "Versioning",
  lifecycle: "Lifecycle rules", "bucket-policy": "Bucket policies", "event-notifications": "Event notifications", "cache-control": "Cache-Control",
};
const VERDICT = { pass: ["ok", "verified"], fail: ["bad", "fails"], unsupported: ["warn", "unsupported"], untested: ["idle", "not tested"] };
const STAGES = [["fetch", "Fetch"], ["scan", "Scan code"], ["plan", "AI plan"], ["test", "Real tests"], ["adapt", "Adapt"], ["report", "Report"]];

function Home({ go, toast }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (u) => {
    setBusy(true);
    try { const a = await api("/api/analyses", "POST", { url: u }); go(`/a/${a.id}`); }
    catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  return html`<div className="home"><div className="hero">
    <div className="eyebrow">Cloud portability verification · object storage</div>
    <h1>Can your code leave its cloud?<br />Prove it before you move.</h1>
    <p>Paste a public GitHub repository. RISE reads the code, finds every object-storage behaviour it depends on, has AI turn that into tests, and runs them for real on the target provider.</p>
    <form className="ask glass" onSubmit=${(e) => { e.preventDefault(); submit(url); }}>
      <input value=${url} onInput=${(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repository" aria-label="GitHub repository URL" autoFocus />
      <button className="btn" type="submit" disabled=${busy || !url.trim()}>${busy ? "Starting…" : "Analyze →"}</button>
    </form>
    <div className="examples"><span>try</span>${EXAMPLES.map(([l, u]) => html`<button key=${u} type="button" onClick=${() => { setUrl(u); submit(u); }}>${l}</button>`)}</div>
    <div className="how">${[
      ["01 · scan", "Evidence from code", "Every S3 call, setting and other cloud service, with file and line."],
      ["02 · ai", "Test plan by AI", "OpenRouter LLM writes a structured plan; RISE validates it before anything runs."],
      ["03 · verify", "Real tests, two providers", "Synthetic data, SHA-256 on real bytes, on the reference and on the target."],
      ["04 · prove", "Portability proof", "Score, failures, one safe config fix, and what was not tested."],
    ].map(([n, t, d]) => html`<div key=${n} className="glass"><span className="eyebrow">${n}</span><b>${t}</b><span className="d">${d}</span></div>`)}</div>
  </div></div>`;
}

function blobUrl(a, file, line) {
  const base = a.url.split("/tree/")[0];
  const ref = a.repo.ref !== "HEAD" ? a.repo.ref : /^[0-9a-f]{40}$/.test(a.repo.commit || "") ? a.repo.commit : "HEAD";
  return `${base}/blob/${ref}/${file.split("/").map(encodeURIComponent).join("/")}#L${line}`;
}

function TestRow({ t, r, x }) {
  const failed = [...(x?.checks || []), ...(r?.checks || [])].filter((c) => !c.ok);
  const bad = x && x.status !== "pass";
  const Res = ({ v }) => v ? html`<span className=${`res ${v.status}`}>${v.status.toUpperCase()}</span>` : html`<span className="res untested">—</span>`;
  return html`<div className=${`trow ${bad ? "bad" : ""}`}>
    <div className="tt"><b>${t.title}</b><div className="k">${t.id} · ${t.kind} · ${t.origin}</div></div>
    <${Res} v=${r} /><${Res} v=${x} />
    ${(t.rationale || bad) && html`<div className="tc">
      ${t.rationale && html`<div className="why">${t.rationale}</div>`}
      ${bad && x.error && html`<div className="err">${x.error.code}${x.error.status ? ` · HTTP ${x.error.status}` : ""} · ${x.error.message}</div>`}
      ${bad && (x.checks || []).filter((c) => !c.ok).map((c, i) => html`<div key=${i} className="err">${c.name}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}</div>`)}
    </div>`}
  </div>`;
}

function Analysis({ id, tick, go }) {
  const [a, setA] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => { api(`/api/analyses/${id}`).then(setA, (e) => setErr(e.message)); }, [id, tick]);
  if (err) return html`<div className="home"><${Empty}>${err}<//></div>`;
  if (!a) return html`<div className="home"><${Empty}>Loading…<//></div>`;
  const s = a.score, plan = a.plan, R = a.results;
  const ref = Object.fromEntries((R?.reference || []).map((r) => [r.test_id, r]));
  const tgt = Object.fromEntries((R?.target || []).map((r) => [r.test_id, r]));
  const ev = a.scan?.evidence || [];
  const items = Object.keys(a.verdict || {}).length ? Object.keys(a.verdict) : (a.profile?.items || []);
  const last = a.events?.[a.events.length - 1];
  const pctColor = s?.percent == null ? null : s.percent >= 90 ? "var(--ok)" : s.percent >= 60 ? "var(--warn)" : "var(--bad)";
  const P = a.providers || [];
  return html`<${Fragment}>
    <header className="head">
      <div>
        <div className="eyebrow">Analysis ${a.id} · ${a.repo.files ? `${a.repo.files} files` : ""} ${a.repo.commit ? `· ${a.repo.commit.slice(0, 8)}` : ""}</div>
        <h1><a className="ext" style=${{ color: "inherit" }} href=${a.url} target="_blank" rel="noopener">${a.repo.owner}/${a.repo.name}</a></h1>
        <div className="sub">${a.status === "error" ? html`<span style=${{ color: "var(--bad)" }}>${a.error}</span>` : last ? last.msg : "Queued"}</div>
      </div>
      <div className="actions">
        ${a.status === "done" && html`<a className="btn ghost sm" href=${`/api/analyses/${a.id}/proof`} target="_blank" rel="noopener">Portability proof (JSON)</a>`}
        <button className="btn sm" type="button" onClick=${() => go("/")}>New analysis</button>
      </div>
    </header>

    <div className="track">${STAGES.map(([k, l]) => {
      const st = a.stages[k];
      const msg = [...(a.events || [])].reverse().find((e) => e.stage === k)?.msg;
      return html`<div key=${k} className=${`tstage ${st}`}><span className="tn">${l}</span><span className="tm">${msg || (st === "todo" ? "waiting" : st)}</span></div>`;
    })}</div>

    <div className="cols">
      <div className="stack">
        <section className="card glass">
          <div className="card-h"><h2>Portability</h2><span className="grow"></span>${a.status === "running" && html`<${Pill} cls="run">running<//>`}</div>
          <div className="score">
            <div className="ring-wrap"><${Ring} value=${s?.verified || 0} total=${s?.total || 1} color=${pctColor} />
              <span className="ring-n">${s?.percent == null ? "—" : `${s.percent}%`}</span></div>
            <div className="tally">
              <div><b>${s ? `${s.verified}/${s.total}` : "—"}</b>verified on target</div>
              <div><b className=${s?.failed ? "bad-t" : ""}>${s?.failed ?? "—"}</b>fail</div>
              <div><b>${s?.unsupported ?? "—"}</b>unsupported</div>
              <div><b>${s?.untested ?? "—"}</b>not tested</div>
            </div>
          </div>
          <div className="why">${P.length ? html`Reference <b>${P[0].name}</b> vs target <b>${P[1].name}</b>${P.some((p) => p.simulated) ? " (simulated providers)" : ""}. Code signs requests for region <b>${a.code_region?.value || "—"}</b>.` : ""}</div>
        </section>
        <section className="card glass" style=${{ flex: 1 }}>
          <div className="card-h"><h2>Other cloud lock-in</h2><span className="grow"></span><span className="chip">${(a.lockin || []).length} services</span></div>
          <div className="card-b">${(a.lockin || []).length ? a.lockin.map((l) => html`<div key=${l.service} className="item">
              <div className="item-h"><b>${l.service}</b><span className="grow"></span><span className="res untested">NOT TESTED</span></div>
              ${l.evidence.slice(0, 2).map((e, i) => html`<div key=${i} className="ev-line"><a href=${blobUrl(a, e.file, e.line)} target="_blank" rel="noopener">${e.file}:${e.line}</a><code>${e.code}</code></div>`)}
            </div>`) : html`<${Empty}>${a.scan ? "No other cloud services found in the code." : "Waiting for the scan…"}<//>`}</div>
        </section>
      </div>

      <section className="card glass">
        <div className="card-h"><h2>Found in your code</h2><span className="grow"></span>
          ${a.scan && html`<span className="chip">${Object.values(a.scan.operations).reduce((x, y) => x + y, 0)} S3 call sites · ${a.scan.s3_files.length} files</span>`}</div>
        <div className="card-b">${items.length ? items.map((it) => {
          const v = a.verdict?.[it];
          const lines = ev.filter((e) => e.item === it).slice(0, 3);
          return html`<div key=${it} className="item">
            <div className="item-h"><b>${ITEM[it] || it}</b><span className="k">${it}</span><span className="grow"></span>
              ${v ? html`<${Pill} cls=${VERDICT[v][0]}>${VERDICT[v][1]}<//>` : html`<${Pill} cls="idle">pending<//>`}</div>
            ${lines.map((e, i) => html`<div key=${i} className="ev-line"><a href=${blobUrl(a, e.file, e.line)} target="_blank" rel="noopener">${e.file}:${e.line}</a><code>${e.code}</code></div>`)}
          </div>`;
        }) : html`<${Empty}>${a.scan ? "No object-storage usage found in this repository." : "Scanning…"}<//>`}</div>
      </section>

      <section className="card glass">
        <div className="card-h"><h2>Tests</h2><span className="grow"></span><${SourceBadge} src=${plan?.source} /></div>
        <div className="card-b">
          ${plan?.summary && html`<p className="summary" style=${{ marginBottom: 10 }}>${plan.summary}</p>`}
          ${(plan?.validator || []).map((n, i) => html`<div key=${i} className="note">validator · ${n}</div>`)}
          ${a.adaptation && html`<div className="adapt">
            <div className="card-h"><b>Adaptation</b><span className="grow"></span><${SourceBadge} src=${a.adaptation.proposal.source} /></div>
            <div className="why">${a.adaptation.proposal.diagnosis}</div>
            ${a.adaptation.applied && html`<div className="diff"><span className="minus">−</span><span className="minus">${a.adaptation.proposal.key} = ${a.adaptation.before[a.adaptation.proposal.key]}</span>
              <span className="plus">+</span><span className="plus">${a.adaptation.proposal.key} = ${a.adaptation.proposal.value}</span></div>
              <div><${Pill} cls=${a.adaptation.retest.passed === a.adaptation.retest.total ? "ok" : "bad"}>retest ${a.adaptation.retest.passed}/${a.adaptation.retest.total}<//></div>`}
          </div>`}
          ${plan ? html`<div className="colh"><span>test</span><span>reference</span><span>target</span></div>
            ${plan.tests.map((t) => html`<${TestRow} key=${t.id} t=${t} r=${ref[t.id]} x=${tgt[t.id]} />`)}`
            : html`<${Empty}>${a.stages.plan === "skipped" ? "No storage behaviour to test." : "The AI test plan appears here."}<//>`}
        </div>
      </section>
    </div>
  <//>`;
}

// =====================================================================================
// LIVE SWITCH DEMO
// =====================================================================================
const JSTEPS = [["connect", "Connect"], ["discover", "Discover"], ["analyze", "Analyze"], ["challenge", "Challenge"],
  ["adapt", "Adapt"], ["verify", "Verify"], ["switch", "Switch & cut"], ["prove", "Prove"]];
const SEQUENCE = [
  ["discover", (s) => s.steps.discover === "done"], ["analyze", (s) => s.steps.analyze === "done"],
  ["challenge", (s) => ["done", "attention"].includes(s.steps.challenge)], ["adapt", (s) => ["done", "skipped"].includes(s.steps.adapt)],
  ["verify", (s) => s.steps.verify === "done"], ["switch", (s) => s.steps.switch === "done"], ["cut", (s) => !!s.cut],
  ["prove", (s) => s.steps.prove === "done"],
];
const LABEL = { discover: "Observe the app", analyze: "Generate tests with AI", challenge: "Run the challenge", adapt: "Adapt & retest",
  verify: "Copy & verify data", switch: "Switch to destination", cut: "Cut the source", prove: "Prove a new operation" };
const STEP_OF = { cut: "switch" };

function stepDetail(k, S) {
  const pl = S.plan, R = S.results, a = S.adaptation, m = S.migration, pass = (pid) => R[pid].filter((r) => r.status === "pass").length;
  switch (k) {
    case "connect": return S.health ? `${["source", "destination"].filter((p) => S.health[p]?.ok).length}/2 providers reachable` : "checking…";
    case "discover": return S.profile.observed_calls ? `${S.profile.observed_calls} real calls · ${Object.keys(S.profile.operations).length} ops` : "observe the app";
    case "analyze": return pl ? `${pl.tests.length} tests · ${pl.source.mode === "live" ? `AI ${(pl.source.ms / 1000).toFixed(1)} s` : pl.source.mode}` : "AI writes the tests";
    case "challenge": return R ? `target ${pass("destination")}/${R.destination.length} · source ${pass("source")}/${R.source.length}` : "both providers";
    case "adapt": return S.steps.adapt === "skipped" ? "not needed" : a?.applied ? `${a.proposal.key} → ${a.proposal.value}` : a ? "no safe change" : "fix what fails";
    case "verify": return m ? `${m.objects.filter((o) => o.match).length}/${m.objects.length} SHA-256 match` : "copy & hash data";
    case "switch": return S.active === "destination" ? (S.link_up === false ? "on destination · source cut" : "on destination") : "route: source";
    case "prove": return S.live ? `new object on ${S.live.provider} ${S.live.match ? "✓" : "✗"}` : "freedom proof";
    default: return "";
  }
}

function JourneyNav({ S, next, view, setView }) {
  const done = JSTEPS.filter(([k]) => ["done", "skipped"].includes(S.steps[k])).length;
  const nextKey = STEP_OF[next] || next;
  return html`<${Fragment}>
    <div className="progress">
      <div className="ring-wrap"><${Ring} value=${done} total=${JSTEPS.length} /><span className="ring-n">${done}<small>/${JSTEPS.length}</small></span></div>
      <div><div className="p-title">${done === JSTEPS.length ? "Freedom proven" : `${done} of ${JSTEPS.length} verified`}</div>
        <div className="p-sub">${next ? `Next · ${LABEL[next]}` : "Every step backed by evidence"}</div></div>
    </div>
    <ol className="steps">${JSTEPS.map(([k, l], i) => {
      const st = S.steps[k];
      const state = ["done", "skipped"].includes(st) ? "done" : ["attention", "fail"].includes(st) ? "bad" : st === "running" ? "running" : k === nextKey ? "next" : "todo";
      return html`<li key=${k} className=${`step s-${state} ${view === k ? "sel" : ""}`}><button type="button" onClick=${() => setView(k)}>
        <span className="bubble">${state === "done" ? "✓" : state === "bad" ? "!" : String(i + 1).padStart(2, "0")}</span>
        <span className="st-body"><span className="st-title">${l}</span><span className="st-detail">${stepDetail(k, S)}</span></span></button></li>`;
    })}</ol>
  <//>`;
}

function Providers({ S }) {
  const cut = S.link_up === false;
  const card = (p) => {
    const h = S.health?.[p.id], cfg = S.app_config[p.id], isSrc = p.id === "source", dim = isSrc && cut, active = S.active === p.id;
    let st = h?.ok ? ["ok", "Online"] : h ? ["bad", "Unreachable"] : ["idle", "Unknown"];
    if (dim) st = ["bad", "Disconnected"]; else if (active) st = ["live", "Serving the app"]; else if (!isSrc) st = S.migration?.ok ? ["ok", "Verified"] : ["idle", "Standby"];
    return html`<div className=${`prov glass ${dim ? "dim" : ""} ${active ? "active" : ""}`}>
      <div className="top"><span className="eyebrow">${isSrc ? "Source" : "Destination"}</span>${p.simulated && html`<span className="sim">simulated</span>`}<span className="grow"></span><${Pill} cls=${st[0]}>${st[1]}<//></div>
      <div className="name">${p.name}</div>
      <div className="meta">${isSrc ? p.app_endpoint : p.endpoint} · region <b>${p.documented_region}</b> · app signs <b>${cfg.region}</b></div>
    </div>`;
  };
  return html`<section className="providers">${card(S.providers[0])}
    <div className=${`route ${cut ? "cut" : ""}`}><div className="wire"></div><div className="lbl">${cut ? "source cut" : S.active === "destination" ? "app → destination" : "app → source"}</div></div>
    ${card(S.providers[1])}</section>`;
}

function Traffic({ S, act }) {
  const T = S.traffic, pts = T.points;
  const at = (ts) => { const i = pts.findIndex((p) => p.ts >= ts); return i < 0 ? null : (i / Math.max(pts.length, 1)) * 100; };
  const marks = [];
  if (S.switch) marks.push(["switch", at(S.switch.at), "switch"]);
  if (S.cut) marks.push(["cut", at(S.cut.at), "source cut"]);
  if (S.cut?.restored_at) marks.push(["restore", at(S.cut.restored_at), "restored"]);
  const maxMs = Math.max(60, ...pts.map((p) => p.ms));
  return html`<section className="traffic glass">
    <div className="t-kpis">
      <div className="kpi"><div className="v">${T.total}</div><div className="l">real requests</div></div>
      <div className="kpi"><div className=${`v ${T.failed ? "bad-t" : ""}`}>${T.failed}</div><div className="l">failed</div></div>
      <div className="kpi"><div className=${`v ${S.switch && !T.failed_after_switch ? "ok-t" : ""}`}>${S.switch ? T.failed_after_switch : "—"}</div><div className="l">failed since switch</div></div>
      <div className="kpi"><div className="v">${T.p50_ms ?? "—"}<small>${T.p50_ms != null ? " ms" : ""}</small></div><div className="l">p50</div></div>
    </div>
    <div className="bars-box">
      <div className="bars">${pts.length ? pts.map((p, i) => html`<i key=${i} title=${`${p.ts.slice(11, 23)} · ${p.provider} · ${p.ok ? `${p.ms} ms` : p.error}`}
          className=${p.ok ? p.provider : "fail"} style=${{ height: p.ok ? `${18 + 82 * Math.min(1, p.ms / maxMs)}%` : "100%" }}></i>`)
        : html`<span className="empty">Real GETs every 300 ms through the app's storage router: grey = source, blue = destination, red = failed.</span>`}</div>
      ${marks.filter(([, x]) => x !== null).map(([k, x, l]) => html`<div key=${k} className=${`mark m-${k}`} style=${{ left: `${x}%` }}><span>${l}</span></div>`)}
    </div>
    <button className=${`btn sm ${T.on ? "ghost" : ""}`} type="button" onClick=${() => act(T.on ? "traffic_off" : "traffic_on")}>${T.on ? "Stop traffic" : "Start traffic"}</button>
  </section>`;
}

function ResCell({ r }) {
  if (!r) return html`<span className="res untested">UNTESTED</span>`;
  const failed = (r.checks || []).filter((c) => !c.ok), e = r.error;
  return html`<${Fragment}><span key=${r.status} className=${`res ${r.status} flash`}>${r.status.toUpperCase()}</span> <span className="muted mono">${r.ms} ms</span>
    ${e && html`<div className="err">${e.code}${e.status ? ` · HTTP ${e.status}` : ""} · ${e.message}</div>`}
    ${failed.map((c, i) => html`<div key=${i} className="err">${c.name}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}</div>`)}<//>`;
}

function StepView({ k, S }) {
  const p = S.profile, pl = S.plan, R = S.results, a = S.adaptation, m = S.migration;
  switch (k) {
    case "connect": return html`<dl className="kv">${S.providers.map((pr) => html`<${Fragment} key=${pr.id}><dt>${pr.id}</dt>
      <dd>${pr.name} · ${pr.endpoint} · ${S.health?.[pr.id]?.ok ? html`<span className="okc">reachable</span>` : html`<span className="badc">${S.health?.[pr.id]?.error?.message || "unknown"}</span>`}</dd><//>`)}
      <dt>link</dt><dd>${S.health?.link?.result}</dd><dt>AI</dt><dd>${S.ai.model} · ${S.ai.configured ? "key configured" : "no key"}</dd></dl>`;
    case "discover": {
      const ops = Object.entries(p.operations).sort((x, y) => y[1] - x[1]);
      return p.observed_calls ? html`<div className="split2"><table><thead><tr><th>Operation</th><th>Calls</th></tr></thead>
        <tbody>${ops.map(([o, n]) => html`<tr key=${o}><td className="mono">${o}</td><td className="mono">${n}</td></tr>`)}</tbody></table>
        <div style=${{ display: "grid", gap: 12, alignContent: "start" }}><div className="kpis"><div className="kpi"><div className="v">${p.observed_calls}</div><div className="l">real S3 calls captured</div></div>
          <div className="kpi"><div className="v">${Object.keys(p.features).length}</div><div className="l">behaviours</div></div></div>
          <div className="chips">${Object.keys(p.features).map((f) => html`<span key=${f} className="chip">${f}</span>`)}</div>
          <div className="muted mono">content types: ${p.content_types.join(", ") || "—"}<br />metadata keys: ${p.metadata_keys.join(", ") || "—"}</div></div></div>`
        : html`<${Empty}>RISE instruments asset-service's S3 SDK client and records every call it makes.<//>`;
    }
    case "analyze": return pl ? html`<p className="summary">${pl.summary}</p>${(pl.validator || []).map((n, i) => html`<div key=${i} className="note">validator · ${n}</div>`)}
      <div className="split2" style=${{ marginTop: 10 }}><div>${pl.tests.map((t) => html`<div key=${t.id} className="item"><div className="item-h"><b>${t.title}</b><span className="k">${t.kind}</span></div><div className="why">${t.rationale}</div></div>`)}</div>
      <div>${(pl.risks || []).map((r, i) => html`<div key=${i} className="item"><div className="item-h"><span className=${`res ${r.severity === "high" ? "fail" : "untested"}`}>${r.severity}</span><b>${r.title}</b></div><div className="why">${r.detail}</div></div>`)}</div></div>`
      : html`<${Empty}>The AI turns the observed profile into a structured plan from RISE's executable catalogue.<//>`;
    case "challenge": {
      if (!R) return html`<${Empty}>Every planned test runs on both providers with synthetic data.<//>`;
      const by = (pid) => Object.fromEntries(R[pid].map((r) => [r.test_id, r]));
      const src = by("source"), dst = by("destination");
      return html`<table><thead><tr><th>Test</th><th>Source</th><th>Destination</th></tr></thead><tbody>
        ${pl.tests.map((t) => html`<tr key=${t.id} className=${dst[t.id] && dst[t.id].status !== "pass" ? "bad" : ""}><td><b>${t.title}</b><div className="mono muted">${t.kind}</div></td>
          <td><${ResCell} r=${src[t.id]} /></td><td><${ResCell} r=${dst[t.id]} /></td></tr>`)}</tbody></table>`;
    }
    case "adapt": return a ? html`<div style=${{ display: "grid", gap: 10, maxWidth: 760 }}><div><${SourceBadge} src=${a.proposal.source} /></div><p className="summary">${a.proposal.diagnosis}</p>
      ${a.applied && html`<div className="diff"><span className="minus">−</span><span className="minus">${a.proposal.key} = ${a.before[a.proposal.key]}</span><span className="plus">+</span><span className="plus">${a.proposal.key} = ${a.proposal.value}</span></div>
        ${a.retest && html`<div><${Pill} cls=${a.retest.passed === a.retest.total ? "ok" : "bad"}>Retest ${a.retest.passed}/${a.retest.total} passed<//></div>`}`}</div>`
      : html`<${Empty}>${S.steps.adapt === "skipped" ? "No incompatibility found, so nothing to adapt." : "When a test fails, the AI proposes one allowed client-config change; RISE applies it to the destination only and retests everything."}<//>`;
    case "verify": return m ? html`<table><thead><tr><th>Object</th><th>Bytes</th><th>SHA-256 source → destination</th><th></th></tr></thead><tbody>
      ${m.objects.map((o) => html`<tr key=${o.key}><td className="mono">${o.key}</td><td className="mono">${o.size}</td><td className="mono">${short(o.sha256_source)} → ${short(o.sha256_destination)}</td>
        <td>${o.match && o.metadata_match ? html`<${Pill} cls="ok">match<//>` : html`<${Pill} cls="bad">mismatch<//>`}</td></tr>`)}</tbody></table>`
      : html`<${Empty}>RISE copies the app's objects, reads them back from the destination and compares SHA-256 of the bytes.<//>`;
    case "switch": case "prove": {
      const sw = S.switch, c = S.cut, l = S.live;
      return html`<div className="split2"><dl className="kv">
        <dt>app route</dt><dd>${S.active}${sw ? ` · since ${clock(sw.at)}` : ""}</dd>
        ${sw && html`<${Fragment}><dt>first read</dt><dd>${sw.probe.key} · ${sw.probe.provider} · req ${sw.probe.request_id}</dd><//>`}
        ${c && html`<${Fragment}><dt>source TCP</dt><dd className="badc">${c.tcp_probe.result}</dd><dt>app → source</dt><dd className="badc">${c.app_probe.result}</dd><//>`}
        ${l && html`<${Fragment}><dt>new object</dt><dd>${l.key}</dd><dt>served by</dt><dd className="okc">${l.provider} · put ${l.put_request_id} · get ${l.get_request_id}</dd>
          <dt>sha256</dt><dd className=${l.match ? "okc" : "badc"}>${short(l.sha256_written)} ${l.match ? "= written ✓" : "≠ written"}</dd><//>`}
      </dl><div><div className="eyebrow" style=${{ marginBottom: 6 }}>Events</div><div className="log">${S.events.slice(-10).reverse().map((e) => html`<div key=${e.seq} className=${`logrow ${e.kind}`}><span className="t">${clock(e.ts)}</span><span>${e.msg}</span></div>`)}</div></div></div>`;
    }
    default: return null;
  }
}

function Demo({ S, act, busy, view, setView }) {
  const next = SEQUENCE.find(([, done]) => !done(S))?.[0];
  const disabled = busy || S.busy;
  const k = view || STEP_OF[next] || next || "prove";
  const title = { connect: "Providers", discover: "Observed behaviour", analyze: "AI-generated test plan", challenge: "Same tests, both providers",
    adapt: "Constrained adaptation", verify: "Data copied & verified", switch: "Switch, cut, prove", prove: "Switch, cut, prove" }[k];
  return html`<${Fragment}>
    <header className="head">
      <div><div className="eyebrow">Live switch · workload asset-service · S3 object storage</div><h1>Switch providers under live traffic</h1></div>
      <div className="actions">
        <a className="btn ghost sm" href="/api/demo/proof" target="_blank" rel="noopener">Freedom proof</a>
        <button className="btn ghost sm" type="button" disabled=${disabled} onClick=${() => { setView(null); act("reset"); }}>Reset</button>
        <button className=${`btn ${next === "cut" ? "danger" : ""}`} type="button" disabled=${disabled || !next} onClick=${() => { setView(null); act(next); }}>
          ${disabled ? "Running…" : next ? `${LABEL[next]} →` : "Journey complete ✓"}</button>
      </div>
    </header>
    <${Providers} S=${S} />
    <${Traffic} S=${S} act=${act} />
    <section className="card glass stage">
      <div className="card-h"><span className="eyebrow">${k}</span><h2>${title}</h2><span className="grow"></span>
        ${k === "analyze" && html`<${SourceBadge} src=${S.plan?.source} />`}</div>
      <div className="card-b"><${StepView} k=${k} S=${S} /></div>
    </section>
  <//>`;
}

// =====================================================================================
function App() {
  const [path, go] = useRoute();
  const tick = useTick();
  const [system, setSystem] = useState(null);
  const [recent, setRecent] = useState([]);
  const [demo, setDemo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const [toastMsg, setToast] = useState(null);
  const toastTimer = useRef();
  const toast = useCallback((m) => { setToast(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 6000); }, []);

  useEffect(() => {
    api("/api/system").then(setSystem, () => {});
    api("/api/analyses").then(setRecent, () => {});
    if (path === "/demo") api("/api/demo/state").then(setDemo, (e) => toast(e.message));
  }, [tick, path, toast]);

  const act = useCallback(async (action) => {
    setBusy(true);
    try { setDemo(await api(`/api/demo/${action}`, "POST")); } catch (e) { toast(e.message); } finally { setBusy(false); }
  }, [toast]);

  let page;
  if (path === "/demo") page = demo ? html`<${Demo} S=${demo} act=${act} busy=${busy} view=${view} setView=${setView} />` : html`<${Empty}>Connecting…<//>`;
  else if (path.startsWith("/a/")) page = html`<${Analysis} id=${path.slice(3)} tick=${tick} go=${go} />`;
  else page = html`<${Home} go=${go} toast=${toast} />`;

  const next = demo && SEQUENCE.find(([, done]) => !done(demo))?.[0];
  return html`<${Fragment}>
    <div className="shell">
      <${Sidebar} path=${path} go=${go} system=${system} recent=${path === "/demo" ? null : recent}>
        ${path === "/demo" && demo && html`<${JourneyNav} S=${demo} next=${next} view=${view || STEP_OF[next] || next} setView=${setView} />`}
      <//>
      <main>${page}</main>
    </div>
    <div className=${`toast ${toastMsg ? "on" : ""}`} role="status" aria-live="polite">${toastMsg}</div>
  <//>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
