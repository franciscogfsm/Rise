/*
  RISE film · SCENES. One SCENE per id in script.js (same order there decides the film order).
  html: string, or (tm) => string where tm.dur is the scene length (use it for "near the end" moments).
  Motion: add class "fx <name>" and style "--at: seconds into the scene" (names in film.html: in fade slam pop mask tilt
  fly-l fly-r out gone push drift draw flash ring shake strike sweep blink zoom move grow-x).
  css: scoped to the scene (CSS nesting). raw: global CSS (for @keyframes).
  shot(name, [x, y, w, h], width): crop of a real RISE screenshot in shots/ (x/y/w/h in the app's CSS px, 1600 wide).
  [data-count] counts up to a REAL number, [data-type] types a REAL string. Never put a number here that is not in
  benchmark/STATS.md, WHAT_RISE_DOES.md or on a screenshot.

  THEME: the pitch's Pearl Pro, in every scene. Ink text on the pearl background, glass cards, --accent blue,
  coral (--bad) only for what breaks, mint (--ok) only for what is proven. No dark scenes, no neon.
*/

const LOGO = (at) => `
<svg class="logo" viewBox="7.5 9.5 45 39" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <defs><linearGradient id="lg${at}" x1="11" y1="45" x2="49" y2="13" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#121F35"/><stop offset="1" stop-color="#2563EB"/></linearGradient></defs>
  <path class="fx draw" pathLength="1" style="--len:1;--at:${at};--d:.7s;stroke:var(--accent-soft)" d="M11 31.5c7.1-.2 12.5-2.9 17.4-7.9" stroke-width="5"/>
  <path class="fx draw" pathLength="1" style="--len:1;--at:${at + 0.1};--d:.8s" d="M11 45c10.5 0 19.2-6.2 27.6-17.9L49 13" stroke="url(#lg${at})" stroke-width="6.5"/>
  <path class="fx draw" pathLength="1" style="--len:1;--at:${at + 0.55};--d:.4s;stroke:#2563EB" d="M35 13h14v14" stroke-width="6.5"/>
</svg>`;

/* ───────────── 1 · MEET PAUL ───────────── */
SCENE("paul", {
  push: 1.06,
  html: `
    <i class="ring fx" style="--at:.75;--s:6;--rc:var(--accent-soft)"></i>
    <div class="center"><div>
      <h1 class="meet fx slam" style="--at:.75;--from:2.4">Meet <b>Paul.</b></h1>
      <i class="horizon fx grow-x" style="--at:.2"></i>
      <p class="role fx in" style="--at:1.3">Head of Platform · one app · one cloud</p>
    </div></div>
    <div class="foot fx fade" style="--at:1.7">Paul is fictional. Every number in this film was measured, and every RISE screen is a real capture.</div>`,
  css: `
    .meet { font-size: 200px; font-weight: 700; letter-spacing: -.055em; line-height: .9; margin: 0; }
    .meet b { background: linear-gradient(100deg, #121F35 10%, #2563EB 90%); -webkit-background-clip: text; color: transparent; }
    .horizon { width: 1100px; margin: 44px auto 40px; }
    .role { margin: 0; font: 500 28px/1 var(--f-mono); color: var(--muted); letter-spacing: .04em; }`,
});

