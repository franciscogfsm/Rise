/*
  RISE film · SCENES. One SCENE per id in script.js (same order there decides the film order).
  html: string, or (tm) => string where tm.dur is the scene length (use it for "near the end" moments).
  Motion: add class "fx <name>" and style "--at: seconds into the scene" (names in film.html: in fade slam pop mask tilt
  fly-l fly-r out gone push drift draw flash ring shake glitch strike sweep blink zoom move).
  css: scoped to the scene (CSS nesting). raw: global CSS (for @keyframes).
  shot(name, [x, y, w, h], width): crop of a real RISE screenshot in shots/ (x/y/w/h in the app's CSS px, 1600 wide).
  [data-count] counts up to a REAL number, [data-type] types a REAL string. Never put a number here that is not in
  benchmark/STATS.md or on a screenshot.
*/

const LOGO = (at) => `
<svg class="logo" viewBox="7.5 9.5 45 39" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <defs><linearGradient id="lg${at}" x1="11" y1="45" x2="49" y2="13" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#121F35"/><stop offset="1" stop-color="#2563EB"/></linearGradient></defs>
  <path class="fx draw" pathLength="1" style="--len:1;--at:${at};--d:.7s;stroke:color-mix(in srgb,#2563EB 50%,#fff)" d="M11 31.5c7.1-.2 12.5-2.9 17.4-7.9" stroke-width="5"/>
  <path class="fx draw" pathLength="1" style="--len:1;--at:${at + 0.1};--d:.8s" d="M11 45c10.5 0 19.2-6.2 27.6-17.9L49 13" stroke="url(#lg${at})" stroke-width="6.5"/>
  <path class="fx draw" pathLength="1" style="--len:1;--at:${at + 0.55};--d:.4s;stroke:#2563EB" d="M35 13h14v14" stroke-width="6.5"/>
</svg>`;

/* ───────────── 1 · MEET PAUL ───────────── */
SCENE("paul", {
  push: 1.08,
  html: `
    <div class="floor fx" style="--fx:floor;--d:4s;--ease:linear"></div>
    <div class="center"><div>
      <div class="line fx mask" style="--at:.1;--d:.8s"></div>
      <h1 class="meet fx slam" style="--at:.85;--from:3.2">Meet <b>Paul.</b></h1>
      <p class="role fx in" style="--at:1.45">Head of Platform · one app · one cloud</p>
    </div></div>
    <div class="flash fx" style="--at:.85;--d:.6s;background:radial-gradient(circle,rgba(110,168,255,.55),transparent 70%)"></div>
    <div class="foot fx fade" style="--at:1.9">Paul is fictional. Every number and every screen in this film is real.</div>`,
  css: `
    .floor { position: absolute; left: -50%; width: 200%; bottom: -12%; height: 75%; transform: perspective(700px) rotateX(72deg);
      background-image: linear-gradient(rgba(110,168,255,.28) 2px, transparent 2px), linear-gradient(90deg, rgba(110,168,255,.28) 2px, transparent 2px);
      background-size: 90px 90px; -webkit-mask-image: linear-gradient(transparent, #000 70%); }
    .line { width: 560px; height: 2px; margin: 0 auto 40px; background: linear-gradient(90deg, transparent, #6EA8FF, transparent); }
    .meet { font-size: 190px; font-weight: 700; letter-spacing: -.055em; line-height: .9; margin: 0; }
    .meet b { background: linear-gradient(100deg, #fff 20%, #6EA8FF 60%, #B49CFF); -webkit-background-clip: text; color: transparent; }
    .role { margin: 36px 0 0; font: 500 28px/1 var(--f-mono); color: rgba(255,255,255,.6); letter-spacing: .04em; }`,
  raw: `@keyframes floor { from { background-position: 0 0; } to { background-position: 0 360px; } }`,
});

