/* Parte B · slide 5 · Demo ao vivo (1 minuto): o dashboard real + os pedidos do próprio pitch */
RISE.slide({
  id: "demo",
  title: "Live demo",
  time: "2:00 – 3:00",
  notes: `
Um minuto. Narrar o que acontece, não a interface. Tecla I para clicar no dashboard; clicar fora do ecrã para voltar.
1. "This is asset-service, a real app on its original provider. RISE has observed it and the AI wrote the plan." (Discover e Analyze feitos antes, se for preciso)
2. Challenge: "One behaviour differs on the destination." (coral) Adapt: "Constrained fix, retest, pass." (mint)
3. Verify: "Every object copied, SHA-256 of the bytes on both sides."
4. Switch, depois Cut: "The app now talks to the destination. And the source link is cut, for real."
5. Apontar para a coluna da direita só se mudar de provider: "Watch who serves these requests."
Se a app falhar: tecla V (vídeo de backup, aparece marcado como gravação) e dizê-lo.`,

  html: `
    <header>
      <h2 class="headline">Live: one app, two providers, every step verified.</h2>
      <div class="status"><span class="active pill idle">Not connected</span><span class="link pill idle" hidden></span></div>
    </header>
    <div class="stage">
      <div class="browser glass">
        <div class="bar"><span class="host">RISE dashboard</span><span class="mode pill idle" hidden>Recording</span></div>
        <div class="screen app"></div>
      </div>
      <aside class="trace glass" aria-label="Requests made by this pitch">
        <h3>Requests from this pitch</h3>
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
    .trace { min-height: 0; padding: 28px 30px; display: flex; flex-direction: column; gap: 16px; overflow: hidden; }
    .trace h3 { font-size: var(--t1); font-weight: 600; }
    .trace ol { list-style: none; display: grid; gap: 0; }
    .trace li { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; align-items: center; padding: 12px 0; border-top: 1px solid var(--line); }
    .trace li .pill { font-size: 18px; padding: 6px 12px; }
    .trace li code { font: 500 18px/1.3 var(--f-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trace li small { grid-column: 2; font: 400 16px/1.2 var(--f-mono); color: var(--muted); white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    .trace .empty { font-size: 22px; }`,

  init(el, api) {
    const app = el.querySelector(".app");
    if (api.live.online) {
      api.frame(app, api.config.dashboardPath, { h: 900, title: "RISE dashboard" });
      el.querySelector(".host").textContent = location.host + api.config.dashboardPath;
    } else {
      app.innerHTML = `<div class="empty"><div><strong>The live dashboard appears here</strong>Open this pitch through RISE: /static/pitch/index.html${api.config.demoVideo ? ", or press V for the recorded backup" : ""}.</div></div>`;
    }
    this._trace(el, api, null);
  },

  async enter(el, api) {
    const refresh = async () => { try { this._trace(el, api, await api.live.state()); } catch { /* offline */ } };
    await refresh();
    this._stop = api.live.onChange(refresh);
  },
  leave(el) { this._stop?.(); el.querySelector("video")?.pause(); },

  _trace(el, api, s) {
    const ol = el.querySelector(".trace ol");
    const rows = (s?.trace || []).slice(-7).reverse();
    ol.innerHTML = rows.length ? rows.map(r => `
      <li><span class="pill ${!r.ok ? "bad" : r.provider === "destination" ? "live" : "idle"}">${api.esc(r.ok ? r.provider : "failed")}</span>
        <code>${api.esc(r.key)}</code>
        <small>${api.esc(String(r.ts || "").slice(11, 19))}  ${api.esc(r.ok ? String(r.request_id || "").slice(0, 10) : r.error || "")}</small></li>`).join("")
      : `<li class="empty">No requests yet. They appear as the slides load their images through RISE.</li>`;
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
