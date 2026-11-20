// RISE dashboard — React 18 + htm (no build step; vendored in web/vendor so it works offline).
// Everything rendered comes from /api/state (real backend state); nothing is animated on a timer.
const { useState, useEffect, useCallback, Fragment } = React;
const html = htm.bind(React.createElement);

const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "—");
const time = (ts) => (ts ? ts.slice(11, 19) : "");

const STEPS = [
  ["connect", "Connect", "p-discover"], ["discover", "Discover", "p-discover"], ["analyze", "Analyze", "p-analyze"],
  ["challenge", "Challenge", "p-challenge"], ["adapt", "Adapt", "p-adapt"], ["verify", "Verify", "p-verify"],
  ["switch", "Switch", "p-switch"], ["prove", "Prove", "p-proof"],
];
// the demo sequence (CUT sits between SWITCH and PROVE)
const SEQUENCE = [
  ["discover", (s) => s.steps.discover === "done"],
  ["analyze", (s) => s.steps.analyze === "done"],
  ["challenge", (s) => ["done", "attention"].includes(s.steps.challenge)],
  ["adapt", (s) => ["done", "skipped"].includes(s.steps.adapt)],
  ["verify", (s) => s.steps.verify === "done"],
  ["switch", (s) => s.steps.switch === "done"],
  ["cut", (s) => !!s.cut],
  ["prove", (s) => s.steps.prove === "done"],
];
const LABEL = { discover: "Observe the app", analyze: "Generate tests with AI", challenge: "Run the challenge", adapt: "Adapt & retest",
  verify: "Copy & verify data", switch: "Switch to destination", cut: "Cut the source", prove: "Prove a new operation" };