/* ───────────── 2 · HE WANTS A NEW CLOUD ───────────── */
SCENE("want", {
  html: `
    <div class="title">${words("Same app. New cloud.", .1, .09)}</div>
    <div class="node a fx fly-l" style="--at:.15"><span class="kick">today</span><b class="mono">us-east-1</b><em>every byte in one place</em></div>
    <div class="node b fx fly-r" style="--at:.35"><span class="kick">next</span><b>New cloud · EU</b><em>cheaper · sovereign · closer</em></div>
    <svg class="arc" viewBox="0 0 1920 1080"><path class="fx draw" style="--at:.6;--d:1s;--len:900" d="M700 620 C 860 380, 1060 380, 1220 620"/></svg>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<i class="pk fx" style="--fx:pk;--d:1.1s;--n:infinite;--ease:cubic-bezier(.5,0,.5,1);--at:${(1.2 + i * 0.18).toFixed(2)}"></i>`).join("")}`,
  css: `
    .title { position: absolute; top: 150px; width: 100%; text-align: center; font-size: 104px; font-weight: 650; letter-spacing: -.045em; }
    .node { position: absolute; top: 520px; width: 470px; padding: 34px 38px; border-radius: 28px; display: grid; gap: 10px;
      background: rgba(255,255,255,.06); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14), 0 30px 80px rgba(0,0,0,.5); }
    .node.a { left: 210px; } .node.b { right: 210px; box-shadow: inset 0 0 0 2px #2563EB, 0 0 80px rgba(37,99,235,.55); background: rgba(37,99,235,.14); }
    .node .kick { color: rgba(255,255,255,.5); font-size: 20px; } .node b { font-size: 50px; letter-spacing: -.03em; } .node em { font-style: normal; color: rgba(255,255,255,.55); font-size: 24px; }
    .arc { position: absolute; inset: 0; } .arc path { fill: none; stroke: #6EA8FF; stroke-width: 4; stroke-dasharray: 900; filter: drop-shadow(0 0 12px #2563EB); }
    .pk { position: absolute; left: 0; top: 0; width: 18px; height: 18px; margin: -9px; border-radius: 50%; background: #fff; box-shadow: 0 0 24px 6px #6EA8FF;
      offset-path: path("M700 620 C 860 380, 1060 380, 1220 620"); offset-rotate: 0deg; }`,
  raw: `@keyframes pk { from { offset-distance: 0%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } to { offset-distance: 100%; opacity: 0; } }`,
});

/* ───────────── 3 · THOUSANDS OF CALLS · PRODUCTION BREAKS ───────────── */
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
      <div class="cap">${words("Thousands of storage calls.", .3, .08)}</div>
      <div class="crash fx fade" style="--at:${crash};--d:.15s"></div>
      <div class="center down"><div>
        <div class="big fx glitch" style="--at:${crash}"><span class="fx slam" style="--at:${crash};--d:.35s;--from:1.6">503</span></div>
        <div class="kick fx in" style="--at:${crash + 0.2};--d:.4s">production down</div>
      </div></div>
    </div>
    <div class="flash fx" style="--at:${crash};--d:.35s;background:#FF2E63"></div>`;
  },
  css: `
    .shk { position: absolute; inset: 0; }
    .wall { position: absolute; left: 50%; top: 50%; width: 2000px; height: 1700px; transform: translate(-50%, -46%) perspective(1300px) rotateX(32deg) rotateZ(-9deg);
      -webkit-mask-image: linear-gradient(transparent, #000 25%, #000 70%, transparent); }
    .ln { font: 500 30px/52px var(--f-mono); color: rgba(255,255,255,.28); white-space: pre; padding: 0 20px; border-radius: 10px; }
    .ln span { color: rgba(255,255,255,.14); margin-right: 34px; }
    .cap { position: absolute; left: 0; right: 0; bottom: 120px; text-align: center; font-size: 84px; font-weight: 650; letter-spacing: -.04em; text-shadow: 0 10px 40px #000; }
    .crash { position: absolute; inset: 0; background: radial-gradient(circle at 50% 50%, rgba(120,10,20,.86), rgba(10,0,4,.97)); }
    .down { z-index: 3; } .big { font: 800 380px/.85 var(--f-ui); letter-spacing: -.06em; color: #FF4D5E; }
    .down .kick { color: #fff; font-size: 40px; letter-spacing: .4em; margin-top: 20px; }`,
  raw: `@keyframes hot { to { color: #FF8A73; background: rgba(255,77,94,.16); text-shadow: 0 0 22px rgba(255,90,70,.9); } }`,
});

