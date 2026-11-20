/*
  RISE · utilitários de motion partilhados pelos slides. Partilhado: mudar só depois de combinar.
  Tudo respeita html.still (?static e prefers-reduced-motion): salta para o estado final.
  Regra: nada aqui inventa dados. Não há contadores a subir nem caracteres aleatórios.
*/
(() => {
  "use strict";
  const still = () => document.documentElement.classList.contains("still");

  /* Parte o texto de .split em palavras (mantém <br> e elementos) para o reveal palavra a palavra. */
  function split(root) {
    root.querySelectorAll(".split").forEach(node => {
      if (node.dataset.splitDone) return;
      node.dataset.splitDone = "1";
      let wi = 0;
      const walk = el => {
        [...el.childNodes].forEach(n => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(part => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.append(" "); return; }
              const w = document.createElement("span"); w.className = "w";
              const s = document.createElement("span"); s.textContent = part;
              w.style.setProperty("--wi", wi++); w.append(s); frag.append(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
        });
      };
      walk(node);
    });
  }

  /* Mede os traços SVG .draw para o desenho ter o comprimento certo. */
  function draw(root) {
    root.querySelectorAll(".draw").forEach(p => { try { p.style.setProperty("--len", Math.ceil(p.getTotalLength()) + 1); } catch { /* sem geometria */ } });
  }

  /* Numera os .rv sem --i, por ordem no DOM, por grupo de passo. */
  function index(root) {
    const groups = {};
    root.querySelectorAll(".rv").forEach(el => {
      if (el.style.getPropertyValue("--i")) return;
      const g = el.dataset.s || "0"; groups[g] = (groups[g] ?? -1) + 1;
      el.style.setProperty("--i", groups[g]);
    });
  }

  /* Escreve um valor REAL da esquerda para a direita (hashes, IDs). Sem caracteres inventados. */
  function type(el, text, { dur = 700, delay = 0 } = {}) {
    if (!el) return;
    cancelAnimationFrame(el._raf); clearTimeout(el._t);
    text = String(text ?? "");
    if (still()) { el.textContent = text; return; }
    el.textContent = "";
    el._t = setTimeout(() => {
      const t0 = performance.now();
      const tick = now => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = text.slice(0, Math.round(text.length * k));
        if (k < 1) el._raf = requestAnimationFrame(tick);
      };
      el._raf = requestAnimationFrame(tick);
    }, delay);
  }

  /* Muda o humor do fundo: problem | solution | proof | finale. */
  function act(name) { const d = document.getElementById("deck"); if (d) d.dataset.act = name; }

  /* Prepara um slide de uma vez (chamar no init). */
  function prep(root) { split(root); index(root); requestAnimationFrame(() => draw(root)); }

  window.FX = { still, split, draw, index, type, act, prep };
})();