/* ───────────── 2 · HE WANTS A NEW CLOUD ───────────── */
SCENE("want", {
  html: `
    <div class="title">${words("Same app.", .1, .09)} <span class="soft">${words("New cloud.", .3, .09)}</span></div>
    <div class="node glass-card a fx fly-l" style="--at:.15"><span class="kick">today</span><b class="mono">us-east-1</b><em>every byte in one place</em></div>
    <div class="node glass-card b fx fly-r" style="--at:.35"><span class="kick">next</span><b>New cloud · EU</b><em>cheaper · sovereign · closer</em></div>
    <svg class="arc" viewBox="0 0 1920 1080"><path class="fx draw" style="--at:.6;--d:1s;--len:900" d="M700 620 C 860 380, 1060 380, 1220 620"/></svg>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<i class="pk fx" style="--fx:pk;--d:1.1s;--n:infinite;--ease:cubic-bezier(.5,0,.5,1);--at:${(1.2 + i * 0.18).toFixed(2)}"></i>`).join("")}`,
  css: `
    .title { position: absolute; top: 150px; width: 100%; text-align: center; font-size: 112px; font-weight: 600; letter-spacing: -.045em; }
    .node { position: absolute; top: 520px; width: 470px; padding: 34px 38px; display: grid; gap: 10px; }
    .node.a { left: 210px; } .node.b { right: 210px; box-shadow: inset 0 0 0 2.5px var(--accent), 0 30px 70px -24px rgba(37,99,235,.5); background: rgba(255,255,255,.9); }
    .node .kick { color: var(--muted); font-size: 20px; } .node.b .kick { color: var(--accent); }
    .node b { font-size: 50px; letter-spacing: -.03em; } .node em { font-style: normal; color: var(--muted); font-size: 24px; }
    .arc { position: absolute; inset: 0; } .arc path { fill: none; stroke: var(--accent); stroke-width: 4; stroke-dasharray: 900; }
    .pk { position: absolute; left: 0; top: 0; width: 18px; height: 18px; margin: -9px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 6px rgba(37,99,235,.16);
      offset-path: path("M700 620 C 860 380, 1060 380, 1220 620"); offset-rotate: 0deg; }`,
  raw: `@keyframes pk { from { offset-distance: 0%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } to { offset-distance: 100%; opacity: 0; } }`,
});

/* ───────────── 3 · STORAGE CALLS EVERYWHERE · PRODUCTION BREAKS ───────────── */
const CODE = [
  ["import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'", 0],
  ["const s3 = new S3Client({ region: 'us-east-1' })", 1],
  ["export async function uploadAvatar(user, file) {", 0],
  ["  await s3.send(new PutObjectCommand({ Bucket, Key: user.id + '.png', Body: file }))", 1],
  ["  return cdn(user.id)", 0], ["}", 0],
  ["s3 = boto3.client('s3', region_name='us-east-1')", 1],
  ["def export_report(job):", 0],
  ["    s3.upload_fileobj(buf, BUCKET, f'reports/{job.id}.pdf')", 1],
  ["    url = s3.generate_presigned_url('get_object', Params=p, ExpiresIn=300)", 1],
  ["    notify(job.owner, url)", 0],
  ["const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key }))", 1],
  ["for obj in s3.list_objects_v2(Bucket=BUCKET, Prefix='invoices/')['Contents']:", 1],
  ["    archive(obj['Key'])", 0],
  ["await s3.send(new CopyObjectCommand({ CopySource, Bucket, Key, MetadataDirective: 'REPLACE' }))", 1],
  ["meta = s3.head_object(Bucket=BUCKET, Key=key)['Metadata']", 1],
  ["if (!meta['x-owner']) throw new Forbidden()", 0],
  ["s3.delete_object(Bucket=BUCKET, Key=tmp)", 1],
  ["$s3->putObject(['Bucket' => $b, 'Key' => $k, 'ContentType' => 'image/svg+xml'])", 1],
  ["client.PutObject(ctx, &s3.PutObjectInput{Bucket: &b, Key: &k, Body: r})", 1],
  ["const { Body } = await s3.send(new GetObjectCommand({ Bucket, Key, Range: 'bytes=0-31' }))", 1],
  ["cache.set(key, body)", 0],
];
SCENE("fear", {
  push: 1.0,
  html: (tm) => {
    const crash = tm.dur - 1.25;
    let hot = 0;
    const lines = [...CODE, ...CODE, ...CODE].map(([c, s], i) =>
      `<div class="ln ${s ? "s3 fx" : ""}" ${s ? `style="--fx:hot;--d:.25s;--at:${(0.4 + (hot++) * 0.17).toFixed(2)}"` : ""}><span>${String(i + 1).padStart(3, " ")}</span>${c.replace(/</g, "&lt;")}</div>`).join("");
    return `
    <div class="shk fx shake" style="--at:${crash};--d:.7s">
      <div class="wall"><div class="scroll fx drift" style="--d:${tm.dur}s;--y1:-1100px">${lines}</div></div>
      <div class="cap"><span>${words("Storage calls. Everywhere.", .3, .08)}</span></div>
      <div class="crash fx fade" style="--at:${crash};--d:.15s"></div>
      <div class="center down"><div>
        <div class="big fx slam" style="--at:${crash};--d:.35s;--from:1.6">503</div>
        <div class="kick fx in" style="--at:${crash + 0.2};--d:.4s">production down</div>
      </div></div>
    </div>`;
  },
  css: `
    .shk { position: absolute; inset: 0; }
    .wall { position: absolute; left: 50%; top: 50%; width: 2000px; height: 1700px; transform: translate(-50%, -46%) perspective(1300px) rotateX(32deg) rotateZ(-9deg);
      -webkit-mask-image: linear-gradient(transparent, #000 25%, #000 70%, transparent); }
    .ln { font: 500 30px/52px var(--f-mono); color: rgba(18,31,53,.34); white-space: pre; padding: 0 20px; border-radius: 10px; }
    .ln span { color: rgba(18,31,53,.18); margin-right: 34px; }
    .cap { position: absolute; left: 0; right: 0; bottom: 110px; text-align: center; font-size: 88px; font-weight: 600; letter-spacing: -.04em; }
    .cap > span { display: inline-block; padding: 14px 44px 20px; border-radius: 32px; background: rgba(255,255,255,.82); box-shadow: 0 30px 70px -24px rgba(26,41,63,.28), inset 0 0 0 1px rgba(255,255,255,.7); }
    .crash { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(252,224,217,.97), rgba(247,248,250,.97) 75%); }
    .down { z-index: 3; } .big { font: 750 400px/.85 var(--f-ui); letter-spacing: -.06em; color: var(--bad); }
    .down .kick { color: var(--ink); font-size: 40px; letter-spacing: .4em; margin-top: 26px; }`,
  raw: `@keyframes hot { to { color: var(--bad); background: var(--bad-bg); } }`,
});

/* ───────────── 4 · THE MIGRATION WAITS ───────────── */
const QS = ["Q1 2027", "Q2 2027", "Q3 2027", "Q4 2027", "2028"];
SCENE("stuck", {
  push: 1.05,
  html: (tm) => {
    const step = Math.min(0.5, (tm.dur - 0.9) / QS.length);
    return `
    <div class="kick head fx in" style="--at:.05">migration status</div>
    <div class="row fx drift" style="--d:${tm.dur}s;--x1:-120px">
      ${QS.map((q, i) => `<div class="cal glass-card fx" style="--fx:flip;--d:.45s;--at:${(0.1 + i * step).toFixed(2)}"><span>${q}</span>
        <b class="stamp fx slam" style="--at:${(0.3 + i * step).toFixed(2)};--d:.3s;--from:2.2">postponed</b></div>`).join("")}
    </div>
    <div class="flash fx" style="--at:${tm.dur - 0.25};--d:.5s"></div>`;
  },
  css: `
    .head { position: absolute; top: 210px; width: 100%; text-align: center; color: var(--muted); font-size: 26px; }
    .row { position: absolute; top: 400px; left: 150px; display: flex; gap: 40px; }
    .cal { width: 300px; height: 300px; display: grid; place-items: center; position: relative; transform-origin: 50% 0; }
    .cal span { font: 650 54px/1 var(--f-ui); letter-spacing: -.03em; }
    .stamp { position: absolute; bottom: 40px; padding: 8px 16px; border: 4px solid var(--bad); color: var(--bad); border-radius: 10px; background: var(--bad-bg);
      font: 700 28px/1 var(--f-mono); text-transform: uppercase; letter-spacing: .12em; rotate: -9deg; }`,
  raw: `@keyframes flip { from { transform: perspective(900px) rotateX(-95deg); opacity: 0; } }`,
});

/* ───────────── 5 · UNTIL RISE (the pitch cover) ───────────── */
SCENE("rise", {
  push: 1.04,
  html: `
    <div class="flash fx" style="--at:0;--d:1s"></div>
    <i class="ring fx" style="--at:.05;--s:7"></i><i class="ring fx" style="--at:.2;--s:5;--rc:var(--accent-soft)"></i>
    <div class="center"><div>
      <div class="lock"><span class="word fx slam" style="--at:.12;--from:2.4">RISE</span><span class="mark"><i class="halo"></i>${LOGO(0.25)}</span></div>
      <i class="horizon fx grow-x" style="--at:.5"></i>
      <p class="tag kick fx in" style="--at:1.1">the proof of cloud freedom</p>
    </div></div>`,
  css: `
    .lock { display: flex; align-items: baseline; justify-content: center; gap: .04em; font: 700 300px/.82 var(--f-ui); }
    .word { letter-spacing: .06em; color: var(--ink); }
    .mark { position: relative; display: block; height: .705em; }
    .halo { position: absolute; inset: -20%; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 22%, transparent), transparent); filter: blur(30px); }
    .logo { position: relative; display: block; height: 100%; width: auto; overflow: visible; }
    .horizon { width: 1100px; margin: 44px auto 48px; }
    .tag { margin: 0; color: var(--accent); font-size: 30px; letter-spacing: .3em; }`,
});

/* ───────────── 6 · PASTE A REPO ───────────── */
SCENE("box", {
  html: (tm) => {
    const W = 1500, k = W / 940;
    return `
    <div class="frame fx zoom" style="--at:${tm.dur - 0.55};--d:.6s;--zs:5;--zx:-2400px;--zy:-1700px;--ease:cubic-bezier(.7,0,.84,0)">
      <div class="fx tilt" style="--at:0">
        ${shot("home", [330, 40, 940, 330], W)}
        <div class="typed fx fade" style="--at:.35;--d:.05s;left:${12 * k}px;top:${172 * k}px">${shot("home-typed", [342, 212, 862, 144], 862 * k)}
          <i class="hide fx" style="--fx:typeon;--d:1.9s;--ease:linear;--at:.4;left:${(360 - 342) * k}px;top:${(230 - 212) * k}px;width:${640 * k}px;height:${42 * k}px"></i></div>
        <i class="ring fx" style="--at:${tm.dur - 0.75};--s:1.4;left:${(1166 - 330) * k}px;top:${(320 - 40) * k}px;width:120px;height:120px;margin:-60px"></i>
        <svg class="cursor fx move" style="--at:${tm.dur - 1.5};--mx:-${1900 - 210 - (1166 - 330) * k}px;--my:-${1100 - 270 - (320 - 40) * k}px;--d:.7s" viewBox="0 0 24 24"><path d="M3 2l7 19 2.6-7.4L20 11z" fill="#121F35" stroke="#fff" stroke-width="1.5"/></svg>
      </div>
    </div>
    <div class="flash fx" style="--at:${tm.dur - 0.2};--d:.4s"></div>`;
  },
  css: `
    .frame { position: absolute; left: 210px; top: 270px; transform-origin: 1544px 720px; }
    .frame > div { position: relative; }
    .typed { position: absolute; } .typed .shot { border-radius: 0; box-shadow: none; background: transparent; }
    .hide { position: absolute; background: #fff; transform-origin: 100% 50%; }
    .cursor { position: absolute; left: ${1900 - 210}px; top: ${1100 - 270}px; width: 56px; height: 56px; filter: drop-shadow(0 6px 10px rgba(0,0,0,.3)); }`,
  raw: `@keyframes typeon { from { transform: scaleX(1); } to { transform: scaleX(0); } }`,
});

/* ───────────── 7 · READS THE CODE · REAL TESTS ───────────── */
SCENE("scan", {
  html: `
    <div class="p strip fx mask" style="--at:.0;--d:1.4s">${shot("analysis", [292, 64, 960, 32], 1600)}</div>
    <div class="p found fx tilt" style="--at:.25">${shot("analysis", [602, 228, 266, 366], 440)}<span class="lbl fx pop" style="--at:1.2">every storage call · file:line</span></div>
    <div class="p port fx fly-l" style="--at:1.0">${shot("analysis", [292, 228, 296, 198], 470)}</div>
    <div class="p tests fx fly-r" style="--at:1.9">${shot("analysis", [882, 228, 370, 420], 470)}<span class="lbl fx pop" style="--at:2.6">real tests · real S3 calls</span></div>
    <div class="p hero fx slam" style="--at:3.3;--from:1.5">${shot("analysis", [292, 110, 960, 105], 1500)}<i class="sweep fx" style="--at:3.8"></i></div>`,
  css: `
    .p { position: absolute; } .strip { left: 160px; top: 56px; } .found { left: 740px; top: 160px; } .port { left: 220px; top: 240px; }
    .tests { left: 1230px; top: 160px; } .hero { left: 210px; top: 820px; }
    .lbl { position: absolute; left: 50%; bottom: -26px; translate: -50% 0; white-space: nowrap; padding: 12px 20px; border-radius: 999px;
      background: var(--ink); color: #fff; font: 600 21px/1 var(--f-mono); box-shadow: 0 14px 30px rgba(18,31,53,.35); }`,
});

