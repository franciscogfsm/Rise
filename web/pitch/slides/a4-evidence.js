/* Parte A · 4 · Porque é melhor do que pôr uma IA a ler o repositório. */
RISE.slide({
  id: "evidence",
  title: "AI reads evidence",
  time: "1:15 – 1:40",
  notes: `
"Why not just give the repository to an AI?"
"A big repo doesn't fit in its context, so it samples and misses things. It can invent or forget dependencies, and it changes its mind between runs. Its proof is 'I think it uses SQS'."
"RISE reads every file, deterministically. Same input, same output. Its proof is a file and a line."
"The cost doesn't grow with the repo, it's under a second, and your code never leaves: the AI only sees the evidence, with keys redacted."
(devagar) "The AI never reads your code. It reads the evidence."`,

  ROWS: [
    ["Large repo", "Doesn't fit. Samples and misses.", "Reads 100% of the files."],
    ["Result", "Invents or forgets. Changes every run.", "Deterministic. Same input, same output."],
    ["Proof", "“I think it uses SQS.”", "<code>src/queue.py:42</code>"],
    ["Cost", "Grows with the repo. Millions of tokens.", "Fixed. About 3,700 tokens."],
    ["Speed", "Minutes.", "Under 1 second."],
    ["Privacy", "All your code goes to an AI provider.", "Code never leaves. AI sees evidence, keys redacted."],
    ["Trust", "“The AI said yes.”", "Real tests and SHA-256."],
  ],

  html: `
    <div class="ev">
      <h2 class="title split">The AI never reads your code. It reads the evidence.</h2>
      <div class="table" role="table">
        <div class="hd" role="row"><span role="columnheader"></span><span role="columnheader">AI reads the code</span><span role="columnheader" class="r">RISE</span></div>
        <div class="rows"></div>
        <div class="rise-col glass" aria-hidden="true"></div>
      </div>
    </div>`,

  css: `
    .ev { height: 100%; display: grid; grid-template-rows: auto 1fr; gap: 44px; }
    .title { max-width: 24ch; }
    .table { position: relative; align-self: start; }
    .hd, .row { position: relative; z-index: 1; display: grid; grid-template-columns: 240px 1fr 1fr; column-gap: 48px; align-items: baseline; }
    .hd { padding: 0 0 18px; font-size: var(--t1); font-weight: 600; color: var(--muted); }
    .hd .r { color: var(--ink); padding-left: 32px; }
    .row { padding: 17px 0; border-top: 1px solid var(--line); }
    .row b { font-size: var(--t1); font-weight: 600; color: var(--muted); }
    .row .ai { font-size: 26px; line-height: 1.3; color: var(--faint-ink); }
    .row .rise { font-size: 26px; line-height: 1.3; font-weight: 600; color: var(--ink); padding-left: 32px; }
    .row code { font: 500 24px var(--f-mono); color: var(--accent); background: rgba(37,99,235,.08); padding: 4px 10px; border-radius: 8px; }
    .rise-col { position: absolute; z-index: 0; top: -22px; bottom: -14px; right: -28px; width: calc((100% - 240px - 96px) / 2 + 28px); --radius: 28px; }`,

  init(el) {
    el.querySelector(".rows").innerHTML = this.ROWS.map(([k, ai, rise], i) => `
      <div class="row rv" style="--i:${3 + i}" role="row">
        <b role="rowheader">${k}</b><span class="ai" role="cell">${ai}</span><span class="rise" role="cell">${rise}</span>
      </div>`).join("");
    FX.prep(el);
  },
  enter() { FX.act("solution"); },
});
