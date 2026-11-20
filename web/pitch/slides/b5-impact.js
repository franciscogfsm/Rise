/* Parte B · 10 · Aplicabilidade: qualquer repo, qualquer cloud S3, um comando. E o que fica de fora. */
RISE.slide({
  id: "impact",
  title: "Impact",
  time: "3:55 – 4:25",
  notes: `
"RISE works on any repository and any S3-compatible cloud. Presets for seven providers, Leaseweb included. Today we tested AWS live."
"One Docker command. No cloud account needed, no AI key needed."
"For Leaseweb, this goes straight into onboarding: the 89% who can't leave in three weeks get a way to find out, before they commit."
"And we're honest about scope: today it proves object storage. Queues, databases and functions are flagged as lock-in, not yet tested."
"It's open source, Apache 2.0."`,

  PROVIDERS: ["AWS S3", "Leaseweb", "Backblaze B2", "Wasabi", "Scaleway", "Hetzner", "Cloudflare R2"],

  html: `
    <div class="im">
      <h2 class="title split">Any repo. Any S3 cloud. One command.</h2>
      <div class="cols">
        <div class="left">
          <p class="cmd glass rv" style="--i:3"><code>docker compose up</code></p>
          <ul class="pts">
            <li class="rv" style="--i:4">No cloud account. No AI key.</li>
            <li class="rv" style="--i:5">Python, JavaScript, Go, Java, PHP.</li>
            <li class="rv" style="--i:6">Fits Leaseweb onboarding: customers arrive with proof.</li>
          </ul>
        </div>
        <div class="right">
          <p class="lbl rv" style="--i:4">Provider presets</p>
          <div class="chips"></div>
          <p class="foot rv" style="--i:9">AWS tested live today.</p>
        </div>
      </div>
      <div class="scope rv" style="--i:10">
        <span class="pill ok">Proven today</span><span>S3 object storage</span>
        <span class="pill warn">Flagged, not tested</span><span>queues, databases, functions</span>
        <span class="lic">Apache 2.0</span>
      </div>
    </div>`,

  css: `
    .im { height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
    .title { max-width: 20ch; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 120px; align-items: start; }
    .cmd { display: inline-block; padding: 22px 30px; --radius: 18px; }
    .cmd code { font: 500 34px var(--f-mono); color: var(--ink); }
    .pts { list-style: none; display: grid; gap: 18px; margin-top: 36px; }
    .pts li { position: relative; padding-left: 34px; font-size: var(--t2); line-height: 1.35; }
    .pts li::before { content: ""; position: absolute; left: 0; top: .55em; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); }
    .lbl { font-size: var(--t1); font-weight: 600; color: var(--muted); margin-bottom: 18px; }
    .chips { display: flex; flex-wrap: wrap; gap: 12px; }
    .chips span { font-size: var(--t2); font-weight: 500; padding: 12px 22px; border-radius: 999px; background: rgba(255,255,255,.8); box-shadow: inset 0 0 0 1px var(--line); }
    .chips span.live { box-shadow: inset 0 0 0 2px var(--ok); color: var(--ok); }
    .foot { margin-top: 18px; font-size: var(--t1); color: var(--muted); }
    .scope { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; font-size: var(--t1); color: var(--muted); }
    .scope span:nth-child(2) { margin-right: 20px; color: var(--ink); }
    .scope .lic { margin-left: auto; font-weight: 600; color: var(--ink); }`,

  init(el) {
    el.querySelector(".chips").innerHTML = this.PROVIDERS.map((p, i) =>
      `<span class="rv${p === "AWS S3" ? " live" : ""}" style="--i:${5 + i * .5}">${p}</span>`).join("");
    FX.prep(el);
  },
  enter() { FX.act("solution"); },
});
