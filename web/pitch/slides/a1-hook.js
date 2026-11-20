/* Parte A · slide 1 · Abertura: a marca e a pergunta */
RISE.slide({
  id: "hook",
  title: "Opening",
  time: "0:00 – 0:15",
  notes: `
(silêncio enquanto a seta sobe)
"What would it take for your company to leave its cloud provider?"
(pausa) "For most companies, the honest answer is: we don't know. And that's the problem we solved today."`,

  html: `
    <div class="lockup">
      <div class="icon" aria-hidden="true"></div>
      <h1 class="word"><span>RISE</span></h1>
    </div>
    <p class="tag">Built to rise when clouds fall.</p>`,

  globalCss: `#deck:has(.slide[data-slide="hook"].cur) .brand { opacity: 0; }
    .brand { transition: opacity .4s var(--ease); }`,

  css: `
    display: flex; flex-direction: column; justify-content: center; gap: 48px;
    .lockup { display: flex; align-items: center; gap: 56px; }
    .icon { width: 230px; height: 230px; color: var(--ink); }
    .icon svg { width: 100%; height: 100%; overflow: visible; }
    .icon .m-rise { stroke-dasharray: 60; stroke-dashoffset: 60; transition: stroke-dashoffset 1s var(--ease-out) .2s; }
    .icon .m-head { opacity: 0; transform: translate(-6px, 6px); transition: opacity .35s var(--ease) .95s, transform .6s var(--ease-out) .95s; }
    .icon .m-trail { opacity: 0; transition: opacity .6s var(--ease) 1.2s; }
    &.cur .icon .m-rise { stroke-dashoffset: 0; }
    &.cur .icon .m-head { opacity: 1; transform: none; }
    &.cur .icon .m-trail { opacity: .5; }
    .word { overflow: hidden; font-size: 240px; line-height: .9; font-weight: 700; letter-spacing: .14em; margin-right: -.14em; }
    .word span { display: inline-block; transform: translateY(102%); transition: transform 1.1s var(--ease-out) .5s; }
    &.cur .word span { transform: none; }
    .tag { font-size: var(--t5); font-weight: 500; letter-spacing: -.025em; color: var(--muted); opacity: 0; transition: opacity .9s var(--ease) 1.4s; }
    &.cur .tag { opacity: 1; }`,

  init(el, api) {
    el.querySelector(".icon").innerHTML = api.MARK;
    const p = el.querySelector(".m-rise");
    const len = Math.ceil(p.getTotalLength());
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = api.still ? 0 : len;
    this._len = len;
  },
  enter(el, api) {
    const p = el.querySelector(".m-rise");
    if (api.still) return;
    p.style.strokeDashoffset = this._len;
    void p.getBoundingClientRect();
    p.style.strokeDashoffset = 0;
  },
  leave(el) { el.querySelector(".m-rise").style.strokeDashoffset = this._len; },
});
