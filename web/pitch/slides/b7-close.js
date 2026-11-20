/* Parte B · 12 · Fecho: a marca volta a desenhar-se; a frase da capa fecha o círculo. */
RISE.slide({
  id: "close",
  title: "Close",
  time: "4:45 – 5:00",
  notes: `
"From 'we think we can move' to 'here is the proof', in ten seconds."
(devagar) "Don't hope your migration works. Prove it."
"RISE. Built to rise when clouds fall."
(silêncio: deixar o júri perguntar)`,

  html: `
    <div class="end">
      <span class="hero-wrap rv fade" style="--i:0">
        <span class="halo"></span>
        <svg class="hero" viewBox="7.5 9.5 45 39" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <defs><linearGradient id="close-g" x1="11" y1="45" x2="49" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#121F35"/><stop offset="1" stop-color="#2563EB"/></linearGradient></defs>
          <path class="draw" style="--i:0;stroke:var(--accent-soft)" d="M11 31.5c7.1-.2 12.5-2.9 17.4-7.9" stroke-width="5"/>
          <path class="draw" style="--i:1" d="M11 45c10.5 0 19.2-6.2 27.6-17.9L49 13" stroke="url(#close-g)" stroke-width="6.5"/>
          <path class="draw" style="--i:5;stroke:var(--accent)" d="M35 13h14v14" stroke-width="6.5"/>
        </svg>
      </span>
      <p class="from rv" style="--i:2">From “we think we can move” to “here is the proof”. In 10 seconds.</p>
      <h2 class="display split"><span class="soft">Don't hope your migration works.</span> Prove it.</h2>
      <p class="sign rv" style="--i:9"><b>RISE</b>Built to rise when clouds fall.</p>
    </div>`,

  css: `
    .end { height: 100%; display: grid; justify-items: center; align-content: center; text-align: center; gap: 36px; }
    /* a mesma seta da capa (gradiente, halo e desenho), em grande */
    .hero-wrap { position: relative; display: block; height: 200px; }
    .halo { position: absolute; inset: -20%; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 20%, transparent), transparent); filter: blur(30px); }
    .hero { position: relative; display: block; height: 100%; width: auto; overflow: visible; }
    .from { font-size: var(--t3); color: var(--muted); }
    .display { font-size: var(--t6); max-width: 15ch; }
    .sign { display: flex; align-items: baseline; gap: 18px; font-size: var(--t3); color: var(--muted); }
    .sign b { color: var(--ink); font-weight: 700; letter-spacing: .14em; }`,

  globalCss: `#deck:has(.slide[data-slide="close"].cur) > .brand { opacity: 0; transform: translateY(-8px); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("finale"); },
});
