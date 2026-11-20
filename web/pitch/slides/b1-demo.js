/* Parte B · 6 · Demo ao vivo (1 minuto): o dashboard real + os pedidos do próprio pitch. Não reduzir o ecrã. */
RISE.slide({
  id: "demo",
  title: "Live demo",
  time: "2:00 – 3:00",
  notes: `
Um minuto. Tecla I para clicar na app; clicar fora do ecrã para voltar. Se a app falhar: tecla V (vídeo de backup) e dizê-lo.
1. Home: colar o repo, objetivo "Move to another cloud", de AWS S3 Stockholm (real) para o destino. Run analysis.
2. A resposta em grande: "Ready, one change." Mostrar a mudança, um risco com file:line e um request ID real da AWS.
3. (se houver tempo) Compare: "Best fit".
4. /demo, preparado antes: "And here the app actually moves. We cut the old cloud, and the traffic keeps flowing on the new one."
Só a AWS é real. Os outros destinos locais são simulados: dizê-lo se aparecerem.`,

  html: `
    <header class="rv">
      <h2 class="headline">Live demo</h2>
      <div class="status"><span class="active pill idle">Not connected</span><span class="link pill idle" hidden></span></div>
    </header>
    <div class="stage">
      <div class="browser glass rv scale" style="--i:1">
        <div class="bar"><span class="mode pill warn" hidden>Recording</span></div>
        <div class="screen app"><p class="cap"><b></b><span></span></p><i class="tick"></i></div>
      </div>
      <aside class="trace glass rv right" style="--i:3" aria-label="Requests made by this pitch">
        <h3>This deck's requests</h3>
        <ol></ol>
      </aside>
    </div>`,

  css: `
    display: flex; flex-direction: column; gap: 32px; padding-top: 130px; padding-bottom: 110px;
    header { display: flex; justify-content: space-between; align-items: center; gap: 40px; }
    .headline { font-size: var(--t4); font-weight: 600; letter-spacing: -.03em; line-height: 1.1; }
    .status { display: flex; gap: 12px; }
    .stage { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 430px; gap: 40px; }
    .browser { min-height: 0; }
    .app { position: relative; overflow: hidden; }
    .scene { position: absolute; inset: 0; opacity: 0; transition: opacity .45s var(--e-out); }
    .scene.on { opacity: 1; }
    .zoom { position: absolute; inset: 0; transform-origin: var(--o); transition: transform 3.4s cubic-bezier(.3,.1,.3,1); }
    .scene.on .zoom { transform: scale(var(--z)); }
    .cap { position: absolute; left: 28px; bottom: 30px; z-index: 3; display: flex; align-items: center; gap: 16px; padding: 16px 24px;
      border-radius: 18px; background: rgba(255,255,255,.88); backdrop-filter: blur(14px); font-size: 28px; font-weight: 600; letter-spacing: -.01em;
      box-shadow: 0 0 0 1px var(--line), 0 22px 44px -18px rgba(18,31,53,.5); opacity: 0; transform: translateY(18px); transition: opacity .5s var(--e-out), transform .7s var(--e-out); }
    .cap.on { opacity: 1; transform: none; }
    .cap b { font: 600 20px/1 var(--f-mono); color: var(--accent); }
    .tick { position: absolute; left: 0; bottom: 0; z-index: 3; height: 5px; width: 0; background: var(--accent); }
    .tick.run { width: 100%; transition: width var(--d) linear; }
    .trace { min-height: 0; padding: 28px 30px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }
    .trace h3 { font-size: var(--t1); font-weight: 600; }
    .trace ol { list-style: none; }
    .trace li { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; align-items: center; padding: 12px 0; border-top: 1px solid var(--line); }
    .trace li .pill { font-size: 18px; padding: 6px 12px; }
    .trace li code { font: 500 18px/1.3 var(--f-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trace li small { grid-column: 2; font: 400 16px/1.2 var(--f-mono); color: var(--muted); white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    .trace li.new { animation: rise-in .45s var(--ease) both; }
    .trace .empty { font-size: 22px; }
    .app video { position: absolute; inset: 0; z-index: 4; width: 100%; height: 100%; object-fit: contain; background: #fff; }`,

  globalCss: `
    body.interact .slide[data-slide="demo"] .zoom { transform: none !important; transition-duration: .4s; }
    body.interact .slide[data-slide="demo"] .cap, body.interact .slide[data-slide="demo"] .tick { opacity: 0; }`,

  init(el, api) {
    FX.prep(el);
    const app = el.querySelector(".app");
    if (api.live.online) {
      // O dashboard carrega 3 s depois da abertura: a seta da capa anima sem concorrência e,
      // quando chegarmos à demo (minuto 2), a app já está pronta.
      setTimeout(() => this._build(el, api), 3000);
    } else {
      app.innerHTML = `<div class="empty"><div><strong>The live dashboard appears here</strong>Open this pitch through RISE: /static/pitch/Rise_Pitch.html${api.config.demoVideo ? ", or press V for the recorded backup" : ""}.</div></div>`;
    }
    this._seen = new Set();
    this._trace(el, api, null);
  },

  async enter(el, api) {
    FX.act("solution");
    this._here = true; this._play(el, api);
    const refresh = async () => { try { this._trace(el, api, await api.live.state()); } catch { /* offline */ } };
    await refresh();
    this._off = api.live.onChange(refresh);
  },
  leave(el) { this._here = false; clearTimeout(this._timer); this._off?.(); el.querySelector("video")?.pause(); },

  // ── Tour: real app pages, one after another, each with a slow zoom into what matters. Nothing is recorded or faked. ──
  DUR: 3200,
  async _build(el, api) {
    const base = api.config.apiBase || "";
    let list = [];
    try { list = await (await fetch(base + "/api/analyses")).json(); } catch { /* the tour still shows the other pages */ }
    const done = (Array.isArray(list) ? list : []).filter(a => a.status === "done");
    const best = done.find(a => a.score?.percent === 100) || done[0];
    this._scenes = [
      { p: "/", cap: "Paste a repo. Say where you want to go.", o: "50% 32%", z: 1.4 },
      ...(best ? [
        { p: "/a/" + best.id, cap: "Fetch, scan, AI plan, real tests: every step timed", o: "50% 9%", z: 1.6 },
        { p: "/a/" + best.id, cap: "The answer, proven on both clouds", o: "35% 20%", z: 1.45 },
        { p: "/a/" + best.id, cap: "Every S3 call in the code, with file:line", o: "55% 50%", z: 1.6 },
        { p: "/a/" + best.id, cap: "AI plans the tests. They fail, adapt, pass.", o: "88% 40%", z: 1.6 },
        { p: "/a/" + best.id, cap: "Every risk, with file:line", o: "45% 60%", z: 1.25, scroll: .5 },
      ] : []),
      { p: "/replay", cap: "Replay: no code leaves the company", o: "50% 30%", z: 1.3 },
      { p: "/connect", cap: "Real providers. Keys never reach the browser.", o: "50% 30%", z: 1.25 },
      { p: "/demo", cap: "Live switch: cut the old cloud, traffic keeps flowing", o: "50% 45%", z: 1.2 },
    ];
    this._i = -1;
    this._next = this._load(el, api, 0);
    if (api.still) return this._show(el, api);
    if (this._here) this._play(el, api);
  },
  _load(el, api, i) {
    const sc = this._scenes[i], box = document.createElement("div");
    box.className = "scene"; box.innerHTML = `<div class="zoom" style="--o:${sc.o};--z:${sc.z}"></div>`;
    el.querySelector(".app").prepend(box);
    const f = api.frame(box.firstChild, (api.config.apiBase || "") + sc.p, { h: 900, title: "RISE dashboard" });
    if (sc.scroll) f.addEventListener("load", () => setTimeout(() => {
      try {  // same origin: scroll the app's main scroller, as a person would
        const d = f.contentDocument, all = [d.scrollingElement, ...d.querySelectorAll("*")];
        const s = all.filter(n => n && n.scrollHeight > n.clientHeight + 80 && (n === d.scrollingElement || /auto|scroll/.test(getComputedStyle(n).overflowY)))
          .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
        s?.scrollTo({ top: (s.scrollHeight - s.clientHeight) * sc.scroll, behavior: "smooth" });
      } catch { /* not reachable: stays at the top */ }
    }, 1800));
    return { box, sc, i };
  },
  _show(el, api) {
    const cur = this._next, old = el.querySelector(".scene.on");
    if (!cur) return;
    this._i = cur.i;
    requestAnimationFrame(() => cur.box.classList.add("on"));
    if (old && old !== cur.box) { old.classList.remove("on"); setTimeout(() => old.remove(), 1000); }
    const cap = el.querySelector(".cap");
    cap.classList.remove("on");
    setTimeout(() => { cap.querySelector("b").textContent = String(cur.i + 1).padStart(2, "0"); cap.querySelector("span").textContent = cur.sc.cap; cap.classList.add("on"); }, 200);
    const tick = el.querySelector(".tick");
    tick.classList.remove("run"); tick.style.setProperty("--d", this.DUR + "ms"); void tick.offsetWidth;
    if (!api.still) tick.classList.add("run");
    this._next = api.still ? null : this._load(el, api, (cur.i + 1) % this._scenes.length);  // preload: the next page is ready when shown
  },
  _play(el, api) {
    clearTimeout(this._timer);
    if (!this._scenes || api.still) return;
    if (this._i < 0) this._show(el, api);
    const loop = () => {
      this._timer = setTimeout(() => {
        if (!this._here) return;
        if (!document.body.classList.contains("interact")) this._show(el, api);  // I = the presenter is clicking: hold still
        loop();
      }, this.DUR);
    };
    loop();
  },

  _trace(el, api, s) {
    const ol = el.querySelector(".trace ol");
    const rows = (s?.trace || []).slice(-7).reverse();
    const first = this._seen.size === 0;
    ol.innerHTML = rows.length ? rows.map(r => {
      const id = `${r.ts}|${r.key}|${r.request_id || r.error || ""}`;
      const fresh = !first && !this._seen.has(id);
      this._seen.add(id);
      return `<li class="${fresh ? "new" : ""}"><span class="pill ${!r.ok ? "bad" : r.provider === "destination" ? "live" : "idle"}">${api.esc(r.ok ? r.provider : "failed")}</span>
        <code>${api.esc(r.key)}</code>
        <small>${api.esc(String(r.ts || "").slice(11, 19))}  ${api.esc(r.ok ? String(r.request_id || "").slice(0, 10) : r.error || "")}</small></li>`;
    }).join("") : `<li class="empty">No requests yet.</li>`;
    if (!s) return;
    const active = el.querySelector(".active");
    active.className = "active pill " + (s.active === "destination" ? "live" : "idle");
    active.textContent = `App on ${s.active}`;
    const link = el.querySelector(".link");
    link.hidden = s.link_up == null;
    link.className = "link pill " + (s.link_up ? "idle" : "bad");
    link.textContent = s.link_up ? "Source link up" : "Source link cut";
  },

  key(e, el, api) {
    if (e.key !== "v" && e.key !== "V") return false;
    const box = el.querySelector(".app"), mode = el.querySelector(".mode");
    if (!api.config.demoVideo) return true;
    let v = box.querySelector("video");
    if (v) { v.remove(); mode.hidden = true; return true; }
    v = document.createElement("video");
    v.src = api.config.demoVideo; v.playsInline = true;
    box.append(v); v.play();
    mode.hidden = false; // a gravação aparece sempre marcada como gravação
    return true;
  },
});
