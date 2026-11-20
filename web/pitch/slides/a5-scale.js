/* RISE Fast: deterministic discovery benchmark and optional local classifier. */
RISE.slide({
  id: "benchmark",
  title: "RISE Fast",
  time: "1:45 – 2:00",
  notes: `
"Meet RISE Fast. It finds every cloud call in your code, it misses none, and it costs zero tokens."
"Fast means nothing if it's wrong. So we checked it against the official S3 API: 14,887 real calls in those repos. Missed: zero. Every leftover was reviewed by hand."
"We ran it on 339 real repositories, Sentry, Airflow, aws-cli: 40 million lines in 84 seconds. For an LLM to read that, it would take around 365 million tokens, about 730 dollars and hours. RISE: zero tokens. (Estimate from our own test: Claude used 564k tokens for 62k lines.)"
"And we trained our own ML model: 1.3 kilobytes, trained on S3 calls we reviewed by hand. It runs on your laptop, no cloud AI, and keeps learning from confirmed corrections. Its suggestions leave the verified verdict to the real tests."
Fresh test, if asked about accuracy: on 26 new repos the scanner found 41 of 42 reference call sites in 79 ms; OpenAI Codex found 42 in 20 s.
If asked: the 79 ms is the deterministic scanner, including its risk scan. The optional model left coverage unchanged on this fresh sample. The comparison used selected application source files with one reviewer and excludes downloads. The 339-repo throughput run is separate. $730 = 365M input tokens at Claude Sonnet 5.5's $2 per million.`,

  html: `
    <div class="fast-stage">
      <header>
        <h2 class="title split">RISE <span class="fast-accent">Fast.</span></h2>
        <p class="fast-deck rv" style="--i:2">Every cloud call. None missed. Zero tokens.</p>
      </header>

      <div class="fast-layout">
        <div class="fast-hero glass rv left" style="--i:3">
          <p class="fast-label">Tested on real repos</p>
          <b>40M</b>
          <p>lines in <strong>84 s</strong></p>
          <span>339 real repos · Sentry, Airflow, aws-cli…</span>
          <div class="prec"><b>0</b><p><strong>S3 calls missed</strong>14,887 checked against the official S3 API</p></div>
        </div>
        <div class="fast-cost glass rv right" style="--i:5">
          <p class="fast-label">To read those 40M lines</p>
          <div class="bar llm"><span>An LLM</span><i></i><b>≈ 365M tokens</b><em>≈ $730 · hours</em></div>
          <div class="bar rise"><span>RISE</span><i></i><b>0 tokens</b><em>$0 · 84 s</em></div>
        </div>
      </div>

      <div class="fast-foot rv" style="--i:8">
        <div class="model"><b>1.3 KB</b><span><strong>Our own ML model</strong>Trained in-house. Runs on your laptop. 0 tokens.</span></div>
        <div class="plugs"><span class="fast-label">Plugs into</span><i>Claude Code</i><i>Any MCP client</i><i>REST API</i><i>Dashboard</i></div>
      </div>
    </div>`,

  css: `
    .fast-stage { display: grid; height: 100%; grid-template-rows: auto 1fr auto; gap: 30px; }
    .fast-accent { color: var(--accent); }
    .fast-deck { font-size: 36px; color: var(--muted); }
    .fast-layout { display: grid; grid-template-columns: .8fr 1.3fr; gap: 30px; align-self: center; }
    .fast-hero, .fast-cost { --radius: 30px; padding: 38px 40px; }
    .fast-hero { display: grid; align-content: center; gap: 14px; background: color-mix(in srgb, var(--accent) 8%, white); }
    .fast-label { font: 600 21px/1.2 var(--f-mono); color: var(--muted); }
    .fast-hero > b { font-size: 168px; line-height: .9; letter-spacing: -.07em; color: var(--accent); }
    .fast-hero > p:nth-child(3) { font-size: 46px; line-height: 1.08; letter-spacing: -.035em; }
    .fast-hero > span { font-size: 24px; color: var(--muted); }
    .prec { margin-top: 14px; display: flex; align-items: center; gap: 20px; padding: 18px 22px; border-radius: 20px; background: var(--ok-bg); }
    .prec b { font-size: 76px; line-height: .9; letter-spacing: -.05em; color: var(--ok); }
    .prec p { display: grid; gap: 2px; font-size: 21px; color: var(--muted); }
    .prec strong { font-size: 29px; color: var(--ok); letter-spacing: -.01em; }
    .prec { opacity: 0; transform: scale(.94); transition: opacity .5s var(--e-out) 2.6s, transform .8s var(--e-spring) 2.6s; }
    &.cur .prec { opacity: 1; transform: none; }

    .fast-cost { display: grid; align-content: center; gap: 34px; }
    .bar { display: grid; grid-template-columns: 150px 1fr; grid-template-rows: 56px auto; gap: 10px 22px; align-items: center; }
    .bar > span { grid-row: 1 / 3; font-size: 30px; font-weight: 650; align-self: start; padding-top: 10px; }
    .bar > i { height: 56px; border-radius: 16px; width: 0; transition: width 1.6s cubic-bezier(.2,.7,.2,1) .9s; }
    .bar > b { position: absolute; }
    .bar { position: relative; }
    .bar.llm > i { background: linear-gradient(90deg, color-mix(in srgb, var(--bad) 55%, #fff), var(--bad)); }
    .bar.rise > i { background: var(--accent); min-width: 0; }
    &.cur .bar.llm > i { width: 100%; }
    &.cur .bar.rise > i { width: 6px; }
    .bar > b { grid-column: 2; grid-row: 1; justify-self: start; position: static; margin-left: 22px; font-size: 32px; font-weight: 700; letter-spacing: -.02em; color: #fff; z-index: 1; opacity: 0; transition: opacity .6s 2.2s; }
    .bar.rise > b { color: var(--accent); margin-left: 26px; }
    &.cur .bar > b { opacity: 1; }
    .bar > b, .bar > i { grid-area: 1 / 2; }
    .bar > em { grid-column: 2; font: 600 22px/1 var(--f-mono); font-style: normal; color: var(--muted); }
    .bar.rise > em { color: var(--accent); }

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
