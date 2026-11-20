/* A lacuna antes de mover os dados. */
RISE.slide({
  id: "tools",
  title: "The gap",
  time: "0:35 – 0:45",
  notes: `
"Moving the bytes is solved: AWS DataSync, Google Storage Transfer, Azure Storage Mover, rclone."
"Checking they arrived is solved: rclone check, checksums, cutover runbooks."
"But before you move: will your code still work there? Your app makes S3 calls. Most work anywhere. Some don't: a presigned URL signed for the old region, a storage class the new cloud doesn't offer. No tool tells you which. Today it's spreadsheets, guesswork, weeks, and you find out in production."
"RISE checks compatibility for you: every call, automatically, in seconds, before you move. Every time."
`,

  html: `
    <div class="tl">
      <h2 class="title split">Moving data is solved. <span class="soft">Your code isn't.</span></h2>
      <div class="phases">
        <article class="phase gap rv" style="--i:1">
          <span class="step">Before</span>
          <h3>Is my code compatible with the new cloud?</h3>
          <div class="code">
            <p class="ok"><code>s3.put_object(Bucket=b, Key=k)</code><b>✓</b></p>
            <p class="no"><code>s3.generate_presigned_url(…)</code><b>✗</b><small>signed for the old region</small></p>
            <p class="no"><code>StorageClass="GLACIER"</code><b>✗</b><small>not offered there</small></p>
          </div>
          <p class="nobody">Today: by hand. Weeks.</p>
        </article>
        <article class="phase glass rv" style="--i:2">
          <span class="step">Move</span>
          <h3>Copy the bytes</h3>
          <p class="solved"><span class="dot"></span>Solved</p>
        </article>
        <article class="phase glass rv" style="--i:3">
          <span class="step">After</span>
          <h3>Did it arrive?</h3>
          <p class="solved"><span class="dot"></span>Solved</p>
        </article>
      </div>
      <p class="punch rv" style="--i:5"><b>RISE</b> checks every call, automatically, in seconds. <span class="soft">Before you move.</span></p>
    </div>`,

  css: `
    .tl { height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 56px; }
    .tl > .title { max-width: 26ch; }
    .phases { display: grid; grid-template-columns: 1.7fr 1fr 1fr; gap: 28px; align-self: center; }
    .phase { padding: 40px 40px 36px; display: grid; grid-template-rows: auto auto 1fr; gap: 20px; min-height: 380px; }
    .phase.gap { grid-template-rows: auto auto auto 1fr; }
    .phase .solved { align-self: end; font-size: 44px; font-weight: 650; }
    .phase .solved .dot { width: 18px; height: 18px; }
    .phase .step { font: 500 22px/1 var(--f-mono); color: var(--muted); }
    .phase h3 { font-size: 40px; line-height: 1.1; font-weight: 600; letter-spacing: -.025em; }
    .tools { display: flex; flex-wrap: wrap; gap: 10px; align-content: start; }
    .solved { display: flex; align-items: center; gap: 10px; font-size: var(--t1); font-weight: 500; color: var(--ok); }

    .gap { border-radius: 32px; border: 3px dashed color-mix(in srgb, var(--bad) 55%, transparent); background: color-mix(in srgb, var(--bad-bg) 55%, transparent); }
    .gap .step { color: var(--bad); }
    .code { display: grid; gap: 10px; }
    .code p { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 14px; padding: 12px 16px; border-radius: 14px; background: rgba(255,255,255,.75); }
    .code code { font: 600 22px/1.2 var(--f-mono); color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .code b { font-size: 26px; }
    .code .ok b { color: var(--ok); }
    .code .no b { color: var(--bad); }
    .code small { grid-column: 1 / -1; font: 500 18px/1.2 var(--f-mono); color: var(--bad); }
    .code p { opacity: 0; transform: translateX(-14px); transition: opacity .45s var(--e-out), transform .6s var(--e-out); }
    &.cur .code p { opacity: 1; transform: none; }
    &.cur .code p:nth-child(1) { transition-delay: .9s; } &.cur .code p:nth-child(2) { transition-delay: 1.3s; } &.cur .code p:nth-child(3) { transition-delay: 1.7s; }
    .nobody { align-self: end; font-size: 64px; line-height: .95; font-weight: 700; letter-spacing: -.045em; color: var(--bad); }
    .how { font-size: var(--t1); line-height: 1.4; color: var(--muted); }

    .punch { font-size: 52px; line-height: 1.15; font-weight: 600; letter-spacing: -.025em; color: var(--ink); }
    .punch b { font-weight: 700; color: var(--act); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("problem"); },
});
