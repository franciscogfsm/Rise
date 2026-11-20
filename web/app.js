// RISE dashboard. Everything rendered here comes from /api/state (real backend state); nothing is animated on a timer.
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const short = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "—");
const time = (ts) => (ts ? ts.slice(11, 19) : "");

const STEPS = [
  ["connect", "Connect"], ["discover", "Discover"], ["analyze", "Analyze"], ["challenge", "Challenge"],
  ["adapt", "Adapt"], ["verify", "Verify"], ["switch", "Switch"], ["prove", "Prove"],
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

let S = null, busy = false, prevRes = {};

async function api(path, method = "GET") {
  const r = await fetch(path, { method, cache: "no-store" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.detail || `${r.status} ${r.statusText}`);
  return body;
}
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 6000); }

async function act(action) {
  if (busy) return;
  busy = true; render();
  try { S = await api(`/api/${action}`, "POST"); }
  catch (e) { toast(e.message); }
  finally { busy = false; await refresh(); }
}
async function refresh() { try { S = await api("/api/state"); render(); } catch (e) { toast(`RISE server unreachable: ${e.message}`); } }

const nextAction = () => (S ? SEQUENCE.find(([, done]) => !done(S)) : null);
const pill = (cls, text) => `<span class="pill ${cls}">${esc(text)}</span>`;
const stepPill = (st) => ({ done: pill("ok", "Done"), skipped: pill("ok", "Not needed"), attention: pill("bad", "Attention"),
  fail: pill("bad", "Failed"), running: pill("run", "Running") }[st] || pill("idle", "Waiting"));
const button = (action, text, cls = "ghost sm") => `<button class="btn ${cls}" data-act="${action}" type="button" ${busy || S?.busy ? "disabled" : ""}>${esc(text)}</button>`;
const head = (n, title, st, extra = "") => `<div class="ph"><span class="eyebrow">${n}</span><h2>${esc(title)}</h2><span class="grow"></span>${extra}${st !== undefined ? stepPill(st) : ""}</div>`;

function render() {
  if (!S) return;
  const nxt = nextAction();
  $("nav").innerHTML = STEPS.map(([k, l], i) =>
    `<a class="nav ${nxt && (nxt[0] === k || (nxt[0] === "cut" && k === "switch")) ? "next" : ""}" data-s="${esc(S.steps[k])}" href="#p-${k === "connect" ? "discover" : k === "switch" ? "switch" : k === "prove" ? "proof" : k}">
      <span class="n">${String(i + 1).padStart(2, "0")}</span><span>${l}</span><span class="d"></span></a>`).join("");
  const ai = S.ai;
  $("foot").innerHTML = `<span>run <b>${esc(S.run_id)}</b></span><span>AI <b>${esc(ai.model)}</b> ${ai.configured ? "" : "· <span style='color:var(--warn)'>no key</span>"}</span>
    <span>route → <b>${esc(S.active)}</b></span>`;
  const nb = $("next");
  nb.disabled = busy || S.busy || !nxt;
  nb.textContent = busy || S.busy ? "Running…" : nxt ? `${LABEL[nxt[0]]} →` : "Journey complete ✓";
  nb.dataset.act = nxt ? nxt[0] : "";
  $("reset").disabled = busy || S.busy;
  renderProviders(); renderDiscover(); renderAnalyze(); renderChallenge(); renderAdapt(); renderVerify(); renderSwitch(); renderProof(); renderLog();
}

