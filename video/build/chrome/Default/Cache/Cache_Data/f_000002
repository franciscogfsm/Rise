// RISE web app — React 18 + htm (vendored, no build step).
//   /          analyze any public GitHub repository (the product)
//   /a/:id     one analysis: evidence from the code, AI test plan, real results on the target provider
//   /replay    re-run an app's recorded S3 call sequence on other clouds
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
  if (r.status === 404 && data.detail === "Not Found") throw new Error("This RISE server is older than the page (missing " + path + "). Restart it: scripts/run.sh");
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

// animates a displayed number toward its real value
function useCount(target, ms = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target == null) return;
    let raf, t0 = performance.now(), from = 0;
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); setV(Math.round(from + (target - from) * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return target == null ? null : v;
}

function Ring({ value, total, color }) {
  const r = 26, c = 2 * Math.PI * r, f = total ? value / total : 0;
  return html`<svg className="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r=${r} className="ring-bg" />
    <circle cx="32" cy="32" r=${r} className="ring-fg" style=${color ? { stroke: color } : null} strokeDasharray=${c} strokeDashoffset=${c * (1 - f)} /></svg>`;
}

function SourceBadge({ src }) {
  if (!src) return null;
  const text = src.mode === "live" ? `AI · ${(src.ms / 1000).toFixed(1)} s` : src.mode === "cached" ? "cached AI" : "rules";
  return html`<span className=${`src-badge ${src.mode}`} title=${src.live_error || ""}>${text}</span>`;
}

const ICON = {
  scan: html`<svg viewBox="0 0 24 24"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10"/></svg>`,
  live: html`<svg viewBox="0 0 24 24"><path d="M3 12h4l3-7 4 14 3-7h4"/></svg>`,
  proof: html`<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 14l2 2 4-4"/></svg>`,
  plug: html`<svg viewBox="0 0 24 24"><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/></svg>`,
};

function Sidebar({ path, go, recent, children, agentOpen, onAgent }) {
  return html`<aside className="side glass" aria-label="Navigation">
    <div className="brand"><img src="/static/brand/rise-icon.svg" alt="" />
      <div><div className="wm">RISE</div><div className="tag">Proof of Cloud Freedom</div></div></div>
    <nav className="nav">
      <${Link} to="/" go=${go} className=${path === "/" || path.startsWith("/a/") ? "on" : ""}>${ICON.scan}Analyses<//>
      <${Link} to="/connect" go=${go} className=${path === "/connect" ? "on" : ""}>${ICON.plug}Connections<//>
      <${Link} to="/replay" go=${go} className=${path === "/replay" ? "on" : ""}>${ICON.proof}Replay<//>
      <${Link} to="/demo" go=${go} className=${path === "/demo" ? "on" : ""}>${ICON.live}Live switch<span className="badge">LIVE</span><//>
    </nav>
    <button type="button" className=${`ask-agent ${agentOpen ? "on" : ""}`} onClick=${onAgent}><span className="ag-dot"></span>RISE agent<kbd>Ctrl K</kbd></button>
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
  </aside>`;
}

// =====================================================================================
// PRODUCT
// =====================================================================================
const EXAMPLES = [
  ["CandyShare", "https://github.com/Anonymous961/CandyShare  leave AWS for a European cloud"],
  ["assetstorageservice", "https://github.com/priteshgudge/assetstorageservice  add a backup provider"],
  ["s3PresignedUrl_v3", "https://github.com/ucapistranmtz/s3PresignedUrl_v3  can I move this to Garage?"],
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
const STAGES = [["fetch", "Fetch"], ["scan", "Scan code"], ["docs", "Read docs"], ["plan", "AI plan"], ["test", "Real tests"], ["adapt", "Adapt"], ["report", "Report"]];

const STATUS = { done: ["ok", "Done"], running: ["run", "Running"], queued: ["idle", "Queued"], error: ["bad", "Failed"] };
const when = (ts) => (ts ? new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function ScoreCell({ s }) {
  if (s?.percent == null) return html`<span className="muted">—</span>`;
  const cls = s.percent >= 90 ? "ok" : s.percent >= 60 ? "warn" : "bad";
  return html`<span className="scorecell"><b className=${`score-${cls === "warn" ? "mid" : cls}`}>${s.percent}%</b>
    <span className="meter"><i className=${cls} style=${{ width: `${s.percent}%` }}></i></span><span className="muted mono">${s.verified}/${s.total}</span></span>`;
}

const RANK = { ready: 0, ready_with_change: 1, partial: 2, not_ready: 3, no_storage: 4 };
const DKIND = { ready: "ok", ready_with_change: "ok", partial: "warn", not_ready: "bad", no_storage: "idle" };

function Answer({ a }) {
  if (a.status !== "done") { const st = STATUS[a.status] || ["idle", a.status]; return html`<${Pill} cls=${st[0]}>${st[1]}${a.status === "running" && a.stage ? ` · ${a.stage}` : ""}<//>`; }
  return a.decision ? html`<${Pill} cls=${DKIND[a.decision.kind]}>${a.decision.title}<//>` : html`<${Pill} cls="ok">Done<//>`;
}

const GH_TOKEN = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g;

function Home({ go, toast, recent, conns }) {
  const [text, setText] = useState("");
  const [token, setToken] = useState("");  // stays in this tab: sent once with the analysis, never to /api/intent
  const [busy, setBusy] = useState("");
  const onText = (v) => {
    const t = v.match(GH_TOKEN);
    if (t) setToken(t[0]);
    setText(t ? v.replace(GH_TOKEN, "").replace(/[ \t]{2,}/g, " ") : v);
  };
  const understand = async () => {
    setBusy("understand");
    try {
      const p = await api("/api/intent", "POST", { text });
      if (!p.url) return toast("Paste a GitHub repository link, then say where you want to go.");
      const plan = p.missing ? { ...p, targets: [`docs:${p.missing.key}`] } : p;
      if (!plan.targets.length) return toast("Add the cloud you want to move to in Connections.");
      setBusy("run");
      const a = await api("/api/analyses", "POST", { url: plan.url, reference: plan.reference, targets: plan.targets, goal: plan.goal, token: token || null });
      setToken(""); setText("");
      go(a.compare ? `/c/${a.compare}` : `/a/${a.id}`);
    } catch (e) { toast(e.message); } finally { setBusy(""); }
  };
  const submit = () => text.trim() && !busy && understand();
  const groups = new Set();
  const rows = recent.filter((a) => !a.group || (!groups.has(a.group) && groups.add(a.group)));
  return html`<${Fragment}>
    <section className="hero">
      <span className="hero-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>RISE AI</span>
      <h1>Will your code survive another cloud?</h1>
      <p>Paste a repository, say where you want to go. Proof in seconds.</p>
    </section>
    <form className=${`ask${busy ? " thinking" : ""}`} onSubmit=${(e) => { e.preventDefault(); submit(); }}>
     <div className="ask-in">
      <textarea value=${text} rows="2" autoFocus aria-label="Repository and goal" onInput=${(e) => onText(e.target.value)}
        onKeyDown=${(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder="github.com/acme/shop: leave AWS for a European cloud" />
      <div className="ask-bar">
        ${token ? html`<span className="pill-lock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Token hidden · used once, never sent to the AI</span>`
          : html`<span className="ask-hint">${busy === "understand" ? "Understanding where you want to go…" : busy === "run" ? "Starting the check…" : "Say the migration · RISE checks everything"}</span>`}
        <span className="grow"></span>
        <button className="send" type="submit" aria-label="Check" disabled=${!!busy || !text.trim()}>
          ${busy ? html`<span className="dots"><i></i><i></i><i></i></span>`
            : html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>`}</button>
      </div>
     </div>
    </form>
    ${!text && html`<div className="try">Try${EXAMPLES.map(([l, t]) => html`<button key=${l} type="button" onClick=${() => onText(t)}>${l}</button>`)}</div>`}
    <section className="card glass grow home-list">
      <div className="card-h"><h2>All analyses</h2><span className="chip">${rows.length}</span></div>
      <div className="card-b">${rows.length ? html`<table className="tbl">
        <thead><tr><th>Repository</th><th>Answer</th><th>Verified</th><th>From → to</th><th>Time</th><th>Started</th></tr></thead>
        <tbody>${rows.map((a) => {
          const P = a.providers || [], n = a.group ? recent.filter((x) => x.group === a.group).length : 0;
          return html`<tr key=${a.id} className="click" onClick=${() => go(a.group ? `/c/${a.group}` : `/a/${a.id}`)}>
            <td><b>${a.repo.owner}/${a.repo.name}</b><div className="muted mono">${a.goal || a.id}</div></td>
            <td>${a.group ? html`<${Pill} cls="idle">Comparison · ${n} providers<//>` : html`<${Answer} a=${a} />`}</td>
            <td>${a.group ? "—" : html`<${ScoreCell} s=${a.score} />`}</td>
            <td className="mono">${P.length ? `${P[0].name} → ${a.group ? `${n} targets` : P[1].name}` : "—"}</td>
            <td className="mono nowrap">${a.duration_ms ? html`<b>${secs(a.duration_ms)}</b>` : "—"}</td>
            <td className="mono muted">${when(a.created)}</td></tr>`;
        })}</tbody></table>` : html`<${Empty}>No analyses yet. Paste a repository above, or pick an example.<//>`}</div>
    </section>
  <//>`;
}

// Several targets for the same code: which one can it move to, and what does each need?
function Compare({ id, recent, go }) {
  const rows = recent.filter((a) => a.group === id).sort((x, y) =>
    (RANK[x.decision?.kind] ?? 9) - (RANK[y.decision?.kind] ?? 9) || (y.score?.percent ?? -1) - (x.score?.percent ?? -1) || (x.duration_ms ?? 1e9) - (y.duration_ms ?? 1e9));
  if (!rows.length) return html`<div className="home"><${Empty}>Loading…<//></div>`;
  const r0 = rows[0], done = rows.every((a) => a.status !== "running" && a.status !== "queued");
  const best = done && rows.find((a) => ["ready", "ready_with_change"].includes(a.decision?.kind));
  return html`<${Fragment}>
    <header className="head"><h1><${Link} to="/" go=${go} className="crumb">Analyses<//><span className="sep">/</span>${r0.repo.owner}/${r0.repo.name}</h1>
      <${Pill} cls=${done ? "ok" : "run"}>${done ? "Compared" : "Comparing"}<//>
      <span className="meta">From ${r0.providers?.[0]?.name} to ${rows.length} providers${r0.goal ? ` · ${r0.goal}` : ""}</span></header>
    <section className=${`verdict glass ${!done ? "run" : best ? "ok" : "bad"}`}>
      <span className="v-mark">${!done ? html`<i></i>` : best ? "✓" : "✗"}</span>
      <div className="v-txt"><h2>${!done ? `Testing ${rows.length} providers at once…` : best ? `Best fit: ${best.providers[1].name}` : "None of these is ready yet"}</h2>
        <p>${done ? `${rows.filter((a) => ["ready", "ready_with_change"].includes(a.decision?.kind)).length} of ${rows.length} ready · ranked by answer, then verified behaviours, then speed` : "Same code, same tests, every provider in parallel"}</p></div>
    </section>
    <section className="card glass grow"><div className="card-b"><table className="tbl cmp">
      <thead><tr><th></th><th>Provider</th><th>Answer</th><th>Verified</th><th>Change needed</th><th>Time</th><th></th></tr></thead>
      <tbody>${rows.map((a, i) => {
        const ch = a.decision?.change, T = a.providers?.[1] || {};
        return html`<tr key=${a.id} className="click" onClick=${() => go(`/a/${a.id}`)}>
          <td className="mono muted">${i + 1}</td>
          <td><b>${T.name}</b><div className="muted mono">${[T.documented_region, T.simulated && "simulated"].filter(Boolean).join(" · ")}</div></td>
          <td><${Answer} a=${a} /></td>
          <td><${ScoreCell} s=${a.score} /></td>
          <td className="mono">${ch ? html`<span className="v-tag fix"><code>${ch.key}</code> ${ch.from} → <b>${ch.to}</b></span>` : a.decision?.failing?.length ? html`<span className="badc">${a.decision.failing.length} failing</span>` : a.status === "done" ? "none" : "—"}</td>
          <td className="mono nowrap">${a.duration_ms ? secs(a.duration_ms) : "—"}</td>
          <td className="muted">Open →</td></tr>`;
      })}</tbody></table></div></section>
  <//>`;
}

// Plain-language briefing (AI, grounded in the risks RISE found) + the risks with their code lines
const SEV = { high: "bad", medium: "warn", low: "idle" };
function Briefing({ a }) {
  const b = a.brief, R = a.risks || [];
  return html`<section className="card glass brief" style=${{ flex: 1 }}>
    <div className="card-h"><h2>What RISE sees</h2><span className="grow"></span>${b && html`<${SourceBadge} src=${b.source} />`}</div>
    <div className="card-b">
      ${b ? html`<div className="b-head" title=${b.explanation}>${b.headline}</div>
        ${b.actions?.length > 0 && html`<ol className="b-acts">${b.actions.map((x, i) => html`<li key=${i} title=${x.detail} style=${{ animationDelay: `${i * 80}ms` }}><b>${x.title}</b></li>`)}</ol>`}`
        : html`<${Empty}>${a.status === "error" ? "—" : "The AI is reading your code…"}<//>`}
      ${R.length > 0 && html`<div className="risks"><div className="colh"><span>Risks found in the code</span><span>${R.length}</span></div>
        ${R.map((r) => html`<details key=${r.id} className="risk">
          <summary><span className=${`sev ${SEV[r.severity]}`}>${r.severity}</span><b>${r.title}</b></summary>
          <p>${r.detail}</p>
          ${r.evidence.map((e, i) => html`<div key=${i} className="ev-line"><a href=${blobUrl(a, e.file, e.line)} target="_blank" rel="noopener" title=${`${e.file}:${e.line}`}>${e.file.split("/").pop()}:${e.line}</a><code>${e.code}</code></div>`)}
        </details>`)}</div>`}
    </div>
  </section>`;
}

function blobUrl(a, file, line) {
  if (a.repo.local) return "#";  // a local folder has no web URL
  const base = a.url.split("/tree/")[0];
  const ref = a.repo.ref !== "HEAD" ? a.repo.ref : /^[0-9a-f]{40}$/.test(a.repo.commit || "") ? a.repo.commit : "HEAD";
  return `${base}/blob/${ref}/${file.split("/").map(encodeURIComponent).join("/")}#L${line}`;
}

function TestRow({ t, r, x, b, fix, n = 0 }) {
  const failed = [...(x?.checks || []), ...(r?.checks || [])].filter((c) => !c.ok);
  const bad = x && x.status !== "pass";
  const Res = ({ v }) => v ? html`<span key=${v.status} className=${`res ${v.status}`}>${v.status.toUpperCase()}</span>` : html`<span className="res wait"><i></i></span>`;
  return html`<div className=${`trow ${bad ? "bad" : ""}`} style=${{ animationDelay: `${n * 70}ms` }}>
    <div className="tt" title=${`${t.kind} · ${t.origin}`}><b>${t.title}</b>${t.rationale && html`<div className="why">${t.rationale}</div>`}
      ${b && b.status !== "pass" && x?.status === "pass" && html`<div className="rescued">Failed first · fixed by <code>${fix}</code></div>`}</div>
    <${Res} v=${r} /><${Res} v=${x} />
    ${bad && html`<div className="tc">
      ${bad && x.error && html`<div className="err">${x.error.code}${x.error.status ? ` · HTTP ${x.error.status}` : ""} · ${x.error.message}</div>`}
      ${bad && (x.checks || []).filter((c) => !c.ok).map((c, i) => html`<div key=${i} className="err">${c.name}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}</div>`)}
    </div>`}
  </div>`;
}


// The answer, derived only from the real score, adaptation and scan (no AI wording here)
function Verdict({ a, onAsk }) {
  if (a.status === "error") return null;
  const P = a.providers || [], tgt = P[1]?.name || "target";
  if (a.status !== "done") {
    const stage = STAGES.find(([k]) => a.stages?.[k] === "running");
    const last = a.events?.[a.events.length - 1];
    return html`<section className="verdict run glass"><span className="orb"><i></i></span>
      <div className="v-txt"><h2 key=${stage?.[0]}>${stage ? stage[1] : "Starting"}…</h2><p key=${last?.msg}>${last?.msg || `Checking ${tgt}`}</p></div></section>`;
  }
  const s = a.score, D = a.decision;
  if (!D) return null;
  const bad = D.failing, open = D.untested, lock = (a.lockin || []).map((l) => l.service), ch = D.change;
  const [kind, mark] = { ready: ["ok", "✓"], ready_with_change: ["ok", "✓"], partial: ["warn", "!"], not_ready: ["bad", "✗"], documented: ["warn", "?"] }[D.kind] || ["none", "–"];
  const title = D.title;
  const tag = (cls, t) => html`<span className=${`v-tag ${cls}`}>${t}</span>`;
  return html`<section className=${`verdict ${kind} glass`}>
    <span className="v-mark">${kind === "ok" ? html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>` : mark}</span>
    <div className="v-txt">
      <h2>${title}</h2>
      <p>${D.kind === "documented" ? `From ${a.docs.pages.length} official ${tgt} pages · nothing tested yet` : s?.total ? `${s.verified}/${s.total} verified on ${tgt}` : "Nothing to test"}${a.duration_ms ? ` · ${secs(a.duration_ms)}` : ""}</p>
      <div className="v-tags">
        ${ch && html`<span className="v-tag fix"><code>${ch.key}</code> ${ch.from} → <b>${ch.to}</b></span>`}
        ${bad.map((k) => tag("bad", ITEM[k] || k))}
        ${D.kind !== "documented" && open.map((k) => tag("idle", `${ITEM[k] || k} · not tested`))}
        ${lock.map((l) => tag("idle", `${l} · out of scope`))}
        ${P.some((p) => p.simulated) && tag("sim", "simulated providers")}
      </div>
    </div>
    <div className="v-act">
      <button type="button" className="btn sm" onClick=${() => onAsk("Explain this result in simple words: can we migrate, and what exactly do we need to change?")}>Ask RISE</button>
      <a className="btn ghost sm" href=${`/api/analyses/${a.id}/proof`} target="_blank" rel="noopener">Proof</a>
    </div>
  </section>`;
}

function Analysis({ id, tick, go, onAsk }) {
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
  const pctColor = s?.percent == null ? null : s.percent >= 90 ? "var(--ok)" : s.percent >= 60 ? "var(--warn)" : "var(--bad)";
  const P = a.providers || [];
  return html`<${AnalysisView} a=${a} s=${s} plan=${plan} refs=${ref} tgt=${tgt} ev=${ev} items=${items} pctColor=${pctColor} P=${P} go=${go} onAsk=${onAsk} />`;
}

// What the destination's official docs say about each behaviour the code uses; quotes are verified verbatim server-side
const DOC = { documented: ["ok", "✓", "documented"], limit: ["warn", "!", "limit"], not_found: ["idle", "?", "not in docs"] };
function Docs({ a }) {
  const d = a.docs, host = (u) => u.replace(/^https?:\/\//, "").split("/")[0];
  if (!d) return html`<section className="card glass docs"><div className="card-h"><h2>Official docs</h2></div>
    <div className="card-b"><${Empty}>${a.stages.docs === "fail" ? "Documentation could not be read." : "Reading the provider's documentation…"}<//></div></section>`;
  const n = d.findings.filter((f) => f.status === "documented").length;
  return html`<section className="card glass docs">
    <div className="card-h"><h2>${d.name.split(" ")[0]} docs</h2><span className="grow"></span><span className="chip">${n}/${d.findings.length} documented</span></div>
    <div className="card-b">
      ${d.region_mismatch && html`<div className="doc-row warn"><i>!</i><div><b>Region <s>${d.code_region}</s> → ${d.regions.slice(0, 3).join(", ")}…</b>
        <span>Your code signs for ${d.code_region}; the docs only list ${d.regions.join(", ")}.</span></div></div>`}
      ${d.findings.map((f, i) => {
        const [cls, mark, label] = DOC[f.status] || DOC.not_found, v = a.verdict?.[f.item];
        return html`<div key=${f.item} className=${`doc-row ${cls}`} style=${{ animationDelay: `${i * 70}ms` }}><i>${mark}</i>
          <div><b>${ITEM[f.item] || f.item}</b>${f.quote ? html`<q>${f.quote}</q>` : html`<span>${label}${v === "pass" ? " · proven by RISE's test" : ""}</span>`}
          ${f.url && html`<a href=${f.url} target="_blank" rel="noopener" title=${f.url}>${host(f.url)} ↗</a>`}</div></div>`;
      })}
      <div className="doc-foot">${d.cached ? `cached copy · ${d.fetched_at.slice(0, 10)}` : `read live · ${d.pages.length} official pages`} · quotes checked word for word <${SourceBadge} src=${d.source} /></div>
    </div>
  </section>`;
}

function Adapt({ a, name }) {
  const ad = a.adaptation, p = ad.proposal, B = a.results_before_adaptation || [];
  const failed = B.filter((r) => r.status !== "pass").length, ok = ad.applied && ad.retest.passed === ad.retest.total;
  const short = (n) => n.split(" · ")[0];
  return html`<div className="adapt">
    <div className="ad-step bad" title=${p.diagnosis}><i>✗</i><div><b>${B.length ? `${failed}/${B.length} failed on ${short(name)}` : `Failed on ${short(name)}`}</b>
      <span>${p.diagnosis}</span></div><${SourceBadge} src=${p.source} /></div>
    ${ad.applied ? html`<div className="ad-step fix"><i>↻</i><div><b>Changed <code>${p.key}</code> <s>${ad.before[p.key]}</s> → <em>${p.value}</em></b></div></div>
      <div className=${`ad-step ${ok ? "ok" : "bad"}`}><i>${ok ? "✓" : "✗"}</i><div><b>Retested · ${ad.retest.passed}/${ad.retest.total} pass</b></div></div>`
      : html`<div className="ad-step bad"><i>!</i><div><b>No safe setting fixes it</b></div></div>`}
  </div>`;
}

function AnalysisView({ a, s, plan, refs: ref, tgt, ev, items, pctColor, P, go, onAsk }) {
  const pct = useCount(s?.percent);
  const before = Object.fromEntries((a.results_before_adaptation || []).map((r) => [r.test_id, r]));
  return html`<${Fragment}>
    <header className="head">
      <h1><${Link} to="/" go=${go} className="crumb">Analyses<//><span className="sep">/</span>${a.repo.owner}/${a.repo.name}</h1>
      <${Pill} cls=${(STATUS[a.status] || ["idle"])[0]}>${(STATUS[a.status] || [0, a.status])[1]}<//>
      <span className="meta">${a.repo.local ? `Local folder · ${a.repo.name}` : html`<a className="ext" href=${a.url} target="_blank" rel="noopener">GitHub ↗</a>`}${P.length ? ` · ${P[0].name} → ${P[1].name}` : ""}${a.status === "error" ? html` · <span className="badc">${a.error}</span>` : ""}</span>
      <div className="actions">
        <button className="btn sm" type="button" onClick=${() => go("/")}>New analysis</button>
      </div>
    </header>

    <div className=${`track ${a.status === "done" ? "quiet" : ""}`}>${STAGES.filter(([k]) => a.stages[k] && a.stages[k] !== "skipped").map(([k, l]) => {
      const st = a.stages[k];
      const msg = [...(a.events || [])].reverse().find((e) => e.stage === k)?.msg;
      const ms = a.stage_ms?.[k];
      return html`<div key=${k} className=${`tstage ${st}`}><span className="tn">${l}${ms != null && html`<span className="t-ms">${secs(ms)}</span>`}</span><span className="tm">${msg || ""}</span></div>`;
    })}</div>

    <${Verdict} a=${a} onAsk=${onAsk} />

    <div className="cols">
      <div className="stack">
        <section className="card glass">
          <div className="card-h"><h2>Portability</h2><span className="grow"></span>${a.status === "running" && html`<${Pill} cls="run">running<//>`}</div>
          <div className="score">
            <div className="ring-wrap"><${Ring} value=${s?.verified || 0} total=${s?.total || 1} color=${pctColor} />
              <span className="ring-n">${pct == null ? "—" : `${pct}%`}</span></div>
            <div className="tally">
              <div><b>${s ? `${s.verified}/${s.total}` : "—"}</b>verified</div>
              ${s?.failed > 0 && html`<div><b className="bad-t">${s.failed}</b>fail</div>`}
              ${s?.unsupported > 0 && html`<div><b>${s.unsupported}</b>unsupported</div>`}
              ${s?.untested > 0 && html`<div><b>${s.untested}</b>not tested</div>`}
            </div>
          </div>
          <div className="why" hidden>${P.length ? html`Reference <b>${P[0].name}</b> vs target <b>${P[1].name}</b>${P.some((p) => p.simulated) ? " (simulated providers)" : ""}. Code signs requests for region <b>${a.code_region?.value || "—"}</b>.` : ""}</div>
        </section>
        <${Briefing} a=${a} />
      </div>

      <div className="stack">
      <section className="card glass">
        <div className="card-h"><h2>Found in your code</h2><span className="grow"></span>
          ${(a.scan?.sdk || []).map((s) => html`<span key=${s} className="chip" title="Not S3: each call is mapped to the S3 operation the destination must support">${s} SDK</span>`)}
          ${a.speed && html`<span className="chip speed" title=${`${a.speed.files} files · ${a.speed.cores} core(s)`}>${a.speed.lines.toLocaleString("en")} lines · ${a.speed.ms < 1000 ? `${Math.round(a.speed.ms)} ms` : `${(a.speed.ms / 1000).toFixed(1)} s`}</span>`}</div>
        <div className="card-b">${items.length ? items.map((it, n) => {
          const v = a.verdict?.[it];
          const lines = ev.filter((e) => e.item === it).slice(0, 1);
          return html`<div key=${it} className="item" style=${{ animationDelay: `${n * 70}ms` }}>
            <div className="item-h"><b>${ITEM[it] || it}</b><span className="grow"></span>
              ${v ? html`<${Pill} cls=${VERDICT[v][0]}>${VERDICT[v][1]}<//>` : html`<${Pill} cls="idle">pending<//>`}</div>
            ${lines.map((e, i) => html`<div key=${i} className="ev-line"><a href=${blobUrl(a, e.file, e.line)} target="_blank" rel="noopener" title=${`${e.file}:${e.line}`}>${e.file.split("/").pop()}:${e.line}</a><code>${e.code}</code></div>`)}
          </div>`;
        }) : html`<${Empty}>${a.scan ? "No object-storage usage found in this repository." : "Scanning…"}<//>`}</div>
      </section>
      </div>

      <div className=${`stack${P[1]?.docs_only ? " docs-first" : ""}`}>
      <section className="card glass">
        <div className="card-h"><h2>Tests</h2><span className="grow"></span><${SourceBadge} src=${plan?.source} /></div>
        <div className="card-b">
          ${a.adaptation && html`<${Adapt} a=${a} name=${P[1]?.name || "target"} />`}
          ${plan ? html`<div className="colh tcols"><span>What we check</span><span title=${P[0]?.name}>${P[0]?.name.split(" ")[0] || "from"}</span><span title=${P[1]?.name}>${P[1]?.name.split(" ")[0] || "to"}</span></div>
            ${plan.tests.map((t, n) => html`<${TestRow} key=${t.id} n=${n} t=${t} r=${ref[t.id]} x=${tgt[t.id]} b=${before[t.id]} fix=${a.adaptation?.proposal?.key} />`)}`
            : P[1]?.docs_only ? html`<div className="docs-cta"><b>Not proven yet</b><span>Documentation is a promise. Connect ${P[1].name} and RISE runs the same tests for real.</span>
                <button type="button" className="btn sm" onClick=${() => go("/connect")}>Connect ${P[1].name.split(" ")[0]}</button></div>`
            : html`<${Empty}>${a.stages.plan === "skipped" ? "No storage behaviour to test." : "The AI test plan appears here."}<//>`}
        </div>
      </section>
      ${a.docs_for && html`<${Docs} a=${a} />`}
      </div>
    </div>
  <//>`;
}

// =====================================================================================
// CONNECTIONS
// =====================================================================================
function connStatus(c, testing) {
  const t = c.last_test;
  return testing ? ["run", "Testing"] : !t ? ["idle", "Not tested"] : t.ok ? ["ok", "Connected"] : ["bad", "Failed"];
}

const FIELDS = [  // [key, label, placeholder, input type, required]
  ["name", "Name", "Leaseweb Object Storage · AMS", "text", true],
  ["endpoint", "Endpoint", "https://s3.example.com · empty = AWS S3", "url", false],
  ["region", "Region", "nl-ams-1", "text", true],
  ["bucket", "Bucket", "my-app-assets", "text", true],
  ["test_bucket", "Test bucket", "optional · defaults to the bucket", "text", false],
  ["access_key", "Access key", "", "text", true],
  ["secret_key", "Secret key", "", "password", true],
];

// Real S3-compatible clouds: picking one fills the endpoint and region. {r} = region.
const CLOUDS = [
  ["AWS S3", "", ["eu-north-1", "eu-west-1", "eu-central-1", "eu-west-3", "us-east-1"], "IAM → user → access key"],
  ["Leaseweb", "https://{c}.object-storage.io", ["nl-01", "de-01", "uk-01", "us-01", "sg-01"], "Customer Portal → Object Storage → credentials"],
  ["Backblaze B2", "https://s3.{r}.backblazeb2.com", ["eu-central-003", "us-west-004", "us-east-005"], "App Keys → Add a New Application Key"],
  ["Wasabi", "https://s3.{r}.wasabisys.com", ["eu-central-1", "eu-west-1", "us-east-1"], "Access Keys → Create new access key"],
  ["Scaleway", "https://s3.{r}.scw.cloud", ["nl-ams", "fr-par", "pl-waw"], "IAM → API keys"],
  ["Hetzner", "https://{r}.your-objectstorage.com", ["fsn1", "nbg1", "hel1"], "Project → Security → S3 credentials"],
  ["Cloudflare R2", "https://ACCOUNT_ID.r2.cloudflarestorage.com", ["auto"], "R2 → Manage API tokens · put your account ID in the endpoint"],
];

function AddConnection({ onCancel, onAdded, toast, initial }) {
  const [f, setF] = useState(initial || {});
  const [cloud, setCloud] = useState(null);
  const pick = (c, r) => { setCloud(c); setF((x) => ({ ...x, name: `${c[0]} · ${r}`, endpoint: c[1].replace("{r}", r).replace("{c}", r.split("-")[0]), region: r })); };
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const c = await api("/api/connections", "POST", f); setF({}); onAdded(c); }
    catch (err) { toast(err.message); } finally { setBusy(false); }
  };
  return html`<form className="cform" onSubmit=${submit} autoComplete="off">
    <div className="card-h"><h2>Add connection</h2><span className="grow"></span><button type="button" className="btn ghost sm" onClick=${onCancel}>Cancel</button></div>
    <div className="card-b fields">
      <div className="clouds">${CLOUDS.map((c) => html`<button key=${c[0]} type="button" className=${`cchip ${cloud?.[0] === c[0] ? "on" : ""}`} onClick=${() => pick(c, c[2][0])}>${c[0]}</button>`)}</div>
      ${cloud && html`<div className="cloud-r">${cloud[2].map((r) => html`<button key=${r} type="button" className=${`cchip sm ${f.region === r ? "on" : ""}`} onClick=${() => pick(cloud, r)}>${r}</button>`)}
        <span className="k">keys: ${cloud[3]}</span></div>`}
      ${FIELDS.map(([k, l, ph, type, req]) => html`<label key=${k} className="fld"><span>${l}${req ? "" : html` <i>optional</i>`}</span>
        <input type=${type} value=${f[k] || ""} placeholder=${ph} spellCheck="false" autoComplete=${type === "password" ? "new-password" : "off"}
          required=${req} onInput=${(e) => { const v = e.target.value; setF((x) => ({ ...x, [k]: v })); }} /></label>`)}
      <p className="note-muted">Keys are encrypted at rest on this server (Fernet: AES-128 + HMAC-SHA256), never sent back to the browser and never shown to the AI. Use a key limited to these buckets: RISE writes only synthetic <code>rise-*</code> objects in the test bucket.</p>
    </div>
    <div className="conn-foot"><button className="btn sm" type="submit" disabled=${busy}>${busy ? "Saving…" : "Save and test"}</button></div>
  </form>`;
}

function ConnectionDetail({ c, testing, onTest, onRemove }) {
  const t = c.last_test, st = connStatus(c, testing);
  return html`<${Fragment}>
    <div className="card-h"><h2>${c.name}</h2>${c.simulated && html`<span className="sim">simulated</span>`}<span className="grow"></span><${Pill} cls=${st[0]}>${st[1]}<//></div>
    <dl className="kv">
      <dt>endpoint</dt><dd>${c.endpoint}</dd><dt>region</dt><dd>${c.region}</dd>
      <dt>bucket</dt><dd>${c.bucket}</dd><dt>test bucket</dt><dd>${c.test_bucket}</dd>
      <dt>keys</dt><dd className=${c.keys_set ? "" : "badc"}>${c.keys_set ? c.key_storage : "not set in .env"}</dd>
      <dt>used as</dt><dd>${c.role ? `default ${c.role}` : "reference or target, chosen per analysis"}</dd>
    </dl>
    <div className="card-b checks">${t ? t.checks.map((k) => html`<div key=${k.id} className=${`check c-${k.status}`}>
        <span className="cb">${k.status === "pass" ? "✓" : k.status === "fail" ? "!" : "·"}</span>
        <div><b>${k.label}</b>
          ${k.status === "pass" && html`<div className="k">${k.detail} · ${k.ms} ms${k.request_id ? ` · req ${k.request_id.slice(0, 18)}` : ""}</div>`}
          ${k.status === "fail" && html`<div className="err">${k.error.code}${k.error.status ? ` · HTTP ${k.error.status}` : ""} · ${k.error.message}</div>`}
          ${k.hint && html`<div className="hint">${k.hint}</div>`}
          ${k.status === "skipped" && html`<div className="k">skipped: an earlier check failed</div>`}</div></div>`)
      : html`<${Empty}>Not tested yet. The test makes real S3 calls: reach the buckets, write a probe object, read it back and compare SHA-256, delete it.<//>`}</div>
    <div className="conn-foot"><button className="btn sm" type="button" disabled=${testing} onClick=${onTest}>${testing ? "Testing…" : t ? "Test again" : "Test connection"}</button>
      ${t && html`<span className="k">${clock(t.at)} UTC · signed for ${t.signed_for_region}</span>`}<span className="grow"></span>
      ${!c.builtin && html`<button className="btn ghost sm danger-t" type="button" onClick=${onRemove}>Remove</button>`}</div>
  <//>`;
}

function Connections({ toast, conns, reload, prefill }) {
  const [sel, setSel] = useState(prefill ? "new" : null);
  useEffect(() => { if (prefill) setSel("new"); }, [prefill]);
  const [testing, setTesting] = useState({});
  const test = async (id) => {
    setTesting((x) => ({ ...x, [id]: true }));
    try { await api(`/api/connections/${id}/test`, "POST"); await reload(); }
    catch (e) { toast(e.message); } finally { setTesting((x) => ({ ...x, [id]: false })); }
  };
  const remove = async (c) => {
    if (!confirm(`Remove “${c.name}”? Its stored keys are deleted from this server.`)) return;
    try { await api(`/api/connections/${c.id}`, "DELETE"); setSel(null); await reload(); } catch (e) { toast(e.message); }
  };
  if (!conns) return html`<${Empty}>Loading…<//>`;
  const shown = sel || conns[0]?.id, cur = conns.find((c) => c.id === shown);
  return html`<${Fragment}>
    <header className="head"><h1>Connections</h1><span className="meta">S3-compatible object storage · ${conns.length} configured</span>
      <div className="actions">
        <button className="btn ghost sm" type="button" disabled=${Object.values(testing).some(Boolean)} onClick=${() => conns.forEach((c) => test(c.id))}>Test all</button>
        <button className="btn sm" type="button" onClick=${() => setSel("new")}>+ Add connection</button></div>
    </header>
    <div className="split-main">
      <section className="card glass"><div className="card-b"><table className="tbl">
        <thead><tr><th>Name</th><th>Endpoint</th><th>Region</th><th>Bucket</th><th>Status</th><th></th></tr></thead>
        <tbody>${conns.map((c) => {
          const st = connStatus(c, testing[c.id]);
          return html`<tr key=${c.id} className=${`click ${shown === c.id ? "sel" : ""}`} onClick=${() => setSel(c.id)}>
            <td><b>${c.name}</b> ${c.simulated && html`<span className="sim">sim</span>`}<div className="muted mono">${c.role ? `default ${c.role} · .env` : `added · ${c.id}`}</div></td>
            <td className="mono">${c.endpoint}</td><td className="mono">${c.region}</td>
            <td className="mono">${c.bucket}${c.test_bucket !== c.bucket && html`<div className="muted">test · ${c.test_bucket}</div>`}</td>
            <td><${Pill} cls=${st[0]}>${st[1]}<//>${c.last_test && html`<div className="muted mono">${clock(c.last_test.at)} UTC</div>`}</td>
            <td className="act"><button className="btn ghost sm" type="button" disabled=${!!testing[c.id]} onClick=${(e) => { e.stopPropagation(); test(c.id); }}>Test</button></td></tr>`;
        })}</tbody></table></div></section>
      <section className="card glass panel">
        ${shown === "new" ? html`<${AddConnection} key=${prefill?._t || 0} initial=${prefill?.fields} toast=${toast} onCancel=${() => setSel(null)} onAdded=${async (c) => { await reload(); setSel(c.id); test(c.id); }} />`
          : cur ? html`<${ConnectionDetail} c=${cur} testing=${!!testing[cur.id]} onTest=${() => test(cur.id)} onRemove=${() => remove(cur)} />` : null}
      </section>
    </div>
  <//>`;
}

// =====================================================================================
// MIGRATION REPLAY: the app's recorded S3 call sequence (no code, no bytes, aliased keys) re-run on other clouds
// =====================================================================================
const FIELD = { status: "HTTP status", error: "error", content_type: "Content-Type", metadata: "metadata keys", length: "size",
  intact: "bytes intact (SHA-256)", listed: "listing shows the object" };
const val = (v) => (v == null ? "—" : Array.isArray(v) ? (v.length ? v.join(", ") : "none") : String(v));
function Replay({ toast, conns, reload }) {
  const [trace, setTrace] = useState(null);
  const [pick, setPick] = useState(["source", "destination"]);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!conns) reload(); }, [conns, reload]);
  const useApp = () => api("/api/replay/trace").then((t) => { setTrace(t); setRes(null); }, (e) => toast(e.message));
  const load = (e) => {
    const f = e.target.files[0];
    if (f) f.text().then((t) => { setTrace(JSON.parse(t)); setRes(null); }).catch(() => toast("That file is not a RISE trace (JSON)."));
  };
  const run = async () => {
    setBusy(true);
    try { setRes(await api("/api/replay", "POST", { trace, providers: pick })); } catch (e) { toast(e.message); } finally { setBusy(false); }
  };
  const R = res?.results || [];
  return html`<${Fragment}>
    <header className="head"><h1>Replay</h1><span className="meta">Your app's real S3 call sequence, re-run on other clouds with synthetic bytes · your code and data never leave</span>
      <div className="actions">
        <button className="btn ghost sm" type="button" onClick=${useApp}>Use asset-service recording</button>
        <label className="btn ghost sm file">Load trace.json<input type="file" accept=".json,application/json" onChange=${load} /></label></div>
    </header>
    ${!trace ? html`<section className="card glass"><div className="card-b replay-how">
        <b>Record inside your company, replay here</b>
        <span>Attach RISE's recorder to your app's S3 client. It keeps the call order, parameters and how your provider answered. Bodies are never kept, only their size; every key is replaced by an alias.</span>
        <pre className="mono">from rise.replay import Recorder
rec = Recorder("my-app"); rec.attach(s3)   # your boto3 client
... run your app as usual ...
json.dump(rec.trace(), open("trace.json", "w"))</pre></div></section>`
    : html`<${Fragment}>
      <section className="card glass"><div className="card-h"><h2>${trace.app} · ${trace.steps.length} calls</h2>
          <span className="chip mono">client ${trace.client?.region || "?"} · ${trace.client?.addressing_style || "?"}</span><span className="grow"></span>
          <div className="tgts">${(conns || []).map((c) => html`<button key=${c.id} type="button" className=${pick.includes(c.id) ? "on" : ""}
            onClick=${() => setPick((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id].slice(-4))}>
            ${pick.includes(c.id) && html`<span className="tick">✓</span>`}${c.name}${c.simulated && html`<i>sim</i>`}</button>`)}</div>
          <button className="btn sm" type="button" disabled=${busy || !pick.length} onClick=${run}>${busy ? "Replaying…" : `Replay on ${pick.length}`}</button></div>
        <div className="card-b"><table className="tbl replay">
          <thead><tr><th>#</th><th>Call</th><th>Object (alias)</th><th>Recorded</th>${R.map((r) => html`<th key=${r.provider.id}>${r.provider.name}</th>`)}</tr></thead>
          <tbody>${trace.steps.map((s, i) => html`<tr key=${i} className=${R.some((r) => r.first_divergence?.i === i) ? "first" : ""}>
            <td className="mono muted">${i + 1}</td><td><b>${s.op}</b></td>
            <td className="mono">${s.params.Key || s.params.Prefix || "—"}${s.params.Range ? ` · ${s.params.Range}` : ""}${s.params.BodyLength != null ? ` · ${s.params.BodyLength} B` : ""}</td>
            <td className="mono muted">${s.expect?.status ?? "—"}${s.expect?.error ? ` ${s.expect.error}` : ""}</td>
            ${R.map((r) => { const x = r.steps[i];
              return html`<td key=${r.provider.id} title=${x.request_id ? `request id ${x.request_id}` : ""}>${x.diff.length
                ? html`<${Pill} cls="bad">✗ ${x.got.status ?? x.got.error}<//>` : html`<${Pill} cls="ok">✓ ${x.got.status}<//>`}<span className="muted mono"> ${x.ms} ms</span></td>`; })}
          </tr>`)}</tbody></table></div></section>
      ${R.length > 0 && html`<div className="replay-verdicts">${R.map((r) => { const f = r.first_divergence;
        return html`<section key=${r.provider.id} className=${`card glass rv ${f ? "bad" : "ok"}`}>
          <div className="card-h"><h2>${r.provider.name}</h2>${r.provider.simulated && html`<span className="sim">sim</span>`}<span className="grow"></span>
            <span className="chip">${r.same}/${r.total} same</span></div>
          <div className="card-b">${f ? html`<b>First change at call ${f.i + 1}: ${f.op} ${f.key || ""}</b>
              ${f.diff.map((d) => html`<div key=${d.field} className="rv-d"><span>${FIELD[d.field] || d.field}</span><s>${val(d.expected)}</s><span>→</span><b>${val(d.got)}</b></div>`)}
              ${f.message && html`<q>${f.message}</q>`}
              <div className="muted mono">request id ${f.request_id || "—"} · client ${r.client.region} · ${r.provider.bucket}/${r.provider.prefix} (deleted)</div>`
            : html`<b>Behaves the same on all ${r.total} calls</b><div className="muted mono">client ${r.client.region} · ${r.provider.bucket}/${r.provider.prefix} (deleted)</div>`}</div>
        </section>`; })}</div>`}
    <//>`}
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
// One sentence on what the next action really does, shown next to the button that runs it.
const EXPLAIN = {
  discover: "asset-service runs a real editing session on the source. RISE records every S3 call its SDK makes.",
  analyze: "The observed calls go to the LLM, which returns a structured test plan. RISE validates it before anything runs.",
  challenge: "Every planned test runs on both providers with synthetic data. A test passes only if the bytes, metadata and listings match.",
  adapt: "The AI proposes one allowed change to the app's S3 client. RISE applies it to the destination only and reruns every test.",
  verify: "RISE copies the app's objects to the destination, reads them back and compares the SHA-256 of the bytes.",
  switch: "asset-service starts sending its storage requests to the destination. Requests keep flowing while the route changes.",
  cut: "RISE closes the network link between the app and the source. Anything that still depends on the source fails from here on.",
  prove: "The app writes an object that never existed on the source and reads it back, with the source still unreachable.",
};

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
      <dt>link</dt><dd>${S.health?.link?.result}</dd><dt>AI</dt><dd>${S.ai.configured ? "key configured" : "no key"}</dd></dl>`;
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
      const left = k === "switch" ? html`<dl className="kv">
          <dt>app route</dt><dd>${S.active}${sw ? ` · since ${clock(sw.at)}` : " · not switched yet"}</dd>
          ${sw && html`<${Fragment}><dt>first read</dt><dd className="okc">${sw.probe.key} · served by ${sw.probe.provider} · req ${sw.probe.request_id}</dd><//>`}
          ${c ? html`<${Fragment}><dt>source cut</dt><dd>${clock(c.at)}${c.restored_at ? ` · restored ${clock(c.restored_at)}` : ""}</dd>
            <dt>source TCP</dt><dd className="badc">${c.tcp_probe.result}</dd><dt>app → source</dt><dd className="badc">${c.app_probe.result}</dd><//>`
            : html`<${Fragment}><dt>source link</dt><dd>${S.link_up === null ? "real provider: no cut available" : "still connected"}</dd><//>`}
          ${sw && html`<${Fragment}><dt>traffic</dt><dd className=${S.traffic.failed_after_switch ? "badc" : "okc"}>${S.traffic.failed_after_switch} failed requests since the switch</dd><//>`}
        </dl>`
        : l ? html`<dl className="kv"><dt>new object</dt><dd>${l.key} · ${l.bytes} bytes</dd>
          <dt>served by</dt><dd className="okc">${l.provider}</dd><dt>put request</dt><dd>${l.put_request_id}</dd><dt>get request</dt><dd>${l.get_request_id}</dd>
          <dt>sha256</dt><dd className=${l.match ? "okc" : "badc"}>${short(l.sha256_written)} written · ${short(l.sha256_read)} read · ${l.match ? "match" : "MISMATCH"}</dd>
          <dt>source link</dt><dd className=${l.source_link_at_time?.reachable === false ? "badc" : ""}>${l.source_link_at_time ? l.source_link_at_time.result : "real provider: not cut"}</dd></dl>`
        : html`<${Empty}>Once the app runs on the destination, it writes an object that never existed on the source and reads it back. That is the proof that new work no longer needs the source.<//>`;
      return html`<div className="split2">${left}<div><div className="eyebrow" style=${{ marginBottom: 6 }}>Events</div><div className="log">${S.events.slice(-10).reverse().map((e) => html`<div key=${e.seq} className=${`logrow ${e.kind}`}><span className="t">${clock(e.ts)}</span><span>${e.msg}</span></div>`)}</div></div></div>`;
    }
    default: return null;
  }
}

