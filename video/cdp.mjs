// Tiny Chrome DevTools helper shared by capture.mjs and render.mjs (Node 20: run with --experimental-websocket).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch(port = 9344) {
  const dir = resolve("video/build/chrome");
  mkdirSync(dir, { recursive: true });
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--hide-scrollbars",
    "--no-first-run", "--disable-gpu-vsync", "--autoplay-policy=no-user-gesture-required", "--allow-file-access-from-files", "about:blank"],
    { stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(200); }
  }
  return { port, close: () => proc.kill() };
}

export async function page(port, url, w, h, dpr = 1) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURI(url)}`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0; const wait = {};
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (wait[m.id]) { wait[m.id](m); delete wait[m.id]; } });
  const send = (method, params = {}) => new Promise((r, j) => {
    wait[++id] = (m) => (m.error ? j(new Error(`${method}: ${m.error.message}`)) : r(m.result)); ws.send(JSON.stringify({ id, method, params }));
  });
  const size = (W, H, D = dpr) => send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: D, mobile: false });
  await size(w, h);
  const js = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
  const go = async (u) => { await send("Page.navigate", { url: u }); await sleep(2500); };
  const shot = async (opts = {}) => Buffer.from((await send("Page.captureScreenshot", { format: "png", ...opts })).data, "base64");
  return { send, js, go, shot, size, close: () => ws.close() };
}