function renderProviders() {
  for (const p of S.providers) {
    const el = $(`prov-${p.id}`), h = S.health?.[p.id], cfg = S.app_config[p.id];
    const isSrc = p.id === "source", cut = isSrc && S.link_up === false, active = S.active === p.id;
    let status = h?.ok ? pill("ok", "Online") : h ? pill("bad", "Unreachable") : pill("idle", "Unknown");
    if (cut) status = pill("bad", "Disconnected");
    else if (active) status = pill("live", "Serving the app");
    else if (!isSrc && S.migration?.ok) status = pill("ok", "Verified");
    else if (!isSrc) status = pill("idle", "Standby");
    el.className = `prov glass ${cut ? "dim" : ""} ${active ? "active" : ""}`;
    el.innerHTML = `<div class="top"><span class="eyebrow">${isSrc ? "Source" : "Destination"}</span>${p.simulated ? '<span class="sim">simulated</span>' : ""}</div>
      <div class="name">${esc(p.name)}</div>
      <div class="meta">endpoint <b>${esc(isSrc ? p.app_endpoint : p.endpoint)}</b><br>provider region <b>${esc(p.documented_region)}</b> · bucket <b>${esc(p.bucket)}</b><br>
      app signs with <b>${esc(cfg.region)}</b> · ${esc(cfg.addressing_style)}-style</div>${status}`;
  }
  const cut = S.link_up === false;
  $("route").className = `route ${cut ? "cut" : ""}`;
  $("route-lbl").textContent = cut ? "source link cut" : S.active === "destination" ? "app → destination" : "app → source";
}

function renderDiscover() {
  const p = S.profile, ops = Object.entries(p.operations), feats = Object.keys(p.features);
  $("p-discover").innerHTML = head("02 · DISCOVER", "Observed behaviour", S.steps.discover, button("discover", "Observe app")) +
    (p.observed_calls ? `<div class="kpis"><div class="kpi"><div class="v">${p.observed_calls}</div><div class="l">real S3 calls captured</div></div>
      <div class="kpi"><div class="v">${ops.length}</div><div class="l">operations</div></div><div class="kpi"><div class="v">${feats.length}</div><div class="l">behaviours</div></div></div>
      <div class="tw"><table><thead><tr><th>Operation</th><th>Calls</th></tr></thead><tbody>${ops.sort((a, b) => b[1] - a[1]).map(([o, n]) => `<tr><td class="mono">${esc(o)}</td><td class="mono">${n}</td></tr>`).join("")}</tbody></table></div>
      <div class="chips">${feats.map((f) => `<span class="chip">${esc(f)}</span>`).join("")}</div>
      <div class="muted mono">content types: ${esc(p.content_types.join(", ") || "—")} · metadata keys: ${esc(p.metadata_keys.join(", ") || "—")}</div>`
      : `<p class="empty">RISE instruments asset-service's S3 SDK client and records every call it makes. Run “Observe app”.</p>`);
}

function renderAnalyze() {
  const pl = S.plan;
  const src = pl?.source;
  const badge = src ? `<span class="src-badge ${esc(src.mode)}">${src.mode === "live" ? `LIVE · ${esc(src.model)} · ${src.ms} ms` : src.mode === "cached" ? `CACHED AI RESULT · from ${esc(src.at)}` : "RULE-BASED FALLBACK"}</span>` : "";
  $("p-analyze").innerHTML = head("03 · ANALYZE", "AI-generated test plan", S.steps.analyze, badge + button("analyze", "Generate")) + (pl ? `
    <p class="summary">${esc(pl.summary)}</p>
    ${src.live_error ? `<div class="note">Live AI call failed: ${esc(src.live_error)}</div>` : ""}
    ${(pl.validator || []).map((n) => `<div class="note">validator · ${esc(n)}</div>`).join("")}
    <div>${pl.tests.map((t) => `<div class="test new"><span class="id">${esc(t.id)}</span><div><b>${esc(t.title)}</b> <span class="chip">${esc(t.kind)}</span> <span class="origin">${esc(t.origin)}</span><div class="why">${esc(t.rationale)}</div></div></div>`).join("")}</div>
    ${pl.risks?.length ? `<div><div class="eyebrow" style="margin:6px 0">Risks the AI flagged (tests decide)</div>${pl.risks.map((r) => `<div class="risk"><span class="sev ${esc(r.severity)}">${esc(r.severity)}</span><div><b>${esc(r.title)}</b><div class="why muted">${esc(r.detail)}</div></div></div>`).join("")}</div>` : ""}`
    : `<p class="empty">The AI reads the observed profile and writes a structured plan using only RISE's executable test catalogue. RISE validates it before anything runs.</p>`);
}

