/*
  Ponte entre o pitch e o backend do RISE. É o único ficheiro que conhece a API:
  se o backend mudar, muda-se aqui e os slides ficam iguais.

  Regra: o pitch nunca inventa um pedido. Sem backend, devolve { ok:false, offline:true }
  e o slide mostra o estado vazio.
*/
(() => {
  "use strict";
  const C = window.RISE_CONFIG || {};
  const base = C.apiBase || "";
  const online = location.protocol.startsWith("http") || !!base;
  const rid = () => crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);

  async function json(path) {
    if (!online) throw new Error("offline");
    const r = await fetch(base + path, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  /* Pedido novo e sem cache a um asset do pitch, através do routing do RISE. */
  async function asset(key) {
    if (!online) return { ok: false, offline: true, key };
    const id = rid();
    try {
      const r = await fetch(`${base}/app/assets/${encodeURI(key)}?rid=${id}`, { cache: "no-store" });
      if (!r.ok) {
        let detail = `HTTP ${r.status}`;
        try { detail = (await r.json()).detail || detail; } catch { /* corpo sem JSON */ }
        return { ok: false, key, rid: id, error: detail };
      }
      return {
        ok: true, key, rid: id, at: new Date(),
        url: URL.createObjectURL(await r.blob()),
        provider: r.headers.get("X-RISE-Provider") || "unknown",
        requestId: r.headers.get("X-RISE-Request-Id") || "",
        sha256: r.headers.get("X-RISE-SHA256") || "",
      };
    } catch (e) {
      return { ok: false, key, rid: id, error: e.message };
    }
  }

  let providersCache = null;
  async function providers() {
    if (providersCache) return providersCache;
    try {
      const s = await json("/api/demo/state");
      providersCache = Object.fromEntries((s.providers || []).map(p => [p.id, p]));
    } catch { providersCache = {}; }
    return providersCache;
  }

  /* Callback a cada mudança de estado no backend (SSE). Devolve a função para parar. */
  function onChange(cb) {
    if (!online || !window.EventSource) return () => {};
    const es = new EventSource(base + "/api/events");
    es.onmessage = () => cb();
    return () => es.close();
  }

  window.RISE_LIVE = {
    online, asset, providers, onChange,
    state: () => json("/api/demo/state"),
    proof: () => json("/api/demo/proof"),
  };
})();
