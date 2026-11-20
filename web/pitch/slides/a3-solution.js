/* Parte A · slide 3 · A solução: a jornada do RISE numa linha que sobe */
RISE.slide({
  id: "solution",
  title: "Solution",
  time: "0:50 – 1:30",
  steps: 2,
  notes: `
"RISE is an AI platform that helps companies move between cloud providers, like AWS and Leaseweb, without surprises."
"It doesn't promise your migration works. It proves it, with real tests, before you move."
(a linha desenha-se; acompanhar com a mão)
"We connect both sides with minimum permissions. RISE watches how your app really uses storage. The AI turns that into a test plan. A deterministic engine runs it against both providers."
(→ Challenge fica a coral) "When something behaves differently, we catch it here, before a customer does."
(→ a coral passa a mint) "The AI proposes a constrained fix, we retest, it passes. Then we verify every object, switch the app, and prove a brand new operation on the destination."`,

  html: `
    <h2 class="title">It doesn't promise your migration works. It proves it, before you move.</h2>
    <div class="track">
      <svg viewBox="0 0 1680 500" aria-hidden="true"><path class="path" d="M10 300 C 520 290, 1000 190, 1670 16"/></svg>
      <ol class="stops"></ol>
    </div>`,

  css: `
    display: flex; flex-direction: column; justify-content: space-between;
    .title { max-width: 22ch; }
    .track { position: relative; height: 500px; }
    svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    .path { fill: none; stroke: rgba(18,31,53,.28); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 2.2s var(--ease) .2s; }
    .stops { list-style: none; }
    .stop {
      position: absolute; width: 196px; transform: translate(-14px, -14px);
      display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; padding-top: 48px;
      opacity: 0; transition: opacity .6s var(--ease);
    }
    &.cur .stop { opacity: 1; }
    .stop.flip { transform: translate(calc(-100% + 14px), calc(-100% + 14px)); text-align: right; padding: 0 0 48px; }
    .stop::after {
      content: ""; position: absolute; left: 0; top: 0; width: 28px; height: 28px; border-radius: 50%;
      background: var(--white); box-shadow: inset 0 0 0 3px var(--ink), var(--shadow);
      transition: background .45s var(--ease), box-shadow .45s var(--ease);
    }
    .stop.flip::after { left: auto; right: 0; top: auto; bottom: 0; }
    .stop b { font-size: var(--t2); font-weight: 600; letter-spacing: -.01em; transition: color .45s var(--ease); }
    .stop span { font-size: 22px; line-height: 1.35; color: var(--muted); }
    .stop .ai { justify-self: start; font: 500 18px/1 var(--f-mono); letter-spacing: .08em; color: var(--accent); }
    .stop em { font-style: normal; font-size: 22px; font-weight: 600; white-space: nowrap; opacity: 0; transition: opacity .45s var(--ease); }

    &.s1 .stop.challenge b, &.s1 .stop.challenge em { color: var(--bad); }
    &.s1 .stop.challenge::after { background: var(--bad-bg); box-shadow: inset 0 0 0 3px var(--bad), var(--shadow); }
    &.s1 .stop.challenge em { opacity: 1; }
    &.s2 .stop.challenge b { color: var(--ink); }
    &.s2 .stop.challenge em { color: var(--ok); }
    &.s2 .stop:is(.challenge, .adapt)::after { background: var(--ok); box-shadow: inset 0 0 0 3px var(--ok), var(--shadow); }
    &.s2 .stop.adapt b { color: var(--ok); }`,

  init(el, api) {
    const STOPS = [
      ["connect", "Connect", "Both providers, least privilege."],
      ["discover", "Discover", "Records how the app uses storage."],
      ["analyze", "Analyze", "Turns it into a test plan.", "AI"],
      ["challenge", "Challenge", "Runs the plan on both sides."],
      ["adapt", "Adapt", "A constrained fix, then a retest.", "AI"],
      ["verify", "Verify", "SHA-256 of every object."],
      ["switch", "Switch", "The app moves to the destination."],
      ["prove", "Prove", "A new operation, plus the evidence."],
    ];
    const path = el.querySelector(".path");
    const len = path.getTotalLength();
    this._len = len;
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = api.still ? 0 : len;
    const ts = STOPS.map((_, k) => 0.02 + k * (0.97 / (STOPS.length - 1)));
    el.querySelector(".stops").innerHTML = STOPS.map(([id, name, text, ai], k) => {
      const p = path.getPointAtLength(len * ts[k]);
      const flip = p.x > 1680 - 210;
      return `<li class="stop ${id}${flip ? " flip" : ""}" style="left:${p.x / 16.8}%;top:${p.y / 5}%;transition-delay:${(0.35 + ts[k] * 1.9).toFixed(2)}s">
        <b>${name}</b><span>${text}</span>${ai ? `<i class="ai">${ai}</i>` : ""}
        ${id === "challenge" ? `<em>Finds what behaves differently</em>` : ""}</li>`;
    }).join("");
  },

  enter(el, api) {
    if (api.still) return;
    const path = el.querySelector(".path");
    path.style.strokeDashoffset = this._len;
    void path.getBoundingClientRect();
    path.style.strokeDashoffset = 0;
  },
  leave(el) { el.querySelector(".path").style.strokeDashoffset = this._len; },

  step(el, n) {
    el.querySelector(".stop.challenge em").textContent = n >= 2 ? "Passes after the fix" : "Finds what behaves differently";
  },
});