/* ───────────── 8 · RISE FAST against Claude (benchmark/STATS.md §2: same 20 repos, same task) ───────────── */
SCENE("fast", {
  push: 1.03,
  html: (tm) => `
    <div class="kick head fx in" style="--at:0">rise fast · the discovery engine</div>
    <h2>${words("Hundreds of times faster", .1, .07)}<br><span class="soft">${words("than Claude. Zero AI tokens.", .5, .07)}</span></h2>
    <div class="race">
      <div class="lane fx in" style="--at:.5">
        <b>Claude<small>4 agents reading the code</small></b>
        <div class="track"><i class="fx" style="--fx:fill;--d:${(tm.dur - 0.7).toFixed(2)}s;--ease:linear;--at:.7"></i></div>
        <span class="v">~4.5 min<small>~564,000 AI tokens</small></span>
      </div>
      <div class="lane win fx in" style="--at:.7">
        <b>RISE Fast<small>no AI in the loop</small></b>
        <div class="track"><i class="fx" style="--fx:fill;--d:.22s;--ease:var(--e-out);--at:1.0"></i></div>
        <span class="v fx slam" style="--at:1.0;--d:.5s;--from:1.8">0.77 s<small>0 AI tokens</small></span>
      </div>
    </div>
    <div class="chips">
      <span class="fx pop" style="--at:2.4">deterministic scanner + a 1.3 KB local model</span>
      <span class="fx pop" style="--at:2.6">runs offline, on the CPU</span>
      <span class="fx pop" style="--at:2.8">every answer points to file:line</span>
    </div>
    <div class="foot fx fade" style="--at:3.0">same 20 repositories · same task: find every S3 call · one run, 20 Nov 2026 · the win is speed and cost, not accuracy</div>`,
  css: `
    .head { position: absolute; left: 170px; top: 120px; color: var(--accent); }
    h2 { position: absolute; left: 170px; top: 176px; margin: 0; font: 600 104px/1.02 var(--f-ui); letter-spacing: -.045em; white-space: nowrap; }
    .race { position: absolute; left: 170px; right: 170px; top: 500px; display: grid; gap: 34px; }
    .lane { display: grid; grid-template-columns: 430px 1fr 330px; align-items: center; gap: 36px; }
    .lane b { font: 650 46px/1.05 var(--f-ui); letter-spacing: -.03em; display: grid; gap: 8px; }
    .lane small { font: 500 21px/1.2 var(--f-mono); color: var(--muted); letter-spacing: 0; }
    .track { height: 30px; border-radius: 999px; background: rgba(18,31,53,.07); overflow: hidden; }
    .track i { display: block; height: 100%; border-radius: 999px; background: #9AA8BE; transform-origin: 0 50%; }
    .win .track i { background: linear-gradient(90deg, #121F35, var(--accent)); }
    .v { font: 700 64px/1 var(--f-ui); letter-spacing: -.04em; font-variant-numeric: tabular-nums; display: grid; gap: 8px; color: var(--faint-ink); transform-origin: 0 50%; }
    .win .v { color: var(--ink); } .win .v small { color: var(--ok); }
    .chips { position: absolute; left: 170px; top: 846px; display: flex; gap: 16px; }
    .chips span { padding: 16px 24px; border-radius: 999px; background: rgba(255,255,255,.78); box-shadow: inset 0 0 0 1px var(--line), 0 10px 30px -12px rgba(18,31,53,.2);
      font: 500 23px/1 var(--f-mono); color: var(--ink); }`,
  raw: `@keyframes fill { from { transform: scaleX(0); } }`,
});

