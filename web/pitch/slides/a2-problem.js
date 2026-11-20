/* Parte A · 2 · Problema: a dor (3 números do inquérito, servidos pelo RISE). */
RISE.slide({
  id: "problem",
  title: "Problem",
  time: "0:15 – 0:35",
  notes: `
"Leaseweb asked 800 senior leaders this year. 89% said they could not move their critical workloads off their main cloud within three weeks."
"And the ones who do move, pay for it. McKinsey asked 450 IT leaders: 75% went over budget, 38% ran more than a quarter late. More than 100 billion dollars wasted in three years."
"Why? Nobody knows what will break until they move."
Fontes: Leaseweb Digital Independence Survey 2026 (respostas a inquérito). McKinsey, "Cloud-migration opportunity: Business value grows, but missteps abound", Oct 2021, ~450 CIOs/IT leaders.`,

  html: `
    <div class="prob">
      <h2 class="title split">Leaving your cloud is a <span class="soft">leap of faith.</span></h2>
      <div class="board">
        <div class="hero rv" style="--i:2">
          <b>89<small>%</small></b>
          <p>can't move their critical workloads<br>off their main cloud <strong>in 3 weeks.</strong></p>
          <span class="cite">Leaseweb survey 2026 · 800 leaders</span>
        </div>
        <div class="side">
          <div class="moved glass rv right" style="--i:4">
            <span class="k">Those who move anyway</span>
            <div class="nums">
              <div><b>75<small>%</small></b><p>over budget</p></div>
              <div><b>38<small>%</small></b><p>a quarter late</p></div>
              <div><b>$100B</b><p>wasted in 3 years</p></div>
            </div>
            <span class="cite">McKinsey 2021 · 450 IT leaders</span>
          </div>
          <p class="why rv right" style="--i:6"><span class="k">Why?</span> Nobody knows what will break <strong>until they move.</strong></p>
        </div>
      </div>
    </div>`,

  css: `
    .prob { height: 100%; display: grid; grid-template-rows: auto 1fr; gap: 40px; }
    .board { display: grid; grid-template-columns: 1fr 1.05fr; gap: 64px; align-items: center; }
    .hero b { display: block; font-size: 290px; line-height: .82; font-weight: 700; letter-spacing: -.06em; color: var(--bad); }
    b small { font-size: .5em; letter-spacing: -.02em; }
    .hero p { margin-top: 24px; font-size: 40px; line-height: 1.2; font-weight: 500; letter-spacing: -.02em; }
    .hero strong { color: var(--bad); font-weight: 700; }
    .cite { display: block; margin-top: 18px; font: 500 18px/1.2 var(--f-mono); color: var(--faint-ink); }
    .side { display: grid; gap: 36px; }
    .moved { --radius: 30px; padding: 32px 38px 26px; }
    .k { font: 600 21px/1 var(--f-mono); color: var(--muted); }
    .nums { margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .nums b { display: block; font-size: 84px; line-height: .9; font-weight: 700; letter-spacing: -.05em; color: var(--bad); }
    .nums p { margin-top: 10px; font-size: 26px; line-height: 1.15; font-weight: 600; color: var(--ink); }
    .why { font-size: 44px; line-height: 1.15; font-weight: 650; letter-spacing: -.03em; }
    .why .k { display: block; margin-bottom: 10px; }
    .why strong { color: var(--accent); }`,

  init(el) { FX.prep(el); },
  enter() { FX.act("problem"); },
});
