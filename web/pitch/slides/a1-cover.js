/* Parte A · 1 · Capa: a marca desenha-se, uma frase. */
RISE.slide({
  id: "cover",
  title: "Cover",
  time: "0:00 – 0:15",
  notes: `
(silêncio 2 s enquanto o logótipo se desenha)
"What would it take for your company to leave its cloud provider?"
(pausa) "For most companies, the honest answer is: we don't know. Today we'll show you how to find out, with proof, live, inside this deck."`,

  html: `
    <div class="cover">
      <div class="copy">
        <h1 class="display split">Don't hope your migration works. Prove it.</h1>
        <p class="tag rv" style="--i:8"><span class="dot act-c"></span>Live demo inside this deck</p>
      </div>
      <div class="hero-wrap rv fade" style="--i:0">
        <div class="halo"></div>
        <svg class="hero" viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <defs><linearGradient id="cover-g" x1="11" y1="45" x2="49" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#121F35"/><stop offset="1" stop-color="#2563EB"/></linearGradient></defs>
          <path class="draw" style="--i:0;stroke:var(--accent-soft)" d="M11 31.5c7.1-.2 12.5-2.9 17.4-7.9" stroke-width="5"/>
          <path class="draw" style="--i:1" d="M11 45c10.5 0 19.2-6.2 27.6-17.9L49 13" stroke="url(#cover-g)" stroke-width="6.5"/>
          <path class="draw" style="--i:5;stroke:var(--accent)" d="M35 13h14v14" stroke-width="6.5"/>
        </svg>
      </div>
    </div>`,

  css: `
    .cover { height: 100%; display: grid; grid-template-columns: 1fr 520px; align-items: center; gap: 60px; }
    .copy { display: grid; gap: 52px; justify-items: start; }
    .display { max-width: 12ch; }
    .hero-wrap { position: relative; width: 520px; height: 520px; }
    .halo { position: absolute; inset: 60px; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 20%, transparent), transparent); filter: blur(30px); }
    .hero { position: relative; width: 100%; height: 100%; overflow: visible; }`,

  globalCss: `#deck:has(.slide[data-slide="cover"].cur) > .brand { opacity: 0; transform: translateY(-8px); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("solution"); },
});
