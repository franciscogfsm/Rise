/*
  Motor do pitch RISE. Partilhado pelas duas metades: mudar só depois de combinar.

  Cada slide é um ficheiro em slides/ que chama RISE.slide({...}):
    id       identificador curto, também usado no URL (#demo)
    title    nome para as notas e para a barra de progresso
    time     tempo-alvo, por exemplo "2:10 – 3:10"
    notes    guião falado (tecla N)
    steps    número de passos dentro do slide (classes .s1, .s2... no <section>)
    html     conteúdo
    css      CSS do slide; fica automaticamente limitado a este slide (CSS nesting)
    globalCss  CSS fora do slide, por exemplo @keyframes
    init(el, api)        uma vez, ao arrancar
    enter(el, api)       sempre que o slide fica visível
    leave(el, api)       sempre que sai
    step(el, n, api)     quando muda de passo dentro do slide
    key(event, el, api)  devolver true para consumir a tecla
*/
(() => {
  "use strict";

  const W = 1920, H = 1080;
  const qs = new URLSearchParams(location.search);
  const STATIC = qs.has("static");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const still = STATIC || REDUCED;

  const config = Object.assign({}, window.RISE_CONFIG || {});
  for (const [k, v] of qs) if (k in config && typeof config[k] === "string" && v) config[k] = v;

  const slides = [];
  let deck, cur = -1, step = 0, interacting = false;
  let timerStart = 0, timerTick = 0;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wait = ms => new Promise(r => setTimeout(r, still ? 0 : ms));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Ícone oficial (web/brand/rise-icon.svg), em currentColor */
  const MARK = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <path class="m-rise" d="M11 45c10.5 0 19.2-6.2 27.6-17.9L49 13" stroke-width="6.5"/>
    <path class="m-head" d="M35 13h14v14" stroke-width="6.5"/>
    <path class="m-trail" d="M11 31.5c7.1-.2 12.5-2.9 17.4-7.9" stroke-width="5" opacity=".5"/>
  </svg>`;

  /* Proveniência de um pedido do pitch (resultado de RISE_LIVE.asset). Nunca inventa um provider. */
  function served(res, providers = {}) {
    if (!res) return "";
    if (res.offline) return `<span class="pill idle">Local preview</span><span>not served through RISE</span>`;
    if (!res.ok) return `<span class="pill bad">Request failed</span><span>${esc(res.error || "")}</span>`;
    const p = providers[res.provider] || {};
    const name = p.name ? `${esc(p.name)}${p.simulated ? " (simulated)" : ""}` : esc(res.provider);
    return `<span class="pill ${res.provider === "destination" ? "live" : "idle"}">${esc(res.provider)}</span>` +
      `<span>${name}</span><span class="rid">req ${esc((res.requestId || "").slice(0, 16) || "–")}</span>`;
  }

  /* Mostra uma página real dentro de uma moldura, renderizada a w×h e escalada para caber. */
  function frame(box, url, { w = 0, h = 900, title = "RISE app" } = {}) {
    box.querySelector("iframe")?.remove();
    if (!url) return null;
    // Sem largura fixa: a app é renderizada com a proporção da moldura, para a encher toda
    if (!w) w = Math.round(h * box.clientWidth / Math.max(1, box.clientHeight));
    const f = document.createElement("iframe");
    f.src = url; f.title = title; f.loading = "eager";
    f.style.width = w + "px"; f.style.height = h + "px"; f.style.transformOrigin = "0 0";
    box.append(f);
    const fit = () => f.style.transform = `scale(${Math.min(box.clientWidth / w, box.clientHeight / h)})`;
    new ResizeObserver(fit).observe(box); fit();
    return f;
  }

  function setInteract(on) {
    interacting = on;
    document.body.classList.toggle("interact", on);
    $("#interact-hint").hidden = !on;
    if (!on) window.focus();
  }

  const api = {
    config, still, static: STATIC, wait, esc, $, $$, frame, served, MARK,
    live: window.RISE_LIVE,
    get interacting() { return interacting; },
    setInteract,
  };

  function slide(def) { slides.push(Object.assign({ steps: 0 }, def)); }

  /* Navegação */
  function setStep(d, s, fire) {
    step = s;
    for (let k = 1; k <= d.steps; k++) d.el.classList.toggle("s" + k, k <= s);
    if (fire) d.step?.(d.el, s, api);
  }

  function show(i, s = 0) {
    if (!slides.length) return;
    i = clamp(i, 0, slides.length - 1);
    const d = slides[i];
    s = STATIC ? d.steps : clamp(s, 0, d.steps);
    if (i !== cur) {
      const prev = slides[cur];
      if (prev) { prev.el.classList.remove("cur"); prev.leave?.(prev.el, api); }
      slides.forEach((x, k) => { x.el.inert = k !== i; x.el.setAttribute("aria-hidden", k !== i); });
      cur = i;
      setStep(d, s, false);
      void d.el.offsetWidth; // reinicia as transições de entrada
      d.el.classList.add("cur");
      d.enter?.(d.el, api);
      if (s) d.step?.(d.el, s, api);
      setInteract(false);
    } else if (s !== step) {
      setStep(d, s, true);
    }
    updateHud();
    history.replaceState(null, "", location.search + "#" + d.id + (step ? "." + step : ""));
  }

  const next = () => step < slides[cur].steps ? show(cur, step + 1) : show(cur + 1, 0);
  const prev = () => step > 0 ? show(cur, step - 1) : cur > 0 && show(cur - 1, slides[cur - 1].steps);

  function fromHash() {
    const [id, s] = decodeURIComponent(location.hash.slice(1)).split(".");
    let i = slides.findIndex(d => d.id === id);
    if (i < 0 && /^\d+$/.test(id)) i = +id - 1;
    return [Math.max(0, i), +s || 0];
  }

  /* HUD, notas e cronómetro */
  function updateHud() {
    $$(".progress button", deck).forEach((b, k) => {
      b.classList.toggle("on", k === cur);
      b.classList.toggle("done", k < cur);
      b.setAttribute("aria-current", k === cur ? "step" : "false");
    });
    const pad = n => String(n).padStart(2, "0");
    $(".deck-count", deck).textContent = `${pad(cur + 1)} / ${pad(slides.length)}`;
    const d = slides[cur], nx = slides[cur + 1];
    $("#notes .head").innerHTML =
      `<b>${cur + 1} / ${slides.length}  ${esc(d.title)}</b>` +
      `<span>Target ${esc(d.time || "–")}</span>` +
      (d.steps ? `<span>Step ${step} of ${d.steps}</span>` : "") +
      `<span>Next: ${nx ? esc(nx.title) : "end"}</span>`;
    $("#notes .text").textContent = (d.notes || "").trim();
  }

  const toSeconds = t => { const m = /(\d+):(\d+)\s*$/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : 0; };
  function timer() {
    const el = $("#timer");
    if (timerTick) { clearInterval(timerTick); timerTick = 0; el.hidden = true; return; }
    timerStart = Date.now(); el.hidden = false;
    const tick = () => {
      const s = (Date.now() - timerStart) / 1000 | 0;
      const end = toSeconds(slides[cur].time);
      el.textContent = `${s / 60 | 0}:${String(s % 60).padStart(2, "0")} of 5:00`;
      el.classList.toggle("late", s > 300 || (end && s > end));
    };
    tick(); timerTick = setInterval(tick, 250);
  }

  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    deck.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const d = slides[cur];
    if (d.key?.(e, d.el, api)) { e.preventDefault(); return; }
    const k = e.key;
    if ((k === "Enter" || k === " ") && e.target.closest?.("button")) return;
    if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(k)) next();
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) prev();
    else if (k === "Home") show(0);
    else if (k === "End") show(slides.length - 1, slides.at(-1).steps);
    else if (k === "f" || k === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    else if (k === "n" || k === "N") $("#notes").hidden = !$("#notes").hidden;
    else if (k === "t" || k === "T") timer();
    else if (k === "i" || k === "I") setInteract(!interacting);
    else if (k === "Escape" && interacting) setInteract(false);
    else return;
    e.preventDefault();
  }

  function start() {
    document.documentElement.classList.toggle("still", still);
    deck = $("#deck");

    let css = "";
    for (const d of slides) {
      const s = document.createElement("section");
      s.className = "slide";
      s.dataset.slide = d.id;
      s.setAttribute("aria-label", d.title);
      s.innerHTML = d.html || "";
      deck.append(s);
      d.el = s;
      if (d.css) css += `.slide[data-slide="${d.id}"] {\n${d.css}\n}\n`;
      if (d.globalCss) css += d.globalCss + "\n";
    }
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);

    deck.insertAdjacentHTML("afterbegin", `<div class="blobs" aria-hidden="true"><i></i><i></i><i></i></div>`);
    deck.insertAdjacentHTML("beforeend",
      `<div class="brand">${MARK}<span>RISE</span></div>` +
      `<div class="deck-count" aria-hidden="true"></div>` +
      `<nav class="progress" aria-label="Slides">${slides.map((d, k) =>
        `<button type="button" data-k="${k}" aria-label="${k + 1}. ${esc(d.title)}"></button>`).join("")}</nav>`);
    $(".progress", deck).addEventListener("click", e => {
      const b = e.target.closest("button"); if (b) show(+b.dataset.k);
    });
    document.body.insertAdjacentHTML("beforeend",
      `<aside id="notes" hidden aria-label="Speaker notes"><div class="head"></div><div class="text"></div></aside>` +
      `<div id="timer" hidden role="timer"></div>` +
      `<div id="interact-hint" hidden>Using the app. Click outside the screen or press Esc to return to the slides.</div>`);

    for (const d of slides) d.init?.(d.el, api);

    addEventListener("keydown", onKey);
    addEventListener("resize", fit);
    deck.addEventListener("mousedown", e => { if (interacting && !e.target.closest(".screen")) setInteract(false); });
    // No telemóvel: tocar à direita avança, à esquerda recua
    deck.addEventListener("pointerup", e => {
      if (e.pointerType !== "touch" || e.target.closest("button, a, .screen")) return;
      e.clientX > innerWidth / 3 ? next() : prev();
    });
    fit();
    const [i, s] = fromHash();
    show(i, s);
  }

  window.RISE = { slide, start, api };
})();
