/* Parte B · slide 7 · Impacto: onboarding da Leaseweb e um adaptador por serviço */
RISE.slide({
  id: "business",
  title: "Impact",
  time: "3:40 – 4:20",
  notes: `
"Remember the 89%. RISE gives them a way to find out, one dependency at a time, before they commit."
"A provider like Leaseweb could put RISE into customer onboarding: connect your current cloud, run RISE, see your own app pass, then move."
(a linha) "Today we go deep on one service: S3 object storage. Every service is an adapter, so databases and queues come next, and the same checks can run in CI on every release."
"It's open source, Apache 2.0."
Não dizer que já funciona com a Leaseweb Object Storage: o destino da demo é simulado.`,

  html: `
    <h2 class="title">Customers arrive with proof, not with risk.</h2>
    <div class="row">
      <p class="lead">RISE fits into a provider's onboarding. Before a customer moves, they connect their current cloud, run RISE, and watch their own app pass on the new one.</p>
      <ol class="road" aria-label="Adapters">
        <li class="now"><i></i><b>Object storage</b><span>S3 API, working today</span></li>
        <li><i></i><b>Databases and queues</b><span>Next adapters</span></li>
        <li><i></i><b>Every release</b><span>The same checks, run in CI</span></li>
      </ol>
    </div>
    <p class="oss">Open source under Apache 2.0.</p>`,

  css: `
    display: flex; flex-direction: column; justify-content: space-between;
    .title { max-width: 18ch; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 120px; align-items: center; }
    .road { list-style: none; position: relative; display: grid; gap: 44px; }
    .road::before { content: ""; position: absolute; left: 13px; top: 20px; bottom: 20px; width: 2px; background: var(--line); }
    .road li { display: grid; grid-template-columns: 28px 1fr; column-gap: 30px; row-gap: 4px; align-items: center; }
    .road i { grid-row: span 2; width: 28px; height: 28px; border-radius: 50%; background: var(--bg); box-shadow: inset 0 0 0 3px rgba(18,31,53,.35); position: relative; z-index: 1; }
    .road b { font-size: var(--t3); font-weight: 600; letter-spacing: -.015em; }
    .road span { font-size: var(--t1); color: var(--muted); }
    .road .now i { background: var(--ok); box-shadow: 0 0 0 8px var(--ok-bg); }
    .road .now span { color: var(--ok); font-weight: 600; }
    .oss { font-size: var(--t2); color: var(--muted); }`,
});