/* ───────────── 9 · /rise INSIDE CLAUDE CODE (rise/mcp.py; result measured in WHAT_RISE_DOES.md §6) ───────────── */
SCENE("mcp", {
  html: `
    <div class="left">
      <div class="kick fx in" style="--at:0">rise mcp · inside claude code</div>
      <h2>${words("Claude doesn't read", .1, .07)}<br>${words("the whole repo.", .35, .07)}<br><span class="soft">${words("It asks RISE.", .9, .08)}</span></h2>
      <div class="flow fx in" style="--at:1.5"><span>Claude</span><i></i><span class="on">RISE</span><i></i><span>real tests</span><i></i><span class="ok">proof</span></div>
    </div>
    <div class="term glass-card fx tilt" style="--at:.15;--d:.9s">
      <div class="bar"><span>claude code</span><em>your editor</em></div>
      <div class="q"><b>&gt;</b><span data-type="/rise can this app move to another cloud?" data-at=".4" data-cps="30"></span><i class="cur fx blink" style="--at:.4"></i></div>
      <div class="call fx in" style="--at:1.9;--y:16px"><i></i>rise_check <small>RISE MCP · reads the folder, runs the tests</small></div>
      <div class="ans fx in" style="--at:2.7;--y:24px">
        <span class="pill ok">Ready to migrate · 1 change</span>
        <code>region: us-east-1 → <b>nl-ams-1</b></code>
        <p>5/5 storage behaviours verified by real tests</p>
      </div>
    </div>
    <div class="foot fx fade" style="--at:3.2">result of a measured run on a local Python app · .env files never leave the machine · cloud keys stay inside RISE</div>`,
  css: `
    .left { position: absolute; left: 150px; top: 290px; width: 860px; display: grid; gap: 34px; }
    .left .kick { color: var(--accent); }
    h2 { margin: 0; font: 600 96px/1.03 var(--f-ui); letter-spacing: -.045em; white-space: nowrap; }
    .flow { display: flex; align-items: center; gap: 14px; margin-top: 14px; }
    .flow span { padding: 14px 22px; border-radius: 999px; background: rgba(255,255,255,.78); box-shadow: inset 0 0 0 1px var(--line); font: 600 24px/1 var(--f-mono); }
    .flow span.on { background: var(--accent); color: #fff; box-shadow: none; } .flow span.ok { background: var(--ok-bg); color: var(--ok); box-shadow: none; }
    .flow i { width: 34px; height: 2px; background: rgba(18,31,53,.28); }
    .term { position: absolute; right: 130px; top: 270px; width: 790px; padding: 0 0 40px; background: rgba(255,255,255,.9); overflow: hidden; }
    .bar { display: flex; justify-content: space-between; align-items: center; padding: 22px 34px; border-bottom: 1px solid var(--line); font: 600 20px/1 var(--f-mono); letter-spacing: .12em; text-transform: uppercase; }
    .bar em { font-style: normal; color: var(--muted); font-weight: 500; }
    .q { display: flex; align-items: center; gap: 14px; margin: 34px 34px 0; font: 500 29px/1.3 var(--f-mono); min-height: 44px; white-space: nowrap; }
    .q b { color: var(--accent); } .cur { display: inline-block; width: 4px; height: 34px; margin-left: -8px; background: var(--accent); }
    .call { display: flex; align-items: center; gap: 14px; margin: 34px 34px 0; font: 600 25px/1 var(--f-mono); color: var(--accent); }
    .call i { width: 12px; height: 12px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 5px rgba(37,99,235,.16); }
    .call small { font: 500 19px/1 var(--f-mono); color: var(--muted); }
    .ans { margin: 30px 34px 0; padding: 30px; border-radius: 22px; background: color-mix(in srgb, var(--ok-bg) 55%, #fff); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--ok) 35%, transparent); display: grid; gap: 20px; justify-items: start; }
    .ans .pill { font-size: 30px; padding: 14px 24px; gap: 12px; } .ans .pill::before { width: 12px; height: 12px; }
    .ans code { font: 500 30px/1 var(--f-mono); } .ans code b { color: var(--ok); }
    .ans p { margin: 0; font: 500 23px/1.3 var(--f-mono); color: var(--muted); }`,
});