function Demo({ S, act, busy, view, setView }) {
  const next = SEQUENCE.find(([, done]) => !done(S))?.[0];
  const disabled = busy || S.busy;
  const k = view || STEP_OF[next] || next || "prove";
  const title = { connect: "Providers", discover: "Observed behaviour", analyze: "AI-generated test plan", challenge: "Same tests, both providers",
    adapt: "Constrained adaptation", verify: "Data copied & verified", switch: "Route switched, source cut", prove: "A new operation, without the source" }[k];
  const stepNo = next ? JSTEPS.findIndex(([s]) => s === (STEP_OF[next] || next)) + 1 : JSTEPS.length;
  const needsTraffic = !S.traffic.on && ["switch", "cut"].includes(next);
  // After an action, show the result of the step that just ran; the guide says what comes next.
  const run = () => act(next).then((ok) => ok && setView(STEP_OF[next] || next));
  return html`<${Fragment}>
    <header className="head">
      <h1>Live switch</h1><span className="meta">asset-service · ${S.providers[0].name} → ${S.providers[1].name} · real traffic, switch and source cut</span>
      <div className="actions">
        <a className="btn ghost sm" href="/api/demo/proof" target="_blank" rel="noopener">Freedom proof (JSON)</a>
        <button className="btn ghost sm" type="button" disabled=${disabled} onClick=${() => { setView(null); act("reset"); }}>Reset</button>
      </div>
    </header>
    <section className=${`guide glass ${next === "cut" ? "danger" : ""} ${next ? "" : "complete"}`}>
      <div className="g-n">${next ? html`Next<b>${stepNo}<small>/${JSTEPS.length}</small></b>` : html`Done<b>✓</b>`}</div>
      <div className="g-body"><b>${next ? LABEL[next] : "Journey complete"}</b>
        <span>${next ? EXPLAIN[next] : "Every step ran for real. The Freedom Proof records what was executed, and what was not tested."}${needsTraffic ? " Start the traffic below first to watch it happen under load." : ""}</span></div>
      ${next ? html`<button className=${`btn ${next === "cut" ? "danger" : ""}`} type="button" disabled=${disabled} onClick=${run}>${disabled ? "Running…" : `${LABEL[next]} →`}</button>`
        : html`<a className="btn" href="/api/demo/proof" target="_blank" rel="noopener">Open the Freedom Proof →</a>`}
    </section>
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
// RISE AGENT — chat that explains RISE and operates it (validated actions only, never keys)
// =====================================================================================
const SUGGEST = {
  "/": ["How does RISE work?", "Analyze github.com/ucapistranmtz/s3PresignedUrl_v3", "Add my Leaseweb Object Storage"],
  "/connect": ["Test all my connections", "Add my Leaseweb Object Storage", "Why did this connection fail?"],
  "/demo": ["What happens in the live switch?", "What does the source cut prove?"],
  analysis: ["Explain this result", "What should I change in my code?", "Is this ready to migrate?"],
};
const secs = (ms) => (ms == null ? "" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

function AgentResult({ r }) {
  if (!r) return null;
  if (r.error) return html`<div className="ag-res bad">${r.error}</div>`;
  if (r.checks) return html`<div className=${`ag-res ${r.ok ? "ok" : "bad"}`}><b>${r.connection} · ${r.ok ? "connected" : "failed"}</b>
    ${r.checks.map((k) => html`<div key=${k.id}>${k.status === "pass" ? "✓" : k.status === "fail" ? "✗" : "·"} ${k.label}${k.ms != null ? ` · ${k.ms} ms` : ""}${k.hint ? html`<div className="hint">${k.hint}</div>` : ""}</div>`)}</div>`;
  if (r.connections) return html`<div className="ag-res">${r.connections.map((c) => html`<div key=${c.name}>${c.ok ? "✓" : "✗"} ${c.name}</div>`)}</div>`;
  if (r.analysis_id) return html`<div className="ag-res ok">Analysis ${r.analysis_id} started</div>`;
  return null;
}

function Agent({ path, go, onClose, openAdd, reloadConns, ask }) {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hi, I'm the RISE agent. I can explain how RISE works, add and test your storage connections, and run analyses for you. What do you want to check?" }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const end = useRef();
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, busy, collapsed]);
  const send = async (q) => {
    q = q.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user", content: q }];
    setMsgs(next); setText(""); setBusy(true); setCollapsed(false);
    try {
      const r = await api("/api/agent", "POST", { messages: next.map(({ role, content }) => ({ role, content })), page: path });
      setMsgs((m) => [...m, { role: "assistant", content: r.reply, result: r.result, ms: r.ai?.ms }]);
      const res = r.result || {};
      if (res.open_add_connection) openAdd(res.open_add_connection);
      if (res.navigate) go(res.navigate);
      if (res.checks || res.connections) reloadConns();
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", content: e.message, error: true }]);
    } finally { setBusy(false); }
  };
  useEffect(() => { if (ask && Date.now() - ask._t < 3000) send(ask.q); }, [ask?._t]);  // only fresh questions, not on re-open
  const sugg = SUGGEST[path.startsWith("/a/") ? "analysis" : path] || SUGGEST["/"];
  const fresh = msgs.length === 1 && !busy;
  if (collapsed) return html`<aside className="agent glass collapsed" aria-label="RISE agent">
    <button type="button" className="ag-rail" onClick=${() => setCollapsed(false)} aria-expanded="false" title="Open RISE agent">
      <img src="/static/brand/rise-icon.svg" alt="" className=${busy ? "busy" : ""} />
    </button>
  </aside>`;
  return html`<aside className="agent glass" aria-label="RISE agent">
    <div className="ag-h">
      <span className=${`ag-dot${busy ? " busy" : ""}`}></span><b>RISE agent</b>
      ${busy && html`<span className="ag-status">Thinking</span>`}
      <span className="grow"></span>
      <button type="button" className="ag-ico" onClick=${() => setCollapsed(true)} aria-label="Collapse">
        <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg></button>
      <button type="button" className="ag-ico x" onClick=${onClose} aria-label="Close">×</button>
    </div>
    <div className="ag-body">
        ${msgs.map((m, i) => html`<div key=${i} className=${`msg ${m.role} ${m.error ? "err" : ""}`}>
          <div className="bubble-t">${m.content}</div><${AgentResult} r=${m.result} />
          ${m.ms != null && html`<div className="ag-ms">${secs(m.ms)}</div>`}</div>`)}
        ${busy && html`<div className="think" role="status"><span className="ag-dot busy"></span>Thinking</div>`}
        ${fresh && html`<div className="ag-sugg">${sugg.map((s) => html`<button key=${s} type="button" title=${s} onClick=${() => send(s)}>${s}</button>`)}</div>`}
        <div ref=${end}></div>
      </div>
      <div className="ag-compose">
        <form className="ag-in" onSubmit=${(e) => { e.preventDefault(); send(text); }}>
          <input value=${text} onInput=${(e) => setText(e.target.value)} placeholder="Ask or tell RISE what to do…" aria-label="Message the RISE agent" />
          <button className="btn sm" type="submit" disabled=${busy || !text.trim()}>Send</button>
        </form>
        <div className="ag-foot">Never paste keys here. RISE opens a form for them and stores them encrypted.</div>
      </div>
  </aside>`;
}

// =====================================================================================
function App() {
  const [path, go] = useRoute();
  const tick = useTick();
  const [recent, setRecent] = useState([]);
  const [conns, setConns] = useState(null);
  const [agentOpen, setAgentOpen] = useState(localStorage.getItem("rise.agent") !== "0");
  const [prefill, setPrefill] = useState(null);
  const [ask, setAsk] = useState(null);
  const askAgent = useCallback((q) => { setAgentOpen(true); localStorage.setItem("rise.agent", "1"); setAsk({ q, _t: Date.now() }); }, []);
  const toggleAgent = useCallback(() => setAgentOpen((o) => { localStorage.setItem("rise.agent", o ? "0" : "1"); return !o; }), []);
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); toggleAgent(); } };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [toggleAgent]);
  const [demo, setDemo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(null);
  const [toastMsg, setToast] = useState(null);
  const toastTimer = useRef();
  const toast = useCallback((m) => { setToast(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 6000); }, []);
  const reloadConns = useCallback(() => api("/api/connections").then(setConns, (e) => toast(e.message)), [toast]);

  useEffect(() => {
    api("/api/analyses").then(setRecent, () => {});
    if (path === "/" || path === "/connect") reloadConns();
    if (path === "/demo") api("/api/demo/state").then(setDemo, (e) => toast(e.message));
  }, [tick, path, toast, reloadConns]);

  const act = useCallback(async (action) => {
    setBusy(true);
    try { setDemo(await api(`/api/demo/${action}`, "POST")); return true; } catch (e) { toast(e.message); return false; } finally { setBusy(false); }
  }, [toast]);

  let page;
  if (path === "/demo") page = demo ? html`<${Demo} S=${demo} act=${act} busy=${busy} view=${view} setView=${setView} />` : html`<${Empty}>Connecting…<//>`;
  else if (path === "/replay") page = html`<${Replay} toast=${toast} conns=${conns} reload=${reloadConns} />`;
  else if (path === "/connect") page = html`<${Connections} toast=${toast} conns=${conns} reload=${reloadConns} prefill=${prefill} />`;
  else if (path.startsWith("/c/")) page = html`<${Compare} id=${path.slice(3)} recent=${recent} go=${go} />`;
  else if (path.startsWith("/a/")) page = html`<${Analysis} id=${path.slice(3)} tick=${tick} go=${go} onAsk=${askAgent} />`;
  else page = html`<${Home} go=${go} toast=${toast} recent=${recent} conns=${conns} />`;

  const next = demo && SEQUENCE.find(([, done]) => !done(demo))?.[0];
  return html`<${Fragment}>
    <div className=${`shell${agentOpen ? " with-agent" : ""}`}>
      <${Sidebar} path=${path} go=${go} recent=${path === "/demo" ? null : recent} agentOpen=${agentOpen} onAgent=${toggleAgent}>
        ${path === "/demo" && demo && html`<${JourneyNav} S=${demo} next=${next} view=${view || STEP_OF[next] || next} setView=${setView} />`}
      <//>
      <main>${page}</main>
      ${agentOpen && html`<${Agent} path=${path} go=${go} onClose=${toggleAgent} reloadConns=${reloadConns} ask=${ask}
        openAdd=${(f) => setPrefill({ fields: f, _t: Date.now() })} />`}
    </div>
    <div className=${`toast ${toastMsg ? "on" : ""}`} role="status" aria-live="polite">${toastMsg}</div>
  <//>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