/* ───────────── 4 · THE MIGRATION WAITS ───────────── */
const QS = ["Q1 2027", "Q2 2027", "Q3 2027", "Q4 2027", "2028"];
SCENE("stuck", {
  push: 1.12,
  html: (tm) => `
    <div class="kick head fx in" style="--at:.05">migration status</div>
    <div class="row fx drift" style="--d:${tm.dur}s;--x1:-160px">
      ${QS.map((q, i) => `<div class="cal fx" style="--fx:flip;--d:.45s;--at:${(0.1 + i * 0.5).toFixed(2)}"><span>${q}</span>
        <b class="stamp fx slam" style="--at:${(0.35 + i * 0.5).toFixed(2)};--d:.3s;--from:2.2">postponed</b></div>`).join("")}
    </div>
    <div class="flash fx" style="--at:${tm.dur - 0.25};--d:.5s"></div>`,
  css: `
    .head { position: absolute; top: 200px; width: 100%; text-align: center; color: rgba(255,255,255,.55); font-size: 26px; }
    .row { position: absolute; top: 400px; left: 110px; display: flex; gap: 40px; }
    .cal { width: 300px; height: 300px; border-radius: 30px; background: rgba(255,255,255,.07); box-shadow: inset 0 0 0 1px rgba(255,255,255,.15);
      display: grid; place-items: center; position: relative; transform-origin: 50% 0; }
    .cal span { font: 650 54px/1 var(--f-ui); letter-spacing: -.03em; color: rgba(255,255,255,.85); }
    .stamp { position: absolute; bottom: 40px; padding: 8px 16px; border: 4px solid #FF6B4F; color: #FF6B4F; border-radius: 10px;
      font: 700 28px/1 var(--f-mono); text-transform: uppercase; letter-spacing: .12em; rotate: -9deg; }`,
  raw: `@keyframes flip { from { transform: perspective(900px) rotateX(-95deg); opacity: 0; } }`,
});

