/* Parte A · 1 · Capa: o ícone desenha-se, a marca em grande ao centro e uma frase em duas vozes. */
RISE.slide({
  id: "cover",
  title: "Cover",
  time: "0:00 – 0:15",
  notes: `
(silêncio 2 s enquanto o logótipo se desenha)
"What would it take for your company to leave its cloud provider?"
(pausa) "For most companies, the honest answer is: we don't know."
"RISE answers it. Paste a repo, pick the clouds, and in about ten seconds you get one answer: ready to migrate or not. Backed by real tests on real clouds."`,

  html: `
    <div class="cover">
      <div class="lockup">
        <p class="word rv scale" style="--i:3">RISE</p>
        <span class="hero-wrap rv fade" style="--i:0">
        <span class="halo"></span>
        <svg class="hero" viewBox="7.5 9.5 45 39" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <defs><linearGradient id="cover-g" x1="11" y1="45" x2="49" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#121F35"/><stop offset="1" stop-color="#2563EB"/></linearGradient></defs>
          <path class="draw" style="--i:0;stroke:var(--accent-soft)" d="M11 31.5c7.1-.2 12.5-2.9 17.4-7.9" stroke-width="5"/>
          <path class="draw" style="--i:1" d="M11 45c10.5 0 19.2-6.2 27.6-17.9L49 13" stroke="url(#cover-g)" stroke-width="6.5"/>
          <path class="draw" style="--i:5;stroke:var(--accent)" d="M35 13h14v14" stroke-width="6.5"/>
        </svg>
        </span>
      </div>
      <div class="copy">
        <h1 class="display split"><span class="soft">Don't hope your migration works.</span> Prove it.</h1>
        <p class="what rv" style="--i:8">Your repo, one answer in seconds.</p>
      </div>
    </div>`,

  css: `
    .cover { height: 100%; display: grid; justify-items: center; align-content: center; gap: 56px; text-align: center; }
    /* a seta tem a altura das maiúsculas de RISE e assenta na mesma linha de base */
    .lockup { display: flex; align-items: baseline; gap: .04em; font: 700 230px/.82 var(--f-ui); }
    .word { font: inherit; letter-spacing: .06em; color: var(--ink); }
    .hero-wrap { position: relative; display: block; height: .705em; }
    .halo { position: absolute; inset: -20%; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 20%, transparent), transparent); filter: blur(30px); }
    .hero { position: relative; display: block; height: 100%; width: auto; overflow: visible; }
    .copy { display: grid; gap: 34px; justify-items: center; }
    .display { font-size: 64px; max-width: 30ch; letter-spacing: -.03em; }
    .soft { color: var(--faint-ink); }
    .what { font-size: var(--t3); color: var(--muted); }`,

  globalCss: `#deck:has(.slide[data-slide="cover"].cur) > .brand { opacity: 0; transform: translateY(-8px); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("solution"); },
});
