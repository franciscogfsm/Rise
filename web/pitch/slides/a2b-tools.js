/* Parte A · 3 · O mercado: todas as ferramentas movem bytes, nenhuma verifica o código antes. */
RISE.slide({
  id: "tools",
  title: "The gap",
  time: "0:35 – 0:45",
  notes: `
"So why don't they leave? Look at the tools."
"Moving the bytes is solved: DataSync, Storage Transfer, Storage Mover, rclone. Checking they arrived is solved too."
"But the first question, will my code still work on the new cloud, has no tool. It's spreadsheets, guesswork and weeks. And you find out in production."
"That gap, before the migration, is where RISE lives."
`,

  html: `
    <div class="tl">
      <h2 class="title split">Every tool moves your data. <span class="soft">None checks your code first.</span></h2>
      <div class="market">
          <div class="phases">
            <article class="phase gap rv" style="--i:1">
              <span class="step">1 · Before</span>
              <h3>Will my code still work there?</h3>
              <p class="nobody">No tool.</p>
              <p class="how">Spreadsheets, guesswork, weeks.<br>You find out in production.</p>
            </article>
            <article class="phase glass rv" style="--i:2">
              <span class="step">2 · Move</span>
              <h3>Copy the bytes</h3>
              <div class="tools"><span class="tag">AWS DataSync</span><span class="tag">Google Storage Transfer</span><span class="tag">Azure Storage Mover</span><span class="tag">rclone</span></div>
              <p class="solved"><span class="dot"></span>Solved</p>
            </article>
            <article class="phase glass rv" style="--i:3">
              <span class="step">3 · After</span>
              <h3>Did it all arrive?</h3>
              <div class="tools"><span class="tag">rclone check</span><span class="tag">checksums</span><span class="tag">cutover runbooks</span></div>
              <p class="solved"><span class="dot"></span>Solved</p>
            </article>
          </div>
          <p class="punch rv" style="--i:5">The gap is <b>before</b> the migration. That's where RISE lives.</p>
        </div>
    </div>`,

  css: `
    .tl { height: 100%; display: grid; grid-template-rows: auto 1fr; gap: 48px; }
    .tl > .title { max-width: 26ch; }
    .market { display: grid; grid-template-rows: 1fr auto; gap: 36px; min-height: 0; }
    .phases { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 28px; }
    .phase { padding: 40px 40px 36px; display: grid; grid-template-rows: auto auto 1fr auto; gap: 18px; align-content: start; }
    .phase .step { font: 500 22px/1 var(--f-mono); color: var(--muted); }
    .phase h3 { font-size: 40px; line-height: 1.1; font-weight: 600; letter-spacing: -.025em; }
    .tools { display: flex; flex-wrap: wrap; gap: 10px; align-content: start; }
    .solved { display: flex; align-items: center; gap: 10px; font-size: var(--t1); font-weight: 500; color: var(--ok); }

    .gap { border-radius: 32px; border: 3px dashed color-mix(in srgb, var(--bad) 55%, transparent); background: color-mix(in srgb, var(--bad-bg) 55%, transparent); }
    .gap .step { color: var(--bad); }
    .nobody { font-size: 96px; line-height: .95; font-weight: 700; letter-spacing: -.045em; color: var(--bad); }
    .how { font-size: var(--t1); line-height: 1.4; color: var(--muted); }

    .punch { font-size: 44px; line-height: 1.15; font-weight: 600; letter-spacing: -.025em; color: var(--ink); }
    .punch b { font-weight: 700; color: var(--act); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("problem"); },
});
