// Takes the film's screenshots from a RUNNING RISE (real state, nothing staged):
//   SOURCE_LINK_PORT=9198 RISE_PORT=8099 bash scripts/run.sh      (in WSL)
//   node --experimental-websocket video/capture.mjs http://localhost:8099
// Uses existing analyses only: no new AI calls. Writes video/shots/*.png at 2x.
import { writeFileSync } from "node:fs";
import { launch, page, sleep } from "./cdp.mjs";

const base = process.argv[2] || "http://localhost:8099";
const out = (n, b) => { writeFileSync(`video/shots/${n}.png`, b); console.log("shot", n); };
const chrome = await launch(9345);
const p = await page(chrome.port, base + "/", 1600, 1000, 2);
try {
  await sleep(1500);
  const list = await p.js(`fetch("/api/analyses").then(r => r.json())`);
  const all = Array.isArray(list) ? list : list.analyses || list.items || [];
  const ready = all.find((a) => JSON.stringify(a).includes("s3PresignedUrl") && JSON.stringify(a).includes("4/4")) || all.find((a) => JSON.stringify(a).includes("s3PresignedUrl"));
  const docs = all.find((a) => JSON.stringify(a).includes("CandyShare") && /leaseweb/i.test(JSON.stringify(a)));
  console.log("analyses", all.length, ready?.id, docs?.id);

  // 1. the box, empty and with Paul's repo typed in
  out("home", await p.shot());
  const url = "github.com/ucapistranmtz/s3PresignedUrl_v3: move to a European cloud";
  await p.js(`(() => { const i = document.querySelector('[placeholder^="github.com/acme"]'); i.focus(); return !!i; })()`);
  for (let k = 1; k <= url.length; k++) {
    await p.send("Input.insertText", { text: url[k - 1] });
    if (k === 22) out("home-typing", await p.shot());
  }
  await sleep(200);
  out("home-typed", await p.shot());

  // 2. a finished analysis (ready to migrate) and the Leaseweb docs check
  if (ready) { await p.go(`${base}/a/${ready.id}`); await sleep(1500); out("analysis", await p.shot()); }
  if (docs) { await p.size(1600, 1250); await p.go(`${base}/a/${docs.id}`); await sleep(1500); out("leaseweb-docs", await p.shot()); }

  // 3. replay: the app's recorded calls re-run on both providers (real calls, no AI)
  // the recorder fills while asset-service runs on its original provider (Live switch → Discover)
  console.log("discover", (await p.js(`fetch("/api/demo/discover", { method: "POST" }).then(r => r.status)`)));
  await p.size(1600, 1250); await p.go(`${base}/replay`);
  const click = (t) => p.js(`[...document.querySelectorAll("button")].find((b) => b.textContent.includes(${JSON.stringify(t)}))?.click() ?? "missing"`);
  await click("Use asset-service recording"); await sleep(1500);
  out("replay-trace", await p.shot());
  await click("Replay on"); await sleep(6000);
  out("replay", await p.shot());

  // 4. live switch after Discover
  await p.size(1600, 1000); await p.go(`${base}/demo`); await sleep(2500);
  out("live-start", await p.shot());  // the finished journey is docs/screen-demo.png (live-switch.png)
} finally {
  p.close(); chrome.close();
}
process.exit(0);
