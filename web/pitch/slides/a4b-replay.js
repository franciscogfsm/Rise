/* Parte A · 5 · Replay de migração sem partilhar código: a sequência real de operações S3 é captada
   dentro da empresa e reproduzida nos candidatos com dados sintéticos. Diagrama explicativo:
   os nomes dos candidatos e a divergência são ilustrativos e estão marcados como tal. */
RISE.slide({
  id: "replay",
  title: "Replay",
  time: "1:25 – 1:45",
  // automatic: the grid fills, then the divergence appears (no clicks needed)
  notes: `
"Some companies can't share their code at all. For them, there's replay."
"RISE records, locally, a real sequence of S3 operations from the running app. The code and the data never leave the company."
(automático) "Then it replays exactly that sequence on each candidate provider, with synthetic data."
(automático, ~3 s) "And it shows the first operation that would behave differently: which step, on which provider, and the evidence, side by side."
Este slide é uma ilustração: os candidatos A/B/C e a divergência no passo 4 são exemplos. Se perguntarem, dizê-lo.`,

  OPS: ["PutObject", "HeadObject", "ListObjectsV2", "GetObject (range)", "Presigned GET", "DeleteObject"],
  CANDIDATES: ["Candidate A", "Candidate B", "Candidate C"],
  DIVERGE: { op: 3, cand: 1 },   // ilustração: passo 4 no candidato B

  html: `
    <div class="rp">
      <h2 class="title split"><span class="soft">Can't share your code?</span> Replay it instead.</h2>
      <div class="stage">
        <section class="inside rv" style="--i:2">
          <p class="lbl"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="5" y="11" width="14" height="10" rx="2"/></svg>Stays in your company</p>
          <p class="sub">Real S3 sequence, recorded locally</p>
          <ol class="seq"></ol>
        </section>
        <div class="flow rv" style="--i:4">
          <svg viewBox="0 0 120 24" aria-hidden="true"><path d="M2 12h108m-12-10 12 10-12 10"/></svg>
          <span>sequence only<br>synthetic data</span>
        </div>
        <section class="out">
          <div class="cands"></div>
          <div class="grid"></div>
        </section>
      </div>
      <div class="found glass" data-s="2">
        <span class="pill bad">First change in behaviour</span>
        <p><b>Step 4</b> <code>GetObject (range)</code> on <b>Candidate B</b></p>
        <p class="ev">Evidence: status, headers and SHA-256 of the body on both sides, with request IDs.</p>
        <span class="eg">Illustration</span>
      </div>
    </div>`,

  css: `
    .rp { height: 100%; display: grid; grid-template-rows: auto 1fr auto; gap: 34px; }
    .title { max-width: 26ch; }
    .stage { display: grid; grid-template-columns: 560px 170px 1fr; align-items: start; }
    .inside { padding: 26px 30px; border-radius: 28px; border: 3px dashed rgba(18,31,53,.28); background: rgba(255,255,255,.55); }
    .lbl { display: flex; align-items: center; gap: 10px; font-size: var(--t1); font-weight: 650; }
    .lbl svg { width: 26px; height: 26px; fill: none; stroke: var(--ink); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    .sub { margin-top: 4px; font-size: 22px; color: var(--muted); }
    .seq { list-style: none; margin-top: 16px; }
    .seq li, .grid .row { height: 54px; display: flex; align-items: center; }
    .seq li { gap: 16px; font: 500 23px var(--f-mono); border-top: 1px solid var(--line); }
    .seq li i { font-style: normal; color: var(--faint-ink); width: 22px; }
    .flow { align-self: center; display: grid; justify-items: center; gap: 10px; text-align: center; font-size: 20px; line-height: 1.3; color: var(--muted); }
    .flow svg { width: 120px; fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .out { padding-top: 26px; }
    .cands, .grid .row { display: grid; grid-template-columns: repeat(3, 1fr); }
    .cands { height: 64px; align-items: end; padding-bottom: 12px; }
    .cands span { text-align: center; font-size: var(--t1); font-weight: 650; }
    .grid .row { border-top: 1px solid var(--line); }
    .cell { justify-self: center; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font: 700 19px/1 var(--f-ui);
      color: var(--ok); background: var(--ok-bg); transform: scale(0); transition: transform .45s var(--e-spring); transition-delay: calc(var(--r) * 160ms + var(--c) * 50ms); }
    &.s1 .cell { transform: none; }
    .cell.bad { transition: transform .45s var(--e-spring), background .4s, color .4s, box-shadow .4s; transition-delay: calc(var(--r) * 160ms + var(--c) * 50ms), 0s, 0s, 0s; }
    &.s2 .cell.bad { color: var(--bad); background: var(--bad-bg); box-shadow: 0 0 0 6px rgba(212,81,59,.15); }
    &.s2 .cell.bad::after { content: "!"; }
    &.s2 .cell.bad span { display: none; }
    .found { position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 22px; padding: 22px 30px; --radius: 22px;
      opacity: 0; transform: translateY(16px); transition: opacity .5s var(--e-out) .2s, transform .8s var(--e-out) .2s; }
    &.s2 .found { opacity: 1; transform: none; }
    .found p { font-size: var(--t2); }
    .found code { font: 500 24px var(--f-mono); color: var(--bad); }
    .found .ev { flex-basis: 100%; font-size: var(--t1); color: var(--muted); }
    .found .eg { position: absolute; right: 22px; top: 18px; font: 500 16px var(--f-mono); color: var(--faint-ink); }`,

  init(el) {
    el.querySelector(".seq").innerHTML = this.OPS.map((op, i) => `<li><i>${i + 1}</i>${op}</li>`).join("");
    el.querySelector(".cands").innerHTML = this.CANDIDATES.map(c => `<span>${c}</span>`).join("");
    el.querySelector(".grid").innerHTML = this.OPS.map((_, r) => `<div class="row">${this.CANDIDATES.map((_, c) => {
      const bad = r === this.DIVERGE.op && c === this.DIVERGE.cand;
      return `<span class="cell${bad ? " bad" : ""}" style="--r:${r};--c:${c}"><span>✓</span></span>`;
    }).join("")}</div>`).join("");
    FX.prep(el);
  },
  enter(el, api) {
    FX.act("solution");
    if (api.still) return el.classList.add("s1", "s2");
    this._t = [setTimeout(() => el.classList.add("s1"), 900), setTimeout(() => el.classList.add("s2"), 3300)];
  },
  leave(el) { (this._t || []).forEach(clearTimeout); el.classList.remove("s1", "s2"); },
});