/* ───────────── 10 · REPLAY · CALL 7 ───────────── */
SCENE("replay", {
  html: (tm) => {
    const W = 1500, k = W / 960, hit = 2.95;
    return `
    <div class="kick head fx in" style="--at:0">replay · the app's real calls · synthetic bytes</div>
    <div class="tz fx zoom" style="--at:${hit + 0.45};--zs:1.05;--zx:-10px;--zy:-30px">
      <div class="tb fx shake" style="--at:${hit};--d:.45s">
        <div class="fx tilt" style="--at:0;--d:.8s">
          ${shot("replay", [292, 64, 960, 470], W)}
          <i class="cover fx" style="--fx:uncover;--d:2.8s;--ease:linear;--at:.5;--top0:${132 * k}px;--top1:${471 * k}px"></i>
          <i class="row7 fx" style="--fx:alarm;--d:.9s;--at:${hit};top:${(438 - 64) * k}px;height:${42 * k}px"></i>
        </div>
      </div>
    </div>
    <div class="verdict fx fly-r" style="--at:${hit + 0.75}">${shot("replay", [780, 548, 472, 232], 860)}
      <i class="mark fx" style="--fx:markon;--d:.5s;--at:${hit + 1.4};left:${172 * (860 / 472)}px;top:${92 * (860 / 472)}px;width:${210 * (860 / 472)}px;height:${20 * (860 / 472)}px"></i></div>
    <div class="foot fx fade" style="--at:${tm.dur - 1.6}">recorded inside the company · keys aliased · bytes never leave</div>`;
  },
  css: `
    .head { position: absolute; top: 52px; width: 100%; text-align: center; color: var(--ok); font-size: 22px; }
    .tz { position: absolute; left: 210px; top: 110px; transform-origin: 70% 80%; }
    .tz .shot + .cover, .tz .row7 { position: absolute; left: 0; right: 0; }
    .tz > div > div { position: relative; }
    .cover { bottom: 0; top: var(--top0); background: linear-gradient(#fff, #fbfcfe); border-top: 3px solid var(--accent);
      box-shadow: 0 -18px 40px -10px rgba(37,99,235,.45); border-radius: 0 0 22px 22px; }
    .row7 { background: rgba(212,81,59,0); }
    .verdict { position: absolute; right: 120px; bottom: 110px; }
    .mark { position: absolute; background: rgba(255,200,0,.38); mix-blend-mode: multiply; transform-origin: 0 50%; border-radius: 6px; }`,
  raw: `@keyframes uncover { from { top: var(--top0); } to { top: var(--top1); } }
    @keyframes alarm { 0% { background: rgba(212,81,59,.0); } 15% { background: rgba(212,81,59,.45); box-shadow: 0 0 60px rgba(212,81,59,.6); } 100% { background: rgba(212,81,59,.12); } }
    @keyframes markon { from { transform: scaleX(0); } }`,
});

