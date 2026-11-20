/* Parte A · 5 · Escala: números medidos hoje no Apache Airflow. */
RISE.slide({
  id: "scale",
  title: "Measured at scale",
  time: "1:40 – 2:00",
  notes: `
"We measured it today on Apache Airflow: ten thousand files, 2.3 million lines."
"The full scan and risk radar take 0.86 seconds. That's 2.7 million lines per second."
"Each analysis uses about 3,700 tokens, whether the repo has 50 lines or millions."
"That's less than three hundredths of a cent. More than 3,000 analyses for one dollar."
"Sending Airflow to an AI would be around 25 million tokens. About 7,000 times more, and it wouldn't fit in any model's context."
Se perguntarem: o 7,000× é uma estimativa (cerca de 3,6 caracteres por token). O scan antes demorava 9,2 s; o resultado é igual e há um teste que o garante.`,

  html: `
    <div class="sc">
      <h2 class="title split">Measured on Apache Airflow.</h2>
      <p class="repo rv" style="--i:2">10,593 files, 2.3 million lines, 91 MB</p>
      <div class="grid">
        <div class="st rv" style="--i:3"><b>0.86 s</b><span>to scan every file and map the risks</span></div>
        <div class="st rv" style="--i:4"><b>3,700</b><span>tokens per analysis, small repo or huge</span></div>
        <div class="st rv" style="--i:5"><b>&lt;$0.0003</b><span>per analysis. 3,000+ for one dollar</span></div>
        <div class="st rv" style="--i:6"><b>7,000×</b><span>fewer tokens than sending the repo to an AI</span></div>
      </div>
      <p class="note rv" style="--i:8">Measured 20 Nov 2026. 7,000× is an estimate (about 25M tokens at 3.6 characters per token).</p>
    </div>`,

  css: `
    .sc { height: 100%; display: grid; grid-template-rows: auto auto 1fr auto; gap: 18px; }
    .repo { font: 500 26px var(--f-mono); color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 56px; align-self: center; }
    .st { border-top: 3px solid var(--ink); padding-top: 24px; display: grid; gap: 14px; align-content: start; }
    .st b { font-size: 96px; line-height: .9; font-weight: 700; letter-spacing: -.055em; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .st:last-child b { color: var(--accent); }
    .st span { font-size: var(--t2); line-height: 1.3; color: var(--muted); max-width: 16ch; }
    .note { font: 400 18px var(--f-mono); color: var(--faint-ink); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("solution"); },
});
