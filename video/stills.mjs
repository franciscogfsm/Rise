// Quick look: node --experimental-websocket video/stills.mjs 1.5 9 20.2  → video/build/still-<t>.png (960x540)
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch, page, sleep } from "./cdp.mjs";
const chrome = await launch(9347);
const p = await page(chrome.port, pathToFileURL(resolve("video/film.html")).href + "?render", 1920, 1080, 1);
await sleep(1500); await p.js("window.FILM.ready");
const errs = await p.js("window.__errs || []");
for (const t of process.argv.slice(2)) {
  const id = await p.js(`FILM.seek(${t})`);
  const { data } = await p.send("Page.captureScreenshot", { format: "jpeg", quality: 80, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 0.5 } });
  writeFileSync(`video/build/still-${t}.jpg`, Buffer.from(data, "base64")); console.log(t, id);
}
p.close(); chrome.close(); process.exit(0);