/* ───────────── 11 · FIX · RETEST · READY, BEFORE ANYTHING MOVES ───────────── */
SCENE("fix", {
  html: (tm) => `
    <div class="layer fx out" style="--at:1.7"><div class="a fx tilt" style="--at:0">${shot("analysis", [898, 276, 338, 114], 1150)}<i class="sweep fx" style="--at:.6"></i></div>
      <div class="cap fx in" style="--at:.35">region fixed in the config · every call retested</div></div>
    <div class="hero fx slam" style="--at:1.85;--from:1.4">${shot("analysis", [292, 110, 960, 105], 1500)}<i class="sweep fx" style="--at:2.5"></i></div>
    <h2 class="before">${words("Before a single byte moves.", tm.dur - 2.3, .09)}</h2>
    <div class="foot fx fade" style="--at:${tm.dur - 1.6}">tested against the target cloud · nothing migrated yet</div>`,
  css: `
    .a { position: absolute; left: 385px; top: 270px; } .cap { position: absolute; top: 700px; width: 100%; text-align: center; font: 600 34px/1 var(--f-mono); color: var(--ok); }
    .hero { position: absolute; left: 210px; top: 300px; }
    .before { position: absolute; top: 620px; width: 100%; margin: 0; text-align: center; font: 680 104px/1 var(--f-ui); letter-spacing: -.045em; }`,
});

