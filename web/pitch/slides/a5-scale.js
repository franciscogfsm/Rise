/* Part A · Scale benchmark and an illustrated view of the scanner. */
RISE.slide({
  id: "scale",
  title: "Measured at scale",
  time: "1:40 – 2:00",
  notes: `
"We fed Apache Airflow into RISE: 10,593 files and 2.3 million lines."
"RISE scans those files across CPU cores and merges the findings. This graph shows what we keep: where the call is, what it depends on, and what to test."
"Take a presigned URL. We can point to the call in the code, then test whether that kind of link actually works on the destination."
"It took 0.86 seconds to find the evidence and map the risks. The AI gets selected findings, and the test runs against real S3 endpoints."
If asked: 0.86 s covers scanning and risk analysis. Download, model calls and provider tests are timed separately. The graph illustrates the relationships in the report. The token figure varies by analysis.`,

  html: `
    <div class="sc">
      <header>
        <h2 class="title split">2.3 million lines in 0.86 seconds.</h2>
        <p class="scale-repo rv" style="--i:2">Apache Airflow · 10,593 files · 91 MB · scan + risk analysis</p>
      </header>
      <figure class="scale-map" aria-label="Illustrated pipeline. Repository files fan out to parallel CPU workers. Findings merge into evidence that informs the test plan.">
        <div class="scale-card glass rv left" style="--i:3">
          <span>Repository</span>
          <strong>10,593 files</strong>
          <span>Apache Airflow</span>
        </div>
        <div class="scale-workers" aria-label="Parallel CPU workers">
          <span class="worker rv pop" style="--i:5">CPU</span>
          <span class="worker rv pop" style="--i:6">CPU</span>
          <span class="worker rv pop" style="--i:7">CPU</span>
          <span class="worker rv pop" style="--i:8">CPU</span>
        </div>
        <div class="scale-card evidence glass rv scale" style="--i:10">
          <span>Evidence graph</span>
          <strong>File → cloud operation</strong>
          <span class="scale-example rv" style="--i:12">Example · code line → presigned URL</span>
        </div>
        <div class="scale-card plan glass rv right" style="--i:13">
          <span>Selected findings</span>
          <strong>AI test plan</strong>
          <span class="scale-example rv" style="--i:15">Test the URL on real S3</span>
        </div>
        <svg class="scale-wires rv fade" style="--i:3" viewBox="0 0 1680 300" preserveAspectRatio="none" aria-hidden="true">
          <path class="draw" d="M382 150 C440 150 464 66 535 66 M382 150 C448 150 469 122 535 122 M382 150 C448 150 469 178 535 178 M382 150 C440 150 464 234 535 234"/>
          <path class="draw" d="M627 66 C698 66 718 150 776 150 M627 122 C690 122 715 150 776 150 M627 178 C690 178 715 150 776 150 M627 234 C698 234 718 150 776 150"/>
          <path class="draw" d="M1248 150 H1320"/>
        </svg>
      </figure>
      <div class="scale-stats">
        <div class="rv" style="--i:13"><b>2.7M</b><span>lines scanned per second</span></div>
        <div class="rv" style="--i:15"><b>~3,700</b><span>AI tokens in an example analysis</span></div>
      </div>
      <p class="scale-note rv" style="--i:16">Benchmark · 20 Nov 2026 · Scan time excludes download, AI calls and provider tests. Illustrative graph.</p>
    </div>`,

  css: `
    .sc { height: 100%; display: grid; grid-template-rows: auto 1fr auto auto; gap: 26px; }
    .scale-repo { font: 500 25px/1.4 var(--f-mono); color: var(--muted); }
    .scale-map { isolation: isolate; position: relative; display: grid; grid-template-columns: 1fr .66fr 1.23fr .94fr; gap: 66px; align-items: center; }
    .scale-card { --radius: 28px; min-height: 175px; padding: 26px; display: grid; align-content: center; gap: 10px; }
    .scale-card strong { font-size: 35px; line-height: 1.08; letter-spacing: -.04em; }
    .scale-card span { color: var(--muted); font-size: 22px; line-height: 1.16; }
    .scale-card span:first-child { font: 600 19px/1.15 var(--f-mono); color: var(--accent); }
    .scale-card .scale-example { font-size: 20px; }
    .scale-card.evidence { background: color-mix(in srgb, var(--accent) 10%, white); }
    .scale-card.plan { background: color-mix(in srgb, var(--ok-bg) 62%, white); }
    .scale-workers { display: grid; gap: 14px; justify-items: center; }
    .worker { display: grid; place-items: center; width: 98px; height: 42px; border-radius: 999px; color: var(--accent); background: white; box-shadow: 0 4px 16px #2563eb20; font: 600 18px var(--f-mono); }
    .scale-map .scale-wires { position: absolute; top: calc(50% - 150px); left: 0; z-index: -1; width: 100%; height: 300px; pointer-events: none; overflow: visible; }
    .scale-wires path { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; opacity: .6; }
    .scale-wires path:nth-child(2) { transition-delay: .48s; }
    .scale-wires path:last-child { stroke: var(--ok); transition-delay: .84s; }
    .scale-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 34px; border-top: 1px solid var(--line); padding-top: 20px; }
    .scale-stats > div { display: flex; align-items: baseline; gap: 22px; }
    .scale-stats b { font-size: 74px; line-height: 1; font-weight: 700; letter-spacing: -.06em; color: var(--accent); white-space: nowrap; }
    .scale-stats span { font-size: 25px; color: var(--muted); }
    .scale-note { font: 500 19px/1.3 var(--f-mono); color: var(--muted); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("solution"); },
});
