// RISE film · RENDER. Photographs film.html frame by frame and encodes it with the mix.
//   node --experimental-websocket video/render.mjs 480        (fast draft)
//   node --experimental-websocket video/render.mjs 1080       (final)
//   add a third arg "12-20" to render only that time range (seconds) for quick checks.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch, page, sleep } from "./cdp.mjs";

const H = +(process.argv[2] || 480), W = Math.round((H * 16) / 9 / 2) * 2;
const range = process.argv[3]?.split("-").map(Number);
const url = pathToFileURL(resolve("video/film.html")).href + "?render";
const chrome = await launch(9346);
const p = await page(chrome.port, url, 1920, 1080, 1);
await sleep(1500);
await p.js("window.FILM.ready");
const { total, fps } = await p.js("({ total: FILM.total, fps: FILM.fps })");
const [t0, t1] = range || [0, total];
const n = Math.round((t1 - t0) * fps);
const out = resolve(`video/build/rise-film-${H}p${range ? `-${t0}-${t1}` : ""}.mp4`);
const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-ss", String(t0), "-t", String(t1 - t0), "-i", resolve("video/build/mix.wav"),
  "-vf", `scale=${W}:${H}:flags=lanczos`, "-c:v", "libx264", "-preset", H > 720 ? "slow" : "veryfast", "-crf", H > 720 ? "16" : H >= 720 ? "19" : "26",
  "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", "-shortest", out], { stdio: ["pipe", "inherit", "inherit"] });
const scale = H > 720 ? 1 : Math.min(1, (H * 1.5) / 1080);
const started = Date.now();
for (let f = 0; f < n; f++) {
  const t = t0 + f / fps;
  await p.js(`FILM.seek(${t})`);
  const { data } = await p.send("Page.captureScreenshot", { format: "jpeg", quality: H > 720 ? 95 : 85,
    clip: { x: 0, y: 0, width: 1920, height: 1080, scale } });
  if (!ff.stdin.write(Buffer.from(data, "base64"))) await new Promise((r) => ff.stdin.once("drain", r));
  if (f % 150 === 0) console.log(`${t.toFixed(1)}s / ${t1.toFixed(1)}s · ${((Date.now() - started) / 1000).toFixed(0)}s elapsed`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
p.close(); chrome.close();
console.log("done", out, `${((Date.now() - started) / 1000).toFixed(0)}s`);
process.exit(0);