/* ───────────── 13 · DIDN'T HOPE ───────────── */
SCENE("hope", {
  push: 1.06,
  html: `
    <div class="center"><h1>${words("Paul didn't", .2, .12)} <span class="h">${words("hope.", .45)}<i class="st fx strike" style="--at:1.5"></i></span></h1></div>`,
  css: `
    h1 { font: 650 180px/1 var(--f-ui); letter-spacing: -.055em; margin: 0; }
    .h { position: relative; color: var(--faint-ink); }
    .st { position: absolute; left: -2%; right: -2%; top: 54%; height: 14px; background: var(--bad); border-radius: 7px; }`,
});

/* ───────────── 14 · HE PROVED IT ───────────── */
SCENE("proved", {
  push: 1.06,
  html: `
    <div class="flash fx" style="--at:0;--d:.8s"></div>
    <i class="ring fx" style="--at:.05;--s:8"></i><i class="ring fx" style="--at:.15;--s:5;--rc:var(--ok)"></i>
    <div class="center"><h1 class="fx slam" style="--at:0;--from:2.6">He <b>proved</b> it.</h1></div>`,
  css: `
    h1 { font: 700 230px/.9 var(--f-ui); letter-spacing: -.06em; margin: 0; }
    h1 b { background: linear-gradient(100deg, #121F35, #2563EB 55%, #0A8A74); -webkit-background-clip: text; color: transparent; }`,
});

