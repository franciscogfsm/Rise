/* RISE Fast: the scanner at scale, what an LLM would cost for the same job, and the precision check. */
RISE.slide({
  id: "benchmark",
  title: "RISE Fast",
  time: "1:45 – 2:05",
  notes: `
"RISE Fast scanned 40 million lines across 339 public repos in 84 seconds, using zero LLM tokens. On 26 fresh repos, it found 41 of 42 S3 calls in 79 milliseconds. We also trained a 1.3-kilobyte model to help review ambiguous calls."
Speed: our test, 4 Claude Sonnet agents on 20 repos (62k lines): 4.5 min and 564k tokens; RISE 0.77 s, 0 tokens → ~350×. Codex: 26 fresh repos, 20.05 s vs 79 ms → 254× (Codex found 42/42, RISE 41/42).
ChatGPT/GPT-5.6 input costs the same $2 per million tokens as Claude Sonnet 5.5, so ≈ $730 holds for both.
If asked: the token figure is an estimate from our own test (Claude used 564k tokens for 62k lines), $2 per million input tokens (Claude Sonnet 5.5). Timings exclude download. The 0 missed covers calls to official S3 API operation names.`,

  html: `
    <div class="fast-stage">
      <header>
        <h2 class="title split">RISE <span class="fast-accent">Fast.</span></h2>
        <p class="fast-deck rv" style="--i:2">Every cloud call. None missed. Zero tokens.</p>
      </header>

      <div class="fast-layout">
        <div class="fast-hero glass rv left" style="--i:3">
          <p class="fast-label">Tested on real repos · today</p>
          <b>40M</b>
          <p>lines in <strong>84 s</strong></p>
          <span>339 real repos · Sentry, Airflow, aws-cli…</span>
          <div class="prec"><b>0</b><p><strong>S3 calls missed</strong>14,887 checked against the official S3 API</p></div>
        </div>
        <div class="fast-cost glass rv right" style="--i:5">
          <p class="fast-label">To read those 40M lines</p>
          <div class="bar llm"><span>Claude<br>ChatGPT</span><i></i><b>≈ 365M tokens</b><em>≈ $730 · days of agent time</em></div>
          <div class="bar rise"><span>RISE</span><i></i><b>0 tokens</b><em>$0 · 84 s</em></div>
          <div class="speed"><div><b>350×</b><span>faster than Claude</span></div><div><b>254×</b><span>faster than OpenAI Codex</span></div></div>
        </div>
      </div>

      <div class="fast-foot rv" style="--i:8">
        <div class="model"><b>1.3 KB</b><span><strong>Our own ML model</strong>Trained in-house. Runs on your laptop. 0 tokens.</span></div>
        <div class="plugs"><span class="fast-label">Plugs into</span><i>Claude Code</i><i>Any MCP client</i><i>REST API</i><i>Dashboard</i></div>
      </div>
    </div>`,

  css: `
    .fast-stage { display: grid; height: 100%; grid-template-rows: auto 1fr auto; gap: 26px; }
    .fast-accent { color: var(--accent); }
    .fast-deck { font-size: 36px; color: var(--muted); }
    .fast-layout { display: grid; grid-template-columns: .8fr 1.3fr; gap: 30px; align-self: center; }
    .fast-hero, .fast-cost { --radius: 30px; padding: 34px 40px; }
    .fast-hero { display: grid; align-content: center; gap: 12px; background: color-mix(in srgb, var(--accent) 8%, white); }
    .fast-label { font: 600 21px/1.2 var(--f-mono); color: var(--muted); }
    .fast-hero > b { font-size: 150px; line-height: .9; letter-spacing: -.07em; color: var(--accent); }
    .fast-hero > p:nth-child(3) { font-size: 44px; line-height: 1.08; letter-spacing: -.035em; }
    .fast-hero > span { font-size: 23px; color: var(--muted); }
    .prec { margin-top: 10px; display: flex; align-items: center; gap: 20px; padding: 16px 22px; border-radius: 20px; background: var(--ok-bg);
      opacity: 0; transform: scale(.94); transition: opacity .5s var(--e-out) 2.6s, transform .8s var(--e-spring) 2.6s; }
    &.cur .prec { opacity: 1; transform: none; }
    .prec b { font-size: 72px; line-height: .9; letter-spacing: -.05em; color: var(--ok); }
    .prec p { display: grid; gap: 2px; font-size: 20px; color: var(--muted); }
    .prec strong { font-size: 28px; color: var(--ok); letter-spacing: -.01em; }

    .fast-cost { display: grid; align-content: center; gap: 30px; }
    .bar { position: relative; display: grid; grid-template-columns: 150px 1fr; grid-template-rows: 56px auto; gap: 10px 22px; align-items: center; }
    .bar > span { grid-row: 1 / 3; font-size: 28px; line-height: 1.1; font-weight: 650; align-self: start; padding-top: 10px; }
    .bar > i, .bar > b { grid-area: 1 / 2; }
    .bar > i { height: 56px; border-radius: 16px; width: 0; transition: width 1.6s cubic-bezier(.2,.7,.2,1) .9s; }
    .bar.llm > i { background: linear-gradient(90deg, color-mix(in srgb, var(--bad) 55%, #fff), var(--bad)); }
    .bar.rise > i { background: var(--accent); }
    &.cur .bar.llm > i { width: 100%; }
    &.cur .bar.rise > i { width: 6px; }
    .bar > b { justify-self: start; margin-left: 22px; font-size: 32px; font-weight: 700; letter-spacing: -.02em; color: #fff; z-index: 1; opacity: 0; transition: opacity .6s 2.2s; }
    .bar.rise > b { color: var(--accent); margin-left: 26px; }
    &.cur .bar > b { opacity: 1; }
    .bar > em { grid-column: 2; font: 600 22px/1 var(--f-mono); font-style: normal; color: var(--muted); }
    .bar.rise > em { color: var(--accent); }
    .speed { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-top: 22px; border-top: 1px solid var(--line); }
    .speed div { display: flex; align-items: baseline; gap: 14px; }
    .speed b { font-size: 64px; line-height: .9; font-weight: 700; letter-spacing: -.05em; color: var(--accent); }
    .speed span { font-size: 24px; font-weight: 600; color: var(--muted); }
    .codex { display: flex; align-items: baseline; gap: 12px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 24px; color: var(--muted); }
    .codex b { color: var(--accent); }
    .codex i { font-style: normal; color: var(--faint-ink); }

    .fast-foot { display: flex; justify-content: space-between; align-items: center; gap: 30px; }
    .model { display: flex; align-items: center; gap: 22px; }
    .model b { font-size: 50px; letter-spacing: -.05em; color: var(--ok); }
    .model span { display: grid; gap: 2px; font-size: 22px; color: var(--muted); }
    .model strong { font-size: 27px; color: var(--ink); }
    .plugs { display: flex; align-items: center; gap: 12px; }
    .plugs i { font-style: normal; font-size: 22px; font-weight: 600; padding: 12px 18px; border-radius: 999px; background: #fff; box-shadow: inset 0 0 0 1px var(--line); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("proof"); },
});