function resCell(r, key) {
  if (!r) return `<span class="res untested">UNTESTED</span>`;
  const changed = prevRes[key] && prevRes[key] !== r.status;
  prevRes[key] = r.status;
  const e = r.error, failed = (r.checks || []).filter((c) => !c.ok);
  return `<span class="res ${esc(r.status)} ${changed ? "flash" : ""}">${esc(r.status.toUpperCase())}</span> <span class="muted mono">${r.ms} ms</span>
    ${e ? `<div class="err">${esc(e.code)}${e.status ? ` · HTTP ${e.status}` : ""} · ${esc(e.message)}</div>` : ""}
    ${failed.map((c) => `<div class="err">${esc(c.name)}: expected ${esc(JSON.stringify(c.expected))}, got ${esc(JSON.stringify(c.actual))}</div>`).join("")}`;
}

function renderChallenge() {
  const R = S.results, tests = S.plan?.tests || [];
  const by = (pid) => Object.fromEntries((R?.[pid] || []).map((r) => [r.test_id, r]));
  const src = by("source"), dst = by("destination");
  const passed = R ? R.destination.filter((r) => r.status === "pass").length : 0;
  $("p-challenge").innerHTML = head("04 · CHALLENGE", "Same tests, both providers", S.steps.challenge, button("challenge", "Run")) + (R ? `
    <div class="kpis"><div class="kpi"><div class="v">${passed}/${R.destination.length}</div><div class="l">passed on destination</div></div>
    <div class="kpi"><div class="v">${R.source.filter((r) => r.status === "pass").length}/${R.source.length}</div><div class="l">passed on source</div></div></div>
    <div class="tw"><table><thead><tr><th>Test</th><th>Source</th><th>Destination</th></tr></thead><tbody>
    ${tests.map((t) => `<tr class="${dst[t.id] && dst[t.id].status !== "pass" ? "bad" : ""}"><td><b>${esc(t.title)}</b><div class="mono muted">${esc(t.id)} · ${esc(t.kind)}</div></td>
      <td>${resCell(src[t.id], `s:${t.id}`)}</td><td>${resCell(dst[t.id], `d:${t.id}`)}</td></tr>`).join("")}
    </tbody></table></div>` : `<p class="empty">Deterministic code runs every planned test on both providers with synthetic data and decides pass, fail or unsupported from checks on the real bytes. A matching HTTP status alone never counts as a pass.</p>`);
}

function renderAdapt() {
  const a = S.adaptation, p = a?.proposal;
  $("p-adapt").innerHTML = head("05 · ADAPT", "Constrained adaptation", S.steps.adapt, button("adapt", "Adapt")) + (p ? `
    <span class="src-badge ${esc(p.source.mode)}">${p.source.mode === "live" ? `LIVE · ${esc(p.source.model)} · ${p.source.ms} ms` : "RULE-BASED FALLBACK"}</span>
    <p class="summary">${esc(p.diagnosis)}</p>
    ${a.applied ? `<div class="diff"><span class="minus">−</span><span class="minus">${esc(p.key)} = ${esc(a.before[p.key])}</span><span class="plus">+</span><span class="plus">${esc(p.key)} = ${esc(p.value)}</span></div>
      <div class="muted mono">allowed keys only: region · addressing_style · confidence ${esc(p.confidence)}</div>
      ${a.retest ? `<div>${pill(a.retest.passed === a.retest.total ? "ok" : "bad", `Retest ${a.retest.passed}/${a.retest.total} passed`)}</div>` : ""}` : ""}
    ${p.source.live_error ? `<div class="note">Live AI call failed: ${esc(p.source.live_error)}</div>` : ""}`
    : S.steps.adapt === "skipped" ? `<p class="empty">No incompatibility found, so nothing to adapt.</p>`
    : `<p class="empty">When a test fails, the AI may propose one change to the app's S3 client settings, from an allow-list. RISE applies it only to the destination and retests everything.</p>`);
}