/* ───────────── 15 · END CARD (the pitch cover) ───────────── */
SCENE("end", {
  push: 1.03,
  html: `
    <div class="center"><div>
      <div class="lock"><span class="word fx slam" style="--at:.5;--from:1.8">RISE</span><span class="mark"><i class="halo"></i>${LOGO(0.6)}</span></div>
      <i class="horizon fx grow-x" style="--at:.8"></i>
      <p class="tag"><span class="soft">${words("Don't hope your migration works.", 1.3, .1)}</span> ${words("Prove it.", 3.9, .12)}</p>
      <p class="sub fx in" style="--at:2.1">Storage compatibility, proven before you migrate.</p>
      <p class="meta fx in" style="--at:2.5">open source · Apache-2.0 · built live at InfraHack Portugal 2026</p>
    </div></div>
    <i class="sweep fx" style="--at:2.4;--d:1.6s"></i>`,
  css: `
    .lock { display: flex; align-items: baseline; justify-content: center; gap: .04em; font: 700 230px/.82 var(--f-ui); }
    .word { letter-spacing: .06em; }
    .mark { position: relative; display: block; height: .705em; }
    .halo { position: absolute; inset: -20%; border-radius: 50%; background: radial-gradient(closest-side, color-mix(in srgb, var(--accent) 20%, transparent), transparent); filter: blur(30px); }
    .logo { position: relative; display: block; height: 100%; width: auto; overflow: visible; }
    .horizon { width: 1100px; margin: 34px auto 52px; }
    .tag { margin: 0; font: 600 64px/1.1 var(--f-ui); letter-spacing: -.03em; }
    .sub { margin: 30px 0 0; font: 600 34px/1.2 var(--f-mono); color: var(--accent); letter-spacing: -.01em; }
    .meta { margin-top: 26px; font: 500 24px/1 var(--f-mono); color: var(--muted); letter-spacing: .04em; }`,
});
