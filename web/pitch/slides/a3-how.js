/* Parte A · 3 · Como funciona: cinco passos ligados por uma linha (é uma sequência real, daí os números). */
RISE.slide({
  id: "how",
  title: "How it works",
  time: "0:55 – 1:20",
  notes: `
"RISE helps companies move between cloud providers, like AWS and Leaseweb, without surprises."
"It doesn't promise your migration will work. It proves it, with real tests, before you move."
(acompanhar a linha) "It records how your app really uses storage. The AI turns that into tests, and both providers run them. When something breaks, RISE proposes a constrained fix and tests again. Only then does the app switch. And at the end we prove it, byte by byte."
"The next slides are these steps, with real data from the app."`,

  STEPS: [
    ["Discover", "Records the S3 calls your app really makes.",
      `<circle cx="24" cy="24" r="7"/><path d="M4 24c5-9 12-14 20-14s15 5 20 14c-5 9-12 14-20 14S9 33 4 24z"/>`],
    ["Challenge", "AI writes the tests. Both providers run them.",
      `<path d="M18 13h20M18 24h20M18 35h14"/><path d="M8 12l2.5 2.5L15 10M8 23l2.5 2.5L15 21M8 34l2.5 2.5L15 32"/>`],
    ["Adapt", "A failure gets a constrained fix, then a retest.",
      `<path d="M29 9a10 10 0 0 0-9.5 13.2L8 33.7 14.3 40l11.5-11.5A10 10 0 0 0 39 19l-6 6-6-1-1-6z"/>`],
    ["Switch", "The app moves once every test passes.",
      `<path d="M8 16h30l-7-7M40 32H10l7 7"/>`],
    ["Prove", "SHA-256 of every object. Then the source is cut.",
      `<path d="M24 5l16 6v11c0 10-7 18-16 21C15 40 8 32 8 22V11z"/><path d="M17 24l5 5 9-10"/>`],
  ],

  html: `
    <div class="how">
      <h2 class="title split">RISE helps you change cloud provider without surprises.</h2>
      <div class="track">
        <svg class="rail" viewBox="0 0 1680 20" preserveAspectRatio="none" aria-hidden="true">
          <path class="draw" style="--i:2" d="M68 10H1438" stroke-width="3"/>
        </svg>
        <ol class="steps"></ol>
      </div>
    </div>`,

  css: `
    .how { height: 100%; display: grid; grid-template-rows: auto 1fr; }
    .title { max-width: 20ch; }
    .track { position: relative; margin-top: 90px; }
    .rail { position: absolute; left: 0; right: 0; top: 58px; width: 100%; height: 20px; overflow: visible; }
    .rail path { stroke: rgba(18,31,53,.18); fill: none; }
    .steps { list-style: none; display: grid; grid-template-columns: repeat(5, 1fr); gap: 32px; }
    .step { display: grid; gap: 14px; justify-items: start; align-content: start; }
    .ico { width: 136px; height: 136px; display: grid; place-items: center; --radius: 36px; color: var(--accent); }
    .ico svg { width: 60px; height: 60px; stroke: currentColor; }
    .n { margin-top: 18px; font: 500 20px/1 var(--f-mono); color: var(--faint-ink); }
    .step h3 { font-size: var(--t4); font-weight: 600; letter-spacing: -.035em; }
    .step p { font-size: var(--t1); line-height: 1.4; color: var(--muted); max-width: 17ch; }`,

  init(el) {
    el.querySelector(".steps").innerHTML = this.STEPS.map(([verb, line, icon], i) => `
      <li class="step rv" style="--i:${3 + i * 2}">
        <div class="ico glass"><svg viewBox="0 0 48 48" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
        <span class="n">0${i + 1}</span>
        <h3>${verb}</h3>
        <p>${line}</p>
      </li>`).join("");
    FX.prep(el);
  },
  enter() { FX.act("solution"); },
});