/* ───────────── 5 · UNTIL RISE ───────────── */
SCENE("rise", {
  push: 0.94,
  html: `
    <div class="flash fx" style="--at:0;--d:1s"></div>
    <i class="ring fx" style="--at:.05;--s:7"></i><i class="ring fx" style="--at:.2;--s:5;--rc:#6EA8FF"></i><i class="ring fx" style="--at:.35;--s:3.5;--rc:#B49CFF"></i>
    <div class="center"><div>
      <div class="lock fx shake" style="--at:.05;--d:.45s">
        <span class="word fx slam" style="--at:.12;--from:3">RISE</span>${LOGO(0.25)}
      </div>
      <p class="tag kick fx in" style="--at:1.1">the proof of cloud freedom</p>
    </div></div>`,
  css: `
    .lock { display: flex; align-items: baseline; gap: .04em; font: 750 300px/.82 var(--f-ui); }
    .word { letter-spacing: .05em; color: var(--ink); }
    .logo { height: .72em; width: auto; overflow: visible; filter: drop-shadow(0 20px 40px rgba(37,99,235,.35)); }
    .tag { margin-top: 48px; color: var(--accent); font-size: 30px; letter-spacing: .3em; }`,
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
    <div class="p tests fx fly-r" style="--at:1.9">${shot("analysis", [882, 228, 370, 420], 470)}<span class="lbl fx pop" style="--at:2.6">real tests · real S3 endpoints</span></div>
    <div class="p hero fx slam" style="--at:3.3;--from:1.5">${shot("analysis", [292, 110, 960, 105], 1500)}<i class="sweep fx" style="--at:3.8"></i></div>`,
  css: `
    .p { position: absolute; } .strip { left: 160px; top: 56px; } .found { left: 740px; top: 160px; } .port { left: 220px; top: 240px; }
    .tests { left: 1230px; top: 160px; } .hero { left: 210px; top: 820px; }
    .lbl { position: absolute; left: 50%; bottom: -26px; translate: -50% 0; white-space: nowrap; padding: 12px 20px; border-radius: 999px;
      background: var(--ink); color: #fff; font: 600 21px/1 var(--f-mono); box-shadow: 0 14px 30px rgba(18,31,53,.35); }`,
});

/* ───────────── 8 · SCALE (benchmark/STATS.md) ───────────── */
const REPOS = ["Sentry 3.7M lines · 1.3 s", "Discourse 2.7M · 2.3 s", "Airflow 2.3M · 3.1 s", "aws-cli 2.2M · 2.9 s", "Superset 2.16M · 1.0 s", "Ray 1.66M · 1.2 s"];
SCENE("scale", {
  push: 1.03,
  html: `
    <div class="ghost fx drift" style="--d:7s;--x1:-1400px">${[...REPOS, ...REPOS].join("   ·   ")}</div>
    <div class="st s1 fx" style="--fx:home;--at:1.65;--d:.6s;--ease:var(--e-io);--cx:${960 - 520}px;--cs:1.5">
      <div class="fx slam" style="--at:.15"><b data-count="35252281" data-at=".15" data-d="1.4">0</b><span>lines of real code</span></div></div>
    <div class="st s2 fx" style="--fx:home;--at:3.45;--d:.6s;--ease:var(--e-io);--cx:${960 - 1110}px;--cs:1.9">
      <div class="fx slam" style="--at:1.9"><b data-count="185" data-at="1.9" data-d=".8">0</b><span>public repos</span></div></div>
    <div class="st s3 fx" style="--fx:home;--at:4.55;--d:.6s;--ease:var(--e-io);--cx:${960 - 1560}px;--cs:2.2">
      <div class="fx slam" style="--at:3.7"><b class="acc" data-count="40.4" data-dec="1" data-suf=" s" data-at="3.7" data-d=".7">0</b><span>to read all of it</span></div></div>
    <div class="tick fx in" style="--at:4.7">${REPOS.slice(0, 4).map((r) => `<span>${r}</span>`).join("")}</div>
    <div class="foot fx fade" style="--at:4.9">182,771 files · measured 20 Nov 2026 on one 16-worker laptop · download time excluded</div>`,
  css: `
    .ghost { position: absolute; top: 120px; left: 0; white-space: nowrap; font: 700 150px/1 var(--f-ui); letter-spacing: -.05em; color: rgba(18,31,53,.05); }
    .st { position: absolute; top: 420px; width: 0; display: grid; justify-items: center; }
    .st > div { display: grid; justify-items: center; gap: 14px; white-space: nowrap; }
    .s1 { left: 520px; } .s2 { left: 1110px; } .s3 { left: 1560px; }
    .st b { font: 750 120px/.9 var(--f-ui); letter-spacing: -.05em; font-variant-numeric: tabular-nums; }
    .st b.acc { background: linear-gradient(100deg, #2563EB, #7C5CFF); -webkit-background-clip: text; color: transparent; }
    .st span { font: 500 26px/1 var(--f-mono); color: var(--muted); letter-spacing: .02em; }
    .tick { position: absolute; top: 700px; width: 100%; display: flex; justify-content: center; gap: 22px; }
    .tick span { padding: 14px 22px; border-radius: 999px; background: rgba(255,255,255,.8); box-shadow: inset 0 0 0 1px var(--line), 0 10px 30px rgba(18,31,53,.08);
      font: 600 22px/1 var(--f-mono); }`,
  raw: `@keyframes home { from { transform: translate(var(--cx), 40px) scale(var(--cs)); } }`,
});

/* ───────────── 9 · ZERO MISSED ───────────── */
SCENE("zero", {
  html: `
    <div class="flash fx" style="--at:0;--d:.6s;background:var(--ok-bg)"></div>
    <i class="ring fx" style="--at:.05;--s:6;--rc:var(--ok)"></i><i class="ring fx" style="--at:.2;--s:4;--rc:var(--ok)"></i>
    <div class="center"><div>
      <div class="zero fx slam" style="--at:0;--from:4">0</div>
      <div class="what fx in" style="--at:.45">real S3 calls missed</div>
      <div class="how fx in" style="--at:.9">checked against 11,422 calls to all 116 official S3 operations</div>
    </div></div>`,
  css: `
    .zero { font: 800 460px/.8 var(--f-ui); letter-spacing: -.06em; color: var(--ok); text-shadow: 0 30px 80px rgba(10,138,116,.35); }
    .what { font: 650 80px/1 var(--f-ui); letter-spacing: -.04em; margin-top: 30px; }
    .how { margin-top: 26px; font: 500 26px/1 var(--f-mono); color: var(--muted); }`,
});

/* ───────────── 10 · LEASEWEB DOCS ───────────── */
SCENE("docs", {
  html: `
    <div class="left">
      <div class="kick fx in" style="--at:.05">leaseweb object storage</div>
      <h2>${words("Official docs. Read live.", .15, .08)}<br><span class="soft">${words("Quoted word for word.", .5, .08)}</span></h2>
      <div class="chip2 fx pop" style="--at:1.1">developer.leaseweb.com</div>
    </div>
    <div class="right fx tilt" style="--at:.1">${shot("leaseweb-docs", [883, 196, 368, 510], 600)}<i class="sweep fx" style="--at:1.4"></i></div>`,
  css: `
    .left { position: absolute; left: 170px; top: 300px; width: 900px; display: grid; gap: 30px; }
    .left .kick { color: var(--accent); }
    h2 { margin: 0; font: 680 92px/1.02 var(--f-ui); letter-spacing: -.045em; } .soft { color: #5F6B84; }
    .chip2 { justify-self: start; padding: 14px 22px; border-radius: 999px; background: var(--ink); color: #fff; font: 600 24px/1 var(--f-mono); }
    .right { position: absolute; right: 170px; top: 90px; }`,
});

/* ───────────── 11 · REPLAY · CALL 7 ───────────── */
SCENE("replay", {
  html: (tm) => {
    const W = 1500, k = W / 960, hit = 2.95;
    return `
    <div class="kick head fx in" style="--at:0">replay · the app's real calls · synthetic bytes</div>
    <div class="tz fx zoom" style="--at:${hit + 0.45};--zs:1.25;--zx:-60px;--zy:-210px">
      <div class="tb fx shake" style="--at:${hit};--d:.45s">
        <div class="fx tilt" style="--at:0;--d:.8s">
          ${shot("replay", [292, 64, 960, 470], W)}
          <i class="cover fx" style="--fx:uncover;--d:2.8s;--ease:linear;--at:.5;--top0:${132 * k}px;--top1:${471 * k}px"></i>
          <i class="row7 fx" style="--fx:alarm;--d:.9s;--at:${hit};top:${(438 - 64) * k}px;height:${42 * k}px"></i>
        </div>
      </div>
    </div>
    <div class="verdict fx fly-r" style="--at:${hit + 0.75}">${shot("replay", [780, 548, 472, 232], 860)}
      <i class="mark fx" style="--fx:markon;--d:.5s;--at:${hit + 1.4};left:${(895 - 780) * (860 / 472)}px;top:${(506 - 548 + 60) * (860 / 472)}px"></i></div>
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
    .mark { position: absolute; width: 520px; height: 44px; background: rgba(255,200,0,.38); mix-blend-mode: multiply; transform-origin: 0 50%; border-radius: 6px; }`,
  raw: `@keyframes uncover { from { top: var(--top0); } to { top: var(--top1); } }
    @keyframes alarm { 0% { background: rgba(212,81,59,.0); } 15% { background: rgba(212,81,59,.45); box-shadow: 0 0 60px rgba(212,81,59,.6); } 100% { background: rgba(212,81,59,.12); } }
    @keyframes markon { from { transform: scaleX(0); } }`,
});

/* ───────────── 12 · FIX · SHA-256 · SWITCH ───────────── */
SCENE("fix", {
  html: `
    <div class="fx out" style="--at:1.45"><div class="a fx tilt" style="--at:0">${shot("analysis", [898, 276, 338, 114], 1150)}<i class="sweep fx" style="--at:.6"></i></div>
      <div class="cap fx in" style="--at:.35">region fixed in the code · retested</div></div>
    <div class="fx out" style="--at:3.15"><div class="hash fx in" style="--at:1.5">
      <span class="kick">sha-256 of the real bytes</span>
      <b class="mono"><span data-type="49d968fbe6…01a503" data-at="1.6" data-cps="22"></span><i class="cur fx blink" style="--at:1.6"></i></b>
      <div class="pair"><em class="fx pop" style="--at:2.35">written ✓</em><em class="fx pop" style="--at:2.5">read back ✓</em><em class="ok fx pop" style="--at:2.65">match</em></div>
    </div></div>
    <div class="c fx tilt" style="--at:3.2">${shot("live-switch", [292, 145, 960, 122], 1600)}</div>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<i class="pk fx" style="--fx:flow;--d:.8s;--n:infinite;--ease:linear;--at:${(3.6 + i * 0.11).toFixed(2)}"></i>`).join("")}
    <div class="cap2 fx in" style="--at:3.6">live traffic now served by the destination</div>`,
  css: `
    .a { position: absolute; left: 385px; top: 270px; } .cap { position: absolute; top: 700px; width: 100%; text-align: center; font: 600 34px/1 var(--f-mono); color: var(--ok); }
    .hash { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 30px; }
    .hash .kick { color: var(--muted); } .hash b { font-size: 110px; letter-spacing: -.03em; color: var(--ink); display: flex; align-items: center; gap: 8px; }
    .cur { display: inline-block; width: 8px; height: 100px; background: var(--accent); }
    .pair { display: flex; gap: 22px; } .pair em { font: 600 30px/1 var(--f-mono); font-style: normal; padding: 16px 26px; border-radius: 999px; background: #fff; box-shadow: inset 0 0 0 1px var(--line); }
    .pair em.ok { background: var(--ok); color: #fff; }
    .c { position: absolute; left: 160px; top: 380px; }
    .pk { position: absolute; top: 478px; left: 0; width: 70px; height: 6px; border-radius: 3px; background: linear-gradient(90deg, transparent, var(--ok)); box-shadow: 0 0 20px var(--ok); }
    .cap2 { position: absolute; top: 720px; width: 100%; text-align: center; font: 600 34px/1 var(--f-mono); color: var(--ok); }`,
  raw: `@keyframes flow { from { transform: translateX(700px); opacity: 0; } 20% { opacity: 1; } to { transform: translateX(1100px); opacity: 0; } }`,
});

/* ───────────── 13 · CUT THE OLD CLOUD · 0 FAILED ───────────── */
SCENE("cut", {
  html: `
    <div class="tr fx tilt" style="--at:0">${shot("live-switch", [292, 280, 960, 103], 1600)}</div>
    <div class="src fx shake" style="--at:.5;--d:.5s"><div class="fx" style="--fx:dead;--d:.6s;--at:.5">${shot("live-switch", [292, 145, 410, 122], 760)}</div></div>
    <svg class="slash" viewBox="0 0 900 400"><path class="fx draw" style="--at:.45;--d:.25s;--len:1000;--ease:linear" d="M20 380 L880 20"/></svg>
    <div class="flash fx" style="--at:.5;--d:.3s;background:rgba(255,46,99,.5)"></div>
    <div class="zero fx slam" style="--at:1.9;--from:3"><b>0</b><span>failed requests<br><em>after the source was cut</em></span></div>`,
  css: `
    .tr { position: absolute; left: 160px; top: 120px; }
    .src { position: absolute; left: 160px; top: 470px; }
    .slash { position: absolute; left: 100px; top: 420px; width: 900px; height: 400px; overflow: visible; }
    .slash path { stroke: #FF2E63; stroke-width: 10; stroke-linecap: round; filter: drop-shadow(0 0 16px #FF2E63); }
    .zero { position: absolute; left: 1050px; top: 420px; display: flex; align-items: center; gap: 36px; }
    .zero b { font: 800 330px/.8 var(--f-ui); color: var(--ok); letter-spacing: -.06em; }
    .zero span { font: 680 64px/1.05 var(--f-ui); letter-spacing: -.035em; } .zero em { font: 500 26px/1.4 var(--f-mono); color: var(--muted); font-style: normal; }`,
  raw: `@keyframes dead { to { filter: grayscale(1) blur(1px); opacity: .45; transform: rotate(-3deg) translateY(30px); } }`,
});

/* ───────────── 14 · DIDN'T HOPE ───────────── */
SCENE("hope", {
  push: 1.1,
  html: `
    <div class="center"><h1>${words("Paul didn't", .2, .12)} <span class="h">${words("hope.", .45)}<i class="st fx strike" style="--at:1.7"></i></span></h1></div>`,
  css: `
    h1 { font: 700 170px/1 var(--f-ui); letter-spacing: -.055em; margin: 0; }
    .h { position: relative; color: rgba(255,255,255,.55); }
    .st { position: absolute; left: -2%; right: -2%; top: 52%; height: 14px; background: #FF6B4F; border-radius: 7px; box-shadow: 0 0 30px #FF6B4F; }`,
});

/* ───────────── 15 · HE PROVED IT ───────────── */
SCENE("proved", {
  push: 1.06,
  html: `
    <div class="flash fx" style="--at:0;--d:.8s"></div>
    <i class="ring fx" style="--at:.05;--s:8"></i><i class="ring fx" style="--at:.15;--s:5;--rc:var(--ok)"></i>
    <div class="center"><h1 class="fx slam" style="--at:0;--from:2.6">He <b>proved</b> it.</h1></div>`,
  css: `
    h1 { font: 780 230px/.9 var(--f-ui); letter-spacing: -.06em; margin: 0; }
    h1 b { background: linear-gradient(100deg, #2563EB, #7C5CFF 55%, #0A8A74); -webkit-background-clip: text; color: transparent; }`,
});

/* ───────────── 16 · END CARD ───────────── */
SCENE("end", {
  push: 1.03,
  html: `
    <div class="center"><div>
      <div class="lock"><span class="word fx slam" style="--at:.5;--from:2">RISE</span>${LOGO(0.6)}</div>
      <p class="tag">${words("The Proof of Cloud Freedom.", 1.2, .09)}</p>
      <p class="meta fx in" style="--at:2.2">open source · Apache-2.0 · built live at InfraHack Portugal 2026</p>
    </div></div>
    <i class="sweep fx" style="--at:2.4;--d:1.6s"></i>`,
  css: `
    .lock { display: flex; align-items: baseline; justify-content: center; gap: .04em; font: 750 250px/.82 var(--f-ui); }
    .word { letter-spacing: .05em; } .logo { height: .72em; width: auto; overflow: visible; }
    .tag { margin: 56px 0 0; font: 650 72px/1 var(--f-ui); letter-spacing: -.04em; }
    .meta { margin-top: 40px; font: 500 24px/1 var(--f-mono); color: var(--muted); letter-spacing: .04em; }`,
});