function renderVerify() {
  const m = S.migration;
  $("p-verify").innerHTML = head("06 · VERIFY", "Data copied & verified", S.steps.verify, button("verify", "Copy & verify")) + (m ? `
    <div class="kpis"><div class="kpi"><div class="v">${m.objects.filter((o) => o.match).length}/${m.objects.length}</div><div class="l">objects with matching SHA-256</div></div></div>
    <div class="tw"><table><thead><tr><th>Object</th><th>Bytes</th><th>SHA-256 source → destination</th><th></th></tr></thead><tbody>
    ${m.objects.map((o) => `<tr><td class="mono">${esc(o.key)}</td><td class="mono">${o.size}</td><td class="mono">${short(o.sha256_source)}<br>${short(o.sha256_destination)}</td>
      <td>${o.match && o.metadata_match ? pill("ok", "match") : pill("bad", "mismatch")}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="empty">RISE copies the app's objects to the destination, reads them back, and compares SHA-256 hashes of the actual bytes. ETags are not used as hashes.</p>`);
}

function renderSwitch() {
  const sw = S.switch, c = S.cut, l = S.live;
  $("p-switch").innerHTML = head("07 · SWITCH", "Switch, cut, prove", S.steps.switch) + `
    <div class="row-btns">${button("switch", "Switch to destination", "sm")}${S.link_up === false ? button("restore", "Restore source") : button("cut", "Cut the source", "danger sm")}${button("prove", "Prove a new operation", "sm")}</div>
    <dl class="kv">
      <dt>app route</dt><dd>${esc(S.active)}${sw ? ` · since ${time(sw.at)}` : ""}</dd>
      ${sw ? `<dt>first read</dt><dd>${esc(sw.probe.key)} · ${esc(sw.probe.provider)} · req ${esc(sw.probe.request_id)}</dd>` : ""}
      ${c ? `<dt>source TCP</dt><dd class="${c.tcp_probe.reachable ? "" : "badc"}">${esc(c.tcp_probe.result)}</dd><dt>app → source</dt><dd class="badc">${esc(c.app_probe.result)}</dd>` : ""}
      ${l ? `<dt>new object</dt><dd>${esc(l.key)}</dd><dt>served by</dt><dd class="okc">${esc(l.provider)} · put ${esc(l.put_request_id)} · get ${esc(l.get_request_id)}</dd>
        <dt>sha256</dt><dd class="${l.match ? "okc" : "badc"}">${short(l.sha256_written)} ${l.match ? "= written ✓" : "≠ written"}</dd>` : ""}
    </dl>`;
}

function renderProof() {
  const ready = S.steps.prove === "done";
  const tr = S.trace.slice(-6).reverse();
  $("p-proof").innerHTML = head("08 · PROVE", "RISE Freedom Proof", S.steps.prove, `<a class="btn ghost sm" href="/api/proof" target="_blank" rel="noopener">Open evidence JSON</a>`) +
    `<p class="summary">${ready ? "Everything below was executed in this run. The proof records the tests, what changed, the integrity checks, the switch, the source cut and the new operation. It also lists what was <b>not</b> tested." :
      "The proof is built only from recorded events: observed calls, tests and their request IDs, changes applied, hashes, the switch and the source cut. It is not a certificate of universal safety."}</p>
    <div class="eyebrow">Pitch assets served through asset-service</div>
    ${tr.length ? `<div class="tw"><table><tbody>${tr.map((t) => `<tr><td class="mono">${time(t.ts)}</td><td class="mono">${esc(t.key)}</td><td>${t.ok ? pill(t.provider === "destination" ? "live" : "idle", t.provider) : pill("bad", t.error)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="empty">No pitch requests yet.</p>`}`;
}

function renderLog() {
  $("p-log").innerHTML = head("LOG", "Events", undefined) +
    `<div class="log">${S.events.slice().reverse().map((e) => `<div class="ev ${esc(e.kind)}"><span class="t">${time(e.ts)}</span><span>${esc(e.msg)}</span></div>`).join("") || '<p class="empty">No events yet.</p>'}</div>`;
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (b && b.dataset.act && !b.disabled) act(b.dataset.act);
});
$("reset").addEventListener("click", () => act("reset"));

refresh();
const es = new EventSource("/api/events");
let pending;
es.onmessage = () => { clearTimeout(pending); pending = setTimeout(refresh, 80); };