async function api(path, method = "GET") {
  const r = await fetch(path, { method, cache: "no-store" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.detail || `${r.status} ${r.statusText}`);
  return body;
}

// ---------- small pieces ----------
const Pill = ({ cls, children }) => html`<span className=${`pill ${cls}`}>${children}</span>`;
const STEP_PILL = { done: ["ok", "Done"], skipped: ["ok", "Not needed"], attention: ["bad", "Attention"], fail: ["bad", "Failed"], running: ["run", "Running"] };
const StepPill = ({ st }) => { const [c, t] = STEP_PILL[st] || ["idle", "Waiting"]; return html`<${Pill} cls=${c}>${t}<//>`; };

function Btn({ action, children, cls = "ghost sm", ctx }) {
  return html`<button className=${`btn ${cls}`} type="button" disabled=${ctx.disabled} onClick=${() => ctx.act(action)}>${children}</button>`;
}

function Head({ n, title, st, children }) {
  return html`<div className="ph"><span className="eyebrow">${n}</span><h2>${title}</h2><span className="grow"></span>${children}${st !== undefined && html`<${StepPill} st=${st} />`}</div>`;
}

function SourceBadge({ src }) {
  if (!src) return null;
  const text = src.mode === "live" ? `LIVE · ${src.model} · ${src.ms} ms`
    : src.mode === "cached" ? `CACHED AI RESULT · from ${src.at}` : "RULE-BASED FALLBACK";
  return html`<span className=${`src-badge ${src.mode}`}>${text}</span>`;
}

const Empty = ({ children }) => html`<p className="empty">${children}</p>`;

// ---------- layout ----------
function stepDetail(k, S) {
  const pl = S.plan, R = S.results, a = S.adaptation, m = S.migration, pass = (pid) => R[pid].filter((r) => r.status === "pass").length;
  switch (k) {
    case "connect": return S.health ? `${["source", "destination"].filter((p) => S.health[p]?.ok).length}/2 providers reachable` : "checking…";
    case "discover": return S.profile.observed_calls ? `${S.profile.observed_calls} real calls · ${Object.keys(S.profile.operations).length} operations` : "observe the app";
    case "analyze": return pl ? `${pl.tests.length} tests · ${pl.source.mode === "live" ? `AI live ${(pl.source.ms / 1000).toFixed(1)} s` : pl.source.mode}` : "AI writes the tests";
    case "challenge": return R ? `destination ${pass("destination")}/${R.destination.length} · source ${pass("source")}/${R.source.length}` : "run on both providers";
    case "adapt": return S.steps.adapt === "skipped" ? "not needed" : a?.applied ? `${a.proposal.key} → ${a.proposal.value}` : a ? "no safe change" : "fix what fails";
    case "verify": return m ? `${m.objects.filter((o) => o.match).length}/${m.objects.length} SHA-256 match` : "copy & hash the data";
    case "switch": return S.active === "destination" ? (S.link_up === false ? "on destination · source cut" : "on destination") : "route: source";
    case "prove": return S.live ? `new object on ${S.live.provider} ${S.live.match ? "✓" : "✗"}` : "freedom proof";
    default: return "";
  }
}

function Ring({ done, total }) {
  const r = 26, c = 2 * Math.PI * r;
  return html`<svg className="ring" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r=${r} className="ring-bg" />
    <circle cx="32" cy="32" r=${r} className="ring-fg" strokeDasharray=${c} strokeDashoffset=${c * (1 - done / total)} />
  </svg>`;
}

const Dot = ({ cls }) => html`<span className=${`sdot ${cls}`}></span>`;

function Sidebar({ S, next }) {
  const done = STEPS.filter(([k]) => ["done", "skipped"].includes(S.steps[k])).length;
  const nextKey = next === "cut" ? "switch" : next;
  const T = S.traffic, src = S.plan?.source;
  const avail = T.total ? (100 * (T.total - T.failed) / T.total) : 100;
  return html`<aside className="side glass" aria-label="Journey">
    <div className="brand"><img src="/static/brand/rise-icon.svg" alt="" />
      <div><div className="wm">RISE</div><div className="tag">Proof of Cloud Freedom</div></div></div>

    <div className="progress">
      <div className="ring-wrap"><${Ring} done=${done} total=${STEPS.length} /><span className="ring-n">${done}<small>/${STEPS.length}</small></span></div>
      <div><div className="p-title">${done === STEPS.length ? "Freedom proven" : `${done} of ${STEPS.length} verified`}</div>
        <div className="p-sub">${next ? `Next · ${LABEL[next]}` : "Every step backed by evidence"}</div></div>
    </div>

    <ol className="steps">${STEPS.map(([k, l, anchor], i) => {
      const st = S.steps[k];
      const state = ["done", "skipped"].includes(st) ? "done" : ["attention", "fail"].includes(st) ? "bad" : st === "running" ? "running" : k === nextKey ? "next" : "todo";
      return html`<li key=${k} className=${`step s-${state}`}>
        <a href=${`#${anchor}`}>
          <span className="bubble">${state === "done" ? "✓" : state === "bad" ? "!" : String(i + 1).padStart(2, "0")}</span>
          <span className="st-body"><span className="st-title">${l}</span><span className="st-detail">${stepDetail(k, S)}</span></span>
        </a></li>`;
    })}</ol>

    <div className="sys">
      <div className="sys-row"><${Dot} cls=${S.link_up === false ? "bad" : S.health?.source?.ok ? "ok" : "idle"} /><span>Source</span>
        <b>${S.link_up === false ? "cut" : S.active === "source" ? "serving" : "standby"}</b></div>
      <div className="sys-row"><${Dot} cls=${S.health?.destination?.ok ? (S.active === "destination" ? "live" : "ok") : "idle"} /><span>Destination</span>
        <b>${S.active === "destination" ? "serving" : S.migration?.ok ? "verified" : "standby"}</b></div>
      <div className="sys-row"><${Dot} cls=${S.ai.configured ? "live" : "warn"} /><span>AI</span>
        <b>${S.ai.configured ? (src?.mode === "live" ? `live · ${(src.ms / 1000).toFixed(1)} s` : "ready") : "no key"}</b></div>
      <div className="sys-row"><${Dot} cls=${!T.on ? "idle" : T.failed ? "bad" : "ok"} /><span>Traffic</span>
        <b>${T.total ? `${avail.toFixed(avail === 100 ? 0 : 2)}% · ${T.failed} failed` : "off"}</b></div>
      <div className="sys-meta mono">${S.ai.model}<br />run ${S.run_id}</div>
    </div>
  </aside>`;
}

function Traffic({ S, ctx }) {
  const T = S.traffic, pts = T.points;
  const at = (ts) => { const i = pts.findIndex((p) => p.ts >= ts); return i < 0 ? null : (i / Math.max(pts.length, 1)) * 100; };
  const markers = [];
  if (S.switch) markers.push(["switch", at(S.switch.at), "switch"]);
  if (S.cut) markers.push(["cut", at(S.cut.at), "source cut"]);
  if (S.cut?.restored_at) markers.push(["restore", at(S.cut.restored_at), "restored"]);
  const maxMs = Math.max(60, ...pts.map((p) => p.ms));
  return html`<section className="panel glass w12 traffic" id="p-traffic">
    <${Head} n="LIVE" title="Real user traffic through asset-service">
      ${T.on ? html`<${Pill} cls="run">streaming<//>` : null}
      <button className=${`btn sm ${T.on ? "ghost" : ""}`} type="button" onClick=${() => ctx.act(T.on ? "traffic_off" : "traffic_on")}>${T.on ? "Stop traffic" : "Start live traffic"}</button>
    <//>
    <div className="t-wrap">
      <div className="kpis t-kpis">
        <div className="kpi"><div className="v">${T.total}</div><div className="l">real requests</div></div>
        <div className="kpi"><div className=${`v ${T.failed ? "bad-t" : ""}`}>${T.failed}</div><div className="l">failed</div></div>
        <div className="kpi"><div className=${`v ${S.switch && !T.failed_after_switch ? "ok-t" : ""}`}>${S.switch ? T.failed_after_switch : "—"}</div><div className="l">failed since switch</div></div>
        <div className="kpi"><div className="v">${T.p50_ms ?? "—"}<small>${T.p50_ms != null ? " ms" : ""}</small></div><div className="l">p50 latency</div></div>
      </div>
      <div className="bars-box">
        <div className="bars">${pts.length ? pts.map((p, i) => html`<i key=${i} title=${`${p.ts.slice(11, 23)} · ${p.provider} · ${p.ok ? `${p.ms} ms` : p.error}`}
            className=${p.ok ? p.provider : "fail"} style=${{ height: p.ok ? `${18 + 82 * Math.min(1, p.ms / maxMs)}%` : "100%" }}></i>`)
          : html`<span className="empty">Start live traffic: RISE sends a real GET every 300 ms through the app's storage router, so the switch and the cut happen under load.</span>`}</div>
        ${markers.filter(([, x]) => x !== null).map(([k, x, label]) => html`<div key=${k} className=${`mark m-${k}`} style=${{ left: `${x}%` }}><span>${label}</span></div>`)}
        <div className="legend mono"><span><i className="source"></i>source</span><span><i className="destination"></i>destination</span><span><i className="fail"></i>failed</span><span className="muted">bar height = latency · last ${pts.length} requests</span></div>
      </div>
    </div>
  </section>`;
}

function Providers({ S }) {
  const cut = S.link_up === false;
  return html`<section className="providers" aria-label="Providers">
    ${S.providers.map((p, i) => {
      const h = S.health?.[p.id], cfg = S.app_config[p.id], isSrc = p.id === "source";
      const dim = isSrc && cut, active = S.active === p.id;
      let status = h?.ok ? ["ok", "Online"] : h ? ["bad", "Unreachable"] : ["idle", "Unknown"];
      if (dim) status = ["bad", "Disconnected"];
      else if (active) status = ["live", "Serving the app"];
      else if (!isSrc) status = S.migration?.ok ? ["ok", "Verified"] : ["idle", "Standby"];
      const card = html`<div key=${p.id} className=${`prov glass ${dim ? "dim" : ""} ${active ? "active" : ""}`}>
        <div className="top"><span className="eyebrow">${isSrc ? "Source" : "Destination"}</span>${p.simulated && html`<span className="sim">simulated</span>`}</div>
        <div className="name">${p.name}</div>
        <div className="meta">endpoint <b>${isSrc ? p.app_endpoint : p.endpoint}</b><br />
          provider region <b>${p.documented_region}</b> · bucket <b>${p.bucket}</b><br />
          app signs with <b>${cfg.region}</b> · ${cfg.addressing_style}-style</div>
        <${Pill} cls=${status[0]}>${status[1]}<//>
      </div>`;
      return i === 0 ? html`<${Fragment} key="src">${card}
        <div className=${`route ${cut ? "cut" : ""}`}><div className="wire"></div>
          <div className="lbl">${cut ? "source link cut" : S.active === "destination" ? "app → destination" : "app → source"}</div></div><//>` : card;
    })}
  </section>`;
}

// ---------- panels ----------
function Discover({ S, ctx }) {
  const p = S.profile, ops = Object.entries(p.operations).sort((a, b) => b[1] - a[1]), feats = Object.keys(p.features);
  return html`<section className="panel glass w5" id="p-discover">
    <${Head} n="02 · DISCOVER" title="Observed behaviour" st=${S.steps.discover}><${Btn} action="discover" ctx=${ctx}>Observe app<//><//>
    ${p.observed_calls ? html`
      <div className="kpis">
        <div className="kpi"><div className="v">${p.observed_calls}</div><div className="l">real S3 calls captured</div></div>
        <div className="kpi"><div className="v">${ops.length}</div><div className="l">operations</div></div>
        <div className="kpi"><div className="v">${feats.length}</div><div className="l">behaviours</div></div>
      </div>
      <div className="tw"><table><thead><tr><th>Operation</th><th>Calls</th></tr></thead>
        <tbody>${ops.map(([o, n]) => html`<tr key=${o}><td className="mono">${o}</td><td className="mono">${n}</td></tr>`)}</tbody></table></div>
      <div className="chips">${feats.map((f) => html`<span key=${f} className="chip">${f}</span>`)}</div>
      <div className="muted mono">content types: ${p.content_types.join(", ") || "—"} · metadata keys: ${p.metadata_keys.join(", ") || "—"}</div>`
    : html`<${Empty}>RISE instruments asset-service's S3 SDK client and records every call it makes. Run “Observe app”.<//>`}
  </section>`;
}

function Analyze({ S, ctx }) {
  const pl = S.plan;
  return html`<section className="panel glass w7" id="p-analyze">
    <${Head} n="03 · ANALYZE" title="AI-generated test plan" st=${S.steps.analyze}><${SourceBadge} src=${pl?.source} /><${Btn} action="analyze" ctx=${ctx}>Generate<//><//>
    ${pl ? html`
      <p className="summary">${pl.summary}</p>
      ${pl.source.live_error && html`<div className="note">Live AI call failed: ${pl.source.live_error}</div>`}
      ${(pl.validator || []).map((n, i) => html`<div key=${i} className="note">validator · ${n}</div>`)}
      <div>${pl.tests.map((t) => html`<div key=${t.id} className="test new"><span className="id">${t.id}</span>
        <div><b>${t.title}</b> <span className="chip">${t.kind}</span> <span className="origin">${t.origin}</span><div className="why">${t.rationale}</div></div></div>`)}</div>
      ${pl.risks?.length > 0 && html`<div><div className="eyebrow" style=${{ margin: "6px 0" }}>Risks the AI flagged (tests decide)</div>
        ${pl.risks.map((r, i) => html`<div key=${i} className="risk"><span className=${`sev ${r.severity}`}>${r.severity}</span>
          <div><b>${r.title}</b><div className="why muted">${r.detail}</div></div></div>`)}</div>`}`
    : html`<${Empty}>The AI reads the observed profile and writes a structured plan using only RISE's executable test catalogue. RISE validates it before anything runs.<//>`}
  </section>`;
}

function ResCell({ r }) {
  if (!r) return html`<span className="res untested">UNTESTED</span>`;
  const failed = (r.checks || []).filter((c) => !c.ok), e = r.error;
  // keyed by status: React remounts the badge when the result changes, which replays the flash
  return html`<${Fragment}>
    <span key=${r.status} className=${`res ${r.status} flash`}>${r.status.toUpperCase()}</span> <span className="muted mono">${r.ms} ms</span>
    ${e && html`<div className="err">${e.code}${e.status ? ` · HTTP ${e.status}` : ""} · ${e.message}</div>`}
    ${failed.map((c, i) => html`<div key=${i} className="err">${c.name}: expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.actual)}</div>`)}
  <//>`;
}

function Challenge({ S, ctx }) {
  const R = S.results, tests = S.plan?.tests || [];
  const by = (pid) => Object.fromEntries((R?.[pid] || []).map((r) => [r.test_id, r]));
  const src = by("source"), dst = by("destination");
  const count = (pid) => R[pid].filter((r) => r.status === "pass").length;
  return html`<section className="panel glass w7" id="p-challenge">
    <${Head} n="04 · CHALLENGE" title="Same tests, both providers" st=${S.steps.challenge}><${Btn} action="challenge" ctx=${ctx}>Run<//><//>
    ${R ? html`
      <div className="kpis">
        <div className="kpi"><div className="v">${count("destination")}/${R.destination.length}</div><div className="l">passed on destination</div></div>
        <div className="kpi"><div className="v">${count("source")}/${R.source.length}</div><div className="l">passed on source</div></div>
      </div>
      <div className="tw"><table><thead><tr><th>Test</th><th>Source</th><th>Destination</th></tr></thead><tbody>
        ${tests.map((t) => html`<tr key=${t.id} className=${dst[t.id] && dst[t.id].status !== "pass" ? "bad" : ""}>
          <td><b>${t.title}</b><div className="mono muted">${t.id} · ${t.kind}</div></td>
          <td><${ResCell} r=${src[t.id]} /></td><td><${ResCell} r=${dst[t.id]} /></td></tr>`)}
      </tbody></table></div>`
    : html`<${Empty}>Deterministic code runs every planned test on both providers with synthetic data and decides pass, fail or unsupported from checks on the real bytes. A matching HTTP status alone never counts as a pass.<//>`}
  </section>`;
}

function Adapt({ S, ctx }) {
  const a = S.adaptation, p = a?.proposal;
  return html`<section className="panel glass w5" id="p-adapt">
    <${Head} n="05 · ADAPT" title="Constrained adaptation" st=${S.steps.adapt}><${Btn} action="adapt" ctx=${ctx}>Adapt<//><//>
    ${p ? html`
      <div><${SourceBadge} src=${p.source} /></div>
      <p className="summary">${p.diagnosis}</p>
      ${a.applied && html`
        <div className="diff"><span className="minus">−</span><span className="minus">${p.key} = ${a.before[p.key]}</span>
          <span className="plus">+</span><span className="plus">${p.key} = ${p.value}</span></div>
        <div className="muted mono">allowed keys only: region · addressing_style · confidence ${p.confidence}</div>
        ${a.retest && html`<div><${Pill} cls=${a.retest.passed === a.retest.total ? "ok" : "bad"}>Retest ${a.retest.passed}/${a.retest.total} passed<//></div>`}`}
      ${p.source.live_error && html`<div className="note">Live AI call failed: ${p.source.live_error}</div>`}`
    : S.steps.adapt === "skipped" ? html`<${Empty}>No incompatibility found, so nothing to adapt.<//>`
    : html`<${Empty}>When a test fails, the AI may propose one change to the app's S3 client settings, from an allow-list. RISE applies it only to the destination and retests everything.<//>`}
  </section>`;
}

function Verify({ S, ctx }) {
  const m = S.migration;
  return html`<section className="panel glass w7" id="p-verify">
    <${Head} n="06 · VERIFY" title="Data copied & verified" st=${S.steps.verify}><${Btn} action="verify" ctx=${ctx}>Copy & verify<//><//>
    ${m ? html`
      <div className="kpis"><div className="kpi"><div className="v">${m.objects.filter((o) => o.match).length}/${m.objects.length}</div><div className="l">objects with matching SHA-256</div></div></div>
      <div className="tw"><table><thead><tr><th>Object</th><th>Bytes</th><th>SHA-256 source → destination</th><th></th></tr></thead><tbody>
        ${m.objects.map((o) => html`<tr key=${o.key}><td className="mono">${o.key}</td><td className="mono">${o.size}</td>
          <td className="mono">${short(o.sha256_source)}<br />${short(o.sha256_destination)}</td>
          <td>${o.match && o.metadata_match ? html`<${Pill} cls="ok">match<//>` : html`<${Pill} cls="bad">mismatch<//>`}</td></tr>`)}
      </tbody></table></div>`
    : html`<${Empty}>RISE copies the app's objects to the destination, reads them back, and compares SHA-256 hashes of the actual bytes. ETags are not used as hashes.<//>`}
  </section>`;
}

function Switch({ S, ctx }) {
  const sw = S.switch, c = S.cut, l = S.live;
  return html`<section className="panel glass w5" id="p-switch">
    <${Head} n="07 · SWITCH" title="Switch, cut, prove" st=${S.steps.switch} />
    <div className="row-btns">
      <${Btn} action="switch" cls="sm" ctx=${ctx}>Switch to destination<//>
      ${S.link_up === false ? html`<${Btn} action="restore" ctx=${ctx}>Restore source<//>` : html`<${Btn} action="cut" cls="danger sm" ctx=${ctx}>Cut the source<//>`}
      <${Btn} action="prove" cls="sm" ctx=${ctx}>Prove a new operation<//>
    </div>
    <dl className="kv">
      <dt>app route</dt><dd>${S.active}${sw ? ` · since ${time(sw.at)}` : ""}</dd>
      ${sw && html`<${Fragment}><dt>first read</dt><dd>${sw.probe.key} · ${sw.probe.provider} · req ${sw.probe.request_id}</dd><//>`}
      ${c && html`<${Fragment}><dt>source TCP</dt><dd className=${c.tcp_probe.reachable ? "" : "badc"}>${c.tcp_probe.result}</dd>
        <dt>app → source</dt><dd className="badc">${c.app_probe.result}</dd><//>`}
      ${l && html`<${Fragment}><dt>new object</dt><dd>${l.key}</dd>
        <dt>served by</dt><dd className="okc">${l.provider} · put ${l.put_request_id} · get ${l.get_request_id}</dd>
        <dt>sha256</dt><dd className=${l.match ? "okc" : "badc"}>${short(l.sha256_written)} ${l.match ? "= written ✓" : "≠ written"}</dd><//>`}
    </dl>
  </section>`;
}

function Proof({ S }) {
  const ready = S.steps.prove === "done", tr = S.trace.slice(-6).reverse();
  return html`<section className="panel glass w7" id="p-proof">
    <${Head} n="08 · PROVE" title="RISE Freedom Proof" st=${S.steps.prove}>
      <a className="btn ghost sm" href="/api/proof" target="_blank" rel="noopener">Open evidence JSON</a><//>
    <p className="summary">${ready
      ? html`Everything below was executed in this run. The proof records the tests, what changed, the integrity checks, the switch, the source cut and the new operation. It also lists what was <b>not</b> tested.`
      : "The proof is built only from recorded events: observed calls, tests and their request IDs, changes applied, hashes, the switch and the source cut. It is not a certificate of universal safety."}</p>
    <div className="eyebrow">Pitch assets served through asset-service</div>
    ${tr.length ? html`<div className="tw"><table><tbody>${tr.map((t, i) => html`<tr key=${i}><td className="mono">${time(t.ts)}</td><td className="mono">${t.key}</td>
      <td>${t.ok ? html`<${Pill} cls=${t.provider === "destination" ? "live" : "idle"}>${t.provider}<//>` : html`<${Pill} cls="bad">${t.error}<//>`}</td></tr>`)}</tbody></table></div>`
      : html`<${Empty}>No pitch requests yet.<//>`}
  </section>`;
}

function Log({ S }) {
  const ev = S.events.slice().reverse();
  return html`<section className="panel glass w5" id="p-log">
    <${Head} n="LOG" title="Events" />
    <div className="log">${ev.length ? ev.map((e) => html`<div key=${e.seq} className=${`ev ${e.kind}`}><span className="t">${time(e.ts)}</span><span>${e.msg}</span></div>`)
      : html`<${Empty}>No events yet.<//>`}</div>
  </section>`;
}

// ---------- app ----------
function App() {
  const [S, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const showError = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 6000); }, []);
  const refresh = useCallback(async () => {
    try { setS(await api("/api/state")); } catch (e) { showError(`RISE server unreachable: ${e.message}`); }
  }, [showError]);

  const act = useCallback(async (action) => {
    setBusy(true);
    try { setS(await api(`/api/${action}`, "POST")); } catch (e) { showError(e.message); }
    finally { setBusy(false); refresh(); }
  }, [refresh, showError]);

  useEffect(() => {
    refresh();
    const es = new EventSource("/api/events");
    let t;
    es.onmessage = () => { clearTimeout(t); t = setTimeout(refresh, 80); };
    return () => es.close();
  }, [refresh]);

  if (!S) return html`<main style=${{ padding: 40 }}><${Empty}>Connecting to RISE…<//></main>`;
  const next = SEQUENCE.find(([, done]) => !done(S))?.[0];
  const ctx = { act, disabled: busy || S.busy };

  return html`<${Fragment}>
    <div className="shell">
      <${Sidebar} S=${S} next=${next} />
      <main>
        <header className="head">
          <div>
            <div className="eyebrow">Cloud portability verification · S3 object storage · workload asset-service</div>
            <h1>Can asset-service run on the destination?</h1>
            <p>RISE watches the app's real storage calls, has AI turn them into tests, runs them on both providers, and switches only on evidence.</p>
          </div>
          <div className="actions">
            <button className="btn ghost" type="button" disabled=${ctx.disabled} onClick=${() => act("reset")}>Reset demo</button>
            <button className="btn" type="button" disabled=${ctx.disabled || !next} onClick=${() => act(next)}>
              ${ctx.disabled ? "Running…" : next ? `${LABEL[next]} →` : "Journey complete ✓"}</button>
          </div>
        </header>
        <${Providers} S=${S} />
        <div className="grid">
          <${Traffic} S=${S} ctx=${ctx} />
          <${Discover} S=${S} ctx=${ctx} /><${Analyze} S=${S} ctx=${ctx} />
          <${Challenge} S=${S} ctx=${ctx} /><${Adapt} S=${S} ctx=${ctx} />
          <${Verify} S=${S} ctx=${ctx} /><${Switch} S=${S} ctx=${ctx} />
          <${Proof} S=${S} /><${Log} S=${S} />
        </div>
      </main>
    </div>
    <div className=${`toast ${toast ? "on" : ""}`} role="status" aria-live="polite">${toast}</div>
  <//>`;
}

ReactDOM.createRoot(document.getElementById("root")).render(html`<${App} />`);
