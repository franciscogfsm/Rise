/* Parte B · 7 · Resultados medidos hoje, com o tempo de uma análise de ponta a ponta. */
RISE.slide({
  id: "results",
  title: "Results",
  time: "3:00 – 3:25",
  notes: `
"These are today's results, all measured."
"On real AWS, in Stockholm: the answer was 'Ready, one change', in 12.4 seconds, with real AWS request IDs and SHA-256 verified on AWS."
(a barra) "Here's where the time goes for a small repo: 1.2 seconds to fetch, 22 milliseconds to scan, 9 seconds of AI planning, and 1.1 seconds for 8 real tests."
"Three providers compared in parallel: about 16 seconds. The live switch: 284 requests, zero failed, with the source cut."
"No AI key, fresh clone: it still gives the right answer. And 106 automated tests pass."
Só a AWS foi testada ao vivo hoje. Não dizer que testámos a Leaseweb real.`,

  BAR: [["Fetch", 1.2], ["Scan", 0.022], ["AI plan", 9.0], ["8 real tests", 1.1]],

  html: `
    <div class="rs">
      <h2 class="title split">Measured today.</h2>
      <div class="top">
        <div class="hero glass rv" style="--i:2">
          <span class="lbl">Real AWS, Stockholm</span>
          <span class="ans">Ready · 1 change</span>
          <b>12.4 s</b>
          <span class="sub">real AWS request IDs, SHA-256 verified</span>
        </div>
        <ul class="facts">
          <li class="rv" style="--i:3"><b>~16 s</b><span>3 providers compared in parallel</span></li>
          <li class="rv" style="--i:4"><b>0 failed</b><span>of 284 live requests during the switch, source cut</span></li>
          <li class="rv" style="--i:5"><b>No AI key</b><span>still the right answer (rules fallback)</span></li>
          <li class="rv" style="--i:6"><b>106</b><span>automated tests passing</span></li>
        </ul>
      </div>
      <div class="bar-wrap rv" style="--i:7">
        <p class="bl">Repo URL to proof, 10-file TypeScript repo: <b>11.3 s</b></p>
        <div class="bar"></div>
      </div>
    </div>`,

  css: `
    .rs { height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 36px; }
    .top { display: grid; grid-template-columns: 720px 1fr; gap: 72px; align-items: center; }
    .hero { padding: 40px 44px; display: grid; gap: 14px; justify-items: start; }
    .hero .lbl { font-size: var(--t1); font-weight: 600; color: var(--muted); }
    .hero .ans { font-size: var(--t2); font-weight: 600; color: var(--ok); background: var(--ok-bg); padding: 10px 18px; border-radius: 999px; }
    .hero b { font-size: 150px; line-height: .9; font-weight: 700; letter-spacing: -.055em; }
    .hero .sub { font-size: var(--t1); color: var(--muted); }
    .facts { list-style: none; display: grid; gap: 0; }
    .facts li { display: grid; grid-template-columns: 230px 1fr; gap: 24px; align-items: baseline; padding: 20px 0; border-top: 1px solid var(--line); }
    .facts li:first-child { border-top: 0; }
    .facts b { font-size: 44px; font-weight: 700; letter-spacing: -.03em; }
    .facts span { font-size: var(--t1); color: var(--muted); }
    .bl { font-size: var(--t1); color: var(--muted); margin-bottom: 14px; }
    .bl b { color: var(--ink); }
    .bar { display: flex; height: 64px; border-radius: 16px; overflow: hidden; background: var(--faint); }
    .seg { display: flex; align-items: center; padding: 0 16px; min-width: 6px; font: 500 20px var(--f-mono); color: #fff; white-space: nowrap; overflow: visible;
      transform-origin: left; transform: scaleX(0); transition: transform .8s var(--ease-out); transition-delay: calc(700ms + var(--i) * 180ms); }
    &.cur .seg { transform: none; }
    .seg:nth-child(1) { background: #42506A; }
    .seg:nth-child(2) { background: var(--ink); padding: 0; }
    .seg:nth-child(3) { background: var(--accent); }
    .seg:nth-child(4) { background: var(--ok); }
    .legend { display: flex; gap: 32px; margin-top: 14px; font: 500 20px var(--f-mono); color: var(--muted); }
    .legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 8px; vertical-align: 0; }`,

  init(el) {
    const total = this.BAR.reduce((a, [, s]) => a + s, 0);
    const fmt = s => s < 0.1 ? `${Math.round(s * 1000)} ms` : `${s.toFixed(1)} s`;
    const colors = ["#42506A", "var(--ink)", "var(--accent)", "var(--ok)"];
    el.querySelector(".bar").innerHTML = this.BAR.map(([, s], i) =>
      `<span class="seg" style="--i:${i};flex:${s / total} 0 0">${s / total > .08 ? fmt(s) : ""}</span>`).join("");
    el.querySelector(".bar-wrap").insertAdjacentHTML("beforeend", `<p class="legend">${this.BAR.map(([n, s], i) =>
      `<span><i style="background:${colors[i]}"></i>${n} ${fmt(s)}</span>`).join("")}</p>`);
    FX.prep(el);
  },
  enter() { FX.act("proof"); },
});
