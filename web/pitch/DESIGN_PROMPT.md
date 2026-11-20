# Prompt para o Claude (design dos slides do RISE)

> Copiar tudo a partir da linha abaixo e colar numa conversa nova. Depois colar UM ficheiro de slide de cada vez (`web/pitch/slides/*.js`).

---

És o designer visual de um pitch de hackathon. O texto já está fechado: **não reescrevas copy**, não acrescentes nem tires frases. O teu trabalho é só a qualidade visual: composição, hierarquia, espaço, tipografia, cor e movimento.

## O projeto
**RISE** é uma plataforma de IA que prova, com testes reais, que uma aplicação funciona noutro fornecedor cloud antes de migrar. Slogan: *Built to rise when clouds fall.* O pitch dura 5 minutos (4 de slides e 1 de demo ao vivo), é em inglês e é visto **num projetor a 10 m**. O deck é HTML próprio, sem frameworks, e corre dentro da app real: alguns slides pedem dados ao backend durante a apresentação.

## Como é um slide
Cada slide é um ficheiro JS que chama `RISE.slide({...})` com:
- `id`, `title`, `time`, `steps`, `notes`: **não mexer**.
- `html`: o conteúdo. Podes reestruturar, mas **mantém todas as classes e elementos que o JS usa** (lista abaixo).
- `css`: CSS do slide. O motor embrulha-o em `.slide[data-slide="<id>"] { ... }` com CSS nesting. Usa `&.cur` para o estado "slide visível" (entradas) e `&.s1`, `&.s2` para os passos dentro do slide.
- `globalCss`: só para `@keyframes` ou regras fora do slide.
- `init`, `enter`, `leave`, `step`, `key` e qualquer método `_algo`: **não mexer na lógica**. Se precisares de uma classe extra para estilo, podes acrescentar no HTML gerado, sem mudar o comportamento.

**Devolve sempre o ficheiro completo do slide**, pronto a substituir o original, e no fim uma lista curta do que mudaste.

## Palco
- Tela fixa de **1920×1080 px**, escalada para caber no ecrã. Desenha em px reais deste palco.
- Margens: `--pad-x: 120px`, `--pad-top: 150px`, `--pad-bottom: 130px`. O logótipo (topo esquerdo, y≈56) e a barra de progresso (fundo, y≈1024) são do motor: não os tapes.
- Escala tipográfica: `--t1: 24px`, `--t2: 28px`, `--t3: 32px`, `--t4: 48px`, `--t5: 64px`, `--t6: 96px`, `--t7: 128px`. **Nunca menos de 18 px** (projetor).
- Classes globais disponíveis: `.display`, `.title`, `.lead`, `.body`, `.eyebrow`, `.num` (números grandes), `.glass`, `.pill` (+ `.ok` `.bad` `.warn` `.idle` `.live` `.run`), `.served` (proveniência de um pedido), `.empty` (estado vazio), `.browser`/`.bar`/`.host`/`.screen` (moldura da app).

## Design system: Pearl Pro (obrigatório)
Light Liquid Glass, pérola e branco, com vidro com aresta refratada subtil. **A legibilidade vence o efeito**: se o vidro tirar contraste, aumenta-se a opacidade do vidro e nunca se aclara o texto.
- **Fontes:** Geist (UI e display; títulos 600, letter-spacing −0.025 a −0.035em, `text-wrap: balance`) e Geist Mono (só para dados técnicos: hashes, request IDs, operações, nomes de chaves).
- **Estados (as cores contam a história):** mint `--ok` = passou/verificado · coral `--bad` = falhou/cortado · âmbar `--warn` = não suportado/cache · azul `--accent` com pill sólida = live/a servir · `--muted` = inativo.
- **Vidro** só em objetos (cartões de dados, ecrãs, listas de evidência), nunca como caixa genérica à volta de texto. Precisa de cor por trás: o palco já tem 3 blobs (ice, lavanda, aqua).
- **Movimento:** transições de 300–500 ms com ease-out, no máximo um momento orquestrado por slide e nada de fade-and-slide em todos os elementos. O motor desliga tudo com `prefers-reduced-motion` e no modo `?static` (`html.still`): **o estado final tem de estar correto sem animação**.
- **Nunca:** neon, tema escuro, gradientes fortes, texto cinzento-claro sobre vidro, emoji como marcadores, cartões todos iguais sem hierarquia, animações longas.
- **Motion disponível** (`core/stage.css` + `core/fx.js`, já no harness): `.rv` (+ `data-s`, `--i`, variantes `.fade .scale .left .right .mask .pop`), `.split`, `.draw`, `FX.prep(el)` no init, `FX.act("problem|solution|proof|finale")` no enter, `FX.type`. Usa estes em vez de inventares outro sistema.
- **Não uses:** itálico serifado ou palavras coloridas nos títulos, etiquetas mono em maiúsculas com traço, cores fora do `rise.css`, nem animações infinitas.
- **Evita os tiques de "página gerada":** uma palavra do título noutra cor ou em itálico, eyebrows em maiúsculas por cima de tudo, metadados com " · ", "→" no fim de botões, sombras cinzentas iguais em todos os cartões, numeração 01/02/03 em coisas que não são sequências.

## Regras que não se podem partir (honestidade da demo)
- **Não inventes dados.** Hashes, request IDs, providers, contagens e resultados vêm do backend. Os estados vazios e as etiquetas `Example` / `Local preview` / `Cached` existem de propósito: desenha-os bem, não os escondas.
- Não acrescentes QR codes, telemóveis, uploads do público, imagens externas nem bibliotecas novas. Só Google Fonts (Geist e Geist Mono, já carregadas).
- Não animes coisas que não aconteceram: nada de contadores a subir do zero, hashes com caracteres aleatórios, pontos a "fluir" que parecem tráfego ou cabos a partir com uma tecla. Para revelar um valor real usa `FX.type(el, valor)`.
- Não escrevas promessas que o RISE não faz ("zero downtime", "live migration", "ninguém repara"). O RISE prova compatibilidade; não migra sozinho.
- Para dados em tempo real, subscreve no `enter` (`this._off = api.live.onChange(...)`) e cancela no `leave`. Nunca no `init`.
- O slide da demo tem de chamar `api.frame(caixa, api.config.dashboardPath, {...})`. Sem URL, a app não aparece.
- O destino da demo é simulado: nunca o apresentes como "Leaseweb".

## Classes e elementos que o JS usa (manter)
| Slide | Manter |
|---|---|
| a1-cover | `.display.split`, `.hero` com os 3 `path.draw` |
| a2-problem | `.frames` (o JS gera `.frame[data-k][data-key]` com `.fallback` ou `img`), `.turn`, `.served`, `.src`; passos `s1`–`s3` |
| a3-how | `.steps` (o JS gera `li.step` com `.ico`, `.n`, `h3`, `p`), `.rail path.draw` |
| a4-discover | `.chart` (o JS gera `.row > .op + .bar > i + .n`; classe `.go`), `.total b` |
| a5-ai | `.list` (li > .ix + .t + .k; classe `.go`), `.count b`, `.origin` (pill cuja classe muda), `.never` |
| b1-demo | `.active`, `.link`, `.browser .bar .host`, `.mode`, `.screen.app` (iframe da app real: **é o espaço da demo, não o reduzas nem o removas**), `.trace ol` |
| b2-adapt | `.cols` (o JS gera 3 `section.col` com `.kind`, `.err`, `.diag`, `.change`, `.score`, `.pills`, `svg.arrow`; classes `.fail`/`.pass`; passos `s1`, `s2`) |
| b3-integrity | `.grid` (o JS gera `.obj` com `.f`, `.chk`, `.h > code[data-h]`; classe `.go`), `.score .n`, `.score .of` |
| b4-cut | `.src`/`.dst` `.name` `.sim` `.detail[data-s]`, `.link.left`/`.right` (`i.a`, `i.b`, `.x`); classes `.has-cut`/`.has-op` (o cabo só parte se o corte aconteceu); passos `s1`, `s2` |
| b5-impact | (estático) |
| b6-reveal | `.frame`, `.served`, `.statement.split[data-s="1"]`, `.timeline` (`.d`, `.d.dst`, `.sw`), `.legend`; passo `s1` |
| b7-close | `.mark` com os 3 `path.draw`, `.display.split`, `.sign` |

## Pré-visualizar
Abaixo está um **harness**: uma página HTML com o CSS real do deck (`rise.css` + `deck.css`) e um motor mínimo. Para veres um slide, cola o ficheiro do slide onde diz `COLAR AQUI` e mostra-me o resultado como artifact HTML. O botão "Replay" repete a entrada e "Next step" avança os passos. `MOCK = true` enche os slides com **dados falsos só para veres o desenho preenchido**: esses dados nunca podem passar para o ficheiro do slide. Com `MOCK = false` vês os estados vazios, que também têm de ficar bonitos.

Quando eu colar um slide: (1) diz-me em 3–5 linhas o que melhorarias visualmente e porquê, (2) faz as mudanças, (3) mostra a pré-visualização, (4) devolve o ficheiro completo.

### Harness
```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RISE slide preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&display=swap">
<style>
/* ===== rise.css (design system Pearl Pro, igual à app) ===== */
/* RISE design system — Option E · Pearl Pro (see DESIGN_SYSTEM.md). Light only, by design. */
:root {
  color-scheme: light;
  --bg: #F7F8FA;
  --white: #FFFFFF;
  --blob-ice: #DCEBFF;
  --blob-lavender: #E9E4FF;
  --blob-aqua: #C6F0EC;
  --glass: rgba(255,255,255,.66);
  --glass-strong: rgba(255,255,255,.88);
  --edge: #FFFFFF;
  --ink: #121F35;
  --muted: #42506A;
  --faint: rgba(18,31,53,.07);
  --line: rgba(18,31,53,.08);
  --accent: #2563EB;
  --ok: #0A8A74;   --ok-bg: #D2F4EC;
  --bad: #D4513B;  --bad-bg: #FCE0D9;
  --warn: #B87708; --warn-bg: #FBEFD5;
  --radius: 22px;
  --blur: 30px;
  --sat: 1.7;
  --shadow: 0 1px 1px rgba(26,41,63,.05), 0 14px 34px -10px rgba(26,41,63,.20);
  --f-ui: "Geist", "Segoe UI", system-ui, sans-serif;
  --f-mono: "Geist Mono", ui-monospace, "Cascadia Mono", Consolas, monospace;
  --ease: cubic-bezier(.2,.8,.2,1);
}
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { background: var(--bg); color: var(--ink); font: 15px/1.5 var(--f-ui); -webkit-font-smoothing: antialiased; }
button { font: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* background blobs: the glass needs colour behind it */
.bg { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.bg i { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .95; }
.bg i:nth-child(1) { width: 52vw; aspect-ratio: 1; left: -12vw; top: -22vw; background: var(--blob-ice); }
.bg i:nth-child(2) { width: 44vw; aspect-ratio: 1; right: -10vw; top: 18vh; background: var(--blob-lavender); }
.bg i:nth-child(3) { width: 38vw; aspect-ratio: 1; left: 32vw; bottom: -24vw; background: var(--blob-aqua); }

/* glass material */
.glass {
  position: relative;
  background: var(--glass);
  backdrop-filter: blur(var(--blur)) saturate(var(--sat));
  -webkit-backdrop-filter: blur(var(--blur)) saturate(var(--sat));
  border-radius: var(--radius);
  box-shadow: inset 0 1px 0 var(--edge), inset 0 0 0 1px rgba(255,255,255,.45), inset 0 -1px 0 rgba(26,41,63,.05), var(--shadow);
}
.glass::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,0) 38%), radial-gradient(120% 60% at 0% 0%, rgba(255,255,255,.5), transparent 60%);
  mix-blend-mode: soft-light; }
.glass::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; padding: 1px;
  background: linear-gradient(135deg, #fff, rgba(220,235,255,.7) 45%, rgba(233,228,255,.7) 75%, #fff);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
.glass > * { position: relative; z-index: 1; }

/* type helpers */
.eyebrow { font: 500 11px/1 var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.mono { font-family: var(--f-mono); font-size: 12.5px; }
.muted { color: var(--muted); }
h1, h2, h3 { margin: 0; letter-spacing: -.025em; text-wrap: balance; }

/* pills */
.pill { display: inline-flex; align-items: center; gap: 7px; font: 600 12px/1 var(--f-ui); padding: 7px 10px; border-radius: 999px; white-space: nowrap;
  transition: background .45s var(--ease), color .45s var(--ease); }
.pill::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.pill.ok { color: var(--ok); background: var(--ok-bg); }
.pill.bad { color: var(--bad); background: var(--bad-bg); }
.pill.warn { color: var(--warn); background: var(--warn-bg); }
.pill.idle { color: var(--muted); background: var(--faint); }
.pill.live { color: #fff; background: var(--accent); }
.pill.run { color: var(--accent); background: rgba(37,99,235,.10); }
.pill.run::before { animation: pulse 1s infinite; }
.chip { display: inline-block; font: 500 11.5px/1 var(--f-mono); padding: 5px 7px; border-radius: 7px; background: rgba(255,255,255,.7); border: 1px solid var(--line); color: var(--muted); }

/* buttons */
.btn { border: 0; cursor: pointer; font-weight: 600; font-size: 14px; padding: 12px 18px; border-radius: 14px; color: #fff; white-space: nowrap;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 86%, #fff), var(--accent));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.45), 0 8px 20px -8px color-mix(in srgb, var(--accent) 70%, transparent);
  transition: transform .15s var(--ease), opacity .2s; }
.btn:hover { transform: translateY(-1px); }
.btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.btn.ghost { color: var(--ink); background: var(--glass-strong); box-shadow: inset 0 1px 0 var(--edge), 0 4px 14px -6px rgba(26,41,63,.2); }
.btn.danger { background: linear-gradient(180deg, #E06A55, var(--bad)); box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 8px 20px -8px rgba(212,81,59,.6); }
.btn.sm { padding: 8px 12px; font-size: 13px; border-radius: 11px; }

@keyframes pulse { 50% { opacity: .3; } }
@keyframes rise-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes flash { 0% { box-shadow: 0 0 0 0 rgba(37,99,235,.35); } 100% { box-shadow: 0 0 0 10px rgba(37,99,235,0); } }
.new { animation: rise-in .45s var(--ease) both; }
.flash { animation: flash .9s var(--ease); }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

/* ===== pitch/core/deck.css (palco do deck) ===== */
/*
  Estrutura do deck. Os tokens, o vidro e as pills vêm de ../rise.css (Pearl Pro, o mesmo
  design system da app). Aqui só ficam a escala de palco (1920×1080, legível a 10 m),
  o HUD e as notas. Partilhado: mudar só depois de combinar.
*/
:root {
  /* Escala de palco: Bringhurst 18·21·24·36·48·72·96 × 4/3 */
  --t1: 24px; --t2: 28px; --t3: 32px; --t4: 48px; --t5: 64px; --t6: 96px; --t7: 128px;
  --pad-x: 120px; --pad-top: 150px; --pad-bottom: 130px;
  --ease-out: cubic-bezier(.16, 1, .3, 1);
}

html, body { height: 100%; overflow: hidden; }
body { font-family: var(--f-ui); }
.slide *, .slide *::before, .slide *::after { margin: 0; padding: 0; box-sizing: border-box; }
button { background: none; border: 0; color: inherit; cursor: pointer; }

#deck {
  position: absolute; left: 0; top: 0; width: 1920px; height: 1080px;
  transform-origin: 0 0; overflow: hidden; background: var(--bg); isolation: isolate;
}
/* Blobs do design system: o vidro precisa de cor por trás */
#deck > .blobs { position: absolute; inset: 0; z-index: -2; pointer-events: none; }
#deck > .blobs i { position: absolute; border-radius: 50%; filter: blur(70px); opacity: .95; }
#deck > .blobs i:nth-child(1) { width: 1000px; height: 1000px; left: -230px; top: -420px; background: var(--blob-ice); }
#deck > .blobs i:nth-child(2) { width: 840px; height: 840px; right: -190px; top: 190px; background: var(--blob-lavender); }
#deck > .blobs i:nth-child(3) { width: 730px; height: 730px; left: 610px; bottom: -460px; background: var(--blob-aqua); }

.slide {
  position: absolute; inset: 0;
  padding: var(--pad-top) var(--pad-x) var(--pad-bottom);
  opacity: 0; visibility: hidden;
  transition: opacity .45s var(--ease), visibility 0s linear .45s;
}
.slide.cur { opacity: 1; visibility: visible; transition: opacity .6s var(--ease) .12s, visibility 0s; }

/* Tipografia de palco */
.display { font-size: var(--t6); line-height: 1.02; font-weight: 600; letter-spacing: -.035em; text-wrap: balance; }
.title { font-size: var(--t5); line-height: 1.06; font-weight: 600; letter-spacing: -.03em; text-wrap: balance; max-width: 24ch; }
.lead { font-size: var(--t3); line-height: 1.4; color: var(--muted); max-width: 42ch; text-wrap: pretty; }
.body { font-size: var(--t2); line-height: 1.42; color: var(--muted); }
.slide .eyebrow { font: 500 20px/1.2 var(--f-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.slide .mono { font-family: var(--f-mono); font-size: inherit; }
.num { font-weight: 700; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }

/* Pills e vidro à escala de palco */
.slide .pill { font-size: 22px; padding: 10px 18px; gap: 10px; }
.slide .pill::before { width: 10px; height: 10px; }
.slide .glass { --radius: 32px; }

/* Etiqueta de proveniência: quem serviu este pedido */
.served { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; font: 500 20px/1.3 var(--f-mono); color: var(--muted); }
.served .rid { color: var(--ink); }

/* Estado vazio: diz o que falta e como se resolve */
.empty { display: grid; place-items: center; text-align: center; height: 100%; padding: 32px; font-size: var(--t1); line-height: 1.45; color: var(--muted); }
.empty strong { display: block; color: var(--ink); font-size: var(--t2); font-weight: 600; margin-bottom: 6px; }

/* Ecrã de browser para a app ao vivo */
.browser { display: flex; flex-direction: column; overflow: hidden; }
.browser .bar { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 20px; height: 60px; padding: 0 22px; border-bottom: 1px solid var(--line); }
.browser .host { font: 500 20px/1 var(--f-mono); color: var(--muted); padding: 8px 16px; border-radius: 999px; background: var(--faint); }
.screen { position: relative; flex: 1; overflow: hidden; border-radius: 0 0 var(--radius) var(--radius); background: rgba(255, 255, 255, .5); }
.screen iframe, .screen video { position: absolute; left: 0; top: 0; border: 0; background: var(--bg); pointer-events: none; }
.screen video { width: 100%; height: 100%; object-fit: contain; }
body.interact .slide.cur .screen iframe { pointer-events: auto; }
body.interact .slide.cur .screen { box-shadow: inset 0 0 0 3px var(--accent); }

/* HUD dentro do palco */
.brand { position: absolute; z-index: 5; left: var(--pad-x); top: 56px; display: flex; align-items: center; gap: 12px; color: var(--ink); }
.brand svg { width: 38px; height: 38px; }
.brand span { font-size: 26px; font-weight: 700; letter-spacing: .14em; }
.progress { position: absolute; z-index: 5; left: var(--pad-x); right: var(--pad-x); bottom: 54px; display: flex; gap: 10px; }
.progress button { position: relative; flex: 1; height: 4px; border-radius: 2px; background: var(--line); transition: background .3s var(--ease); }
.progress button::after { content: ""; position: absolute; inset: -14px 0; }
.progress button.done { background: rgba(18, 31, 53, .3); }
.progress button.on { background: var(--ink); }
.progress button:focus-visible { outline: 3px solid var(--accent); outline-offset: 6px; }

/* Sobreposições fora do palco, ao tamanho do ecrã de quem apresenta */
#notes, #timer, #interact-hint {
  position: fixed; z-index: 50; color: var(--ink); background: var(--glass-strong);
  -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
  box-shadow: 0 0 0 1px var(--line), var(--shadow);
}
#notes { left: 16px; right: 16px; bottom: 16px; max-height: 42vh; overflow: auto; padding: 18px 22px; border-radius: 18px; }
#notes .head { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 14px; color: var(--muted); margin-bottom: 8px; }
#notes .head b { color: var(--ink); font-weight: 600; }
#notes .text { font-size: 18px; line-height: 1.5; white-space: pre-line; max-width: 95ch; }
#timer { top: 16px; right: 16px; padding: 8px 16px; border-radius: 999px; font-size: 18px; font-variant-numeric: tabular-nums; }
#timer.late { color: var(--bad); }
#interact-hint { top: 16px; left: 50%; translate: -50% 0; padding: 8px 18px; border-radius: 999px; font-size: 16px; }
[hidden] { display: none !important; }

/* ?static e movimento reduzido: estado final, sem animação */
html.still *, html.still *::before, html.still *::after { transition: none !important; animation: none !important; }
/* ===== pitch/core/stage.css (motion e humor por ato) ===== */
/*
  Camada de palco v2: motion e "humor" do fundo por ato. Carrega DEPOIS de rise.css e deck.css.
  Partilhado: mudar só depois de combinar.

  Cor: só as cores do design system (rise.css), para o deck e o dashboard parecerem o mesmo produto.
    problem  → fundo com um toque coral (--bad-bg), acento --bad
    solution → ice / lavanda / aqua, acento --accent
    proof    → mint (--ok-bg), acento --ok
  Motion: expo-out para entrar, in-out para mudar de estado. 240 / 600 / 1000 ms. Stagger 70 ms.
  Nada anima o que não aconteceu: contadores, hashes e estados mostram só dados reais.
*/
:root {
  --faint-ink: #5F6B84;   /* texto terciário: só ≥ 20 px */
  --accent-soft: color-mix(in srgb, var(--accent) 50%, #fff);
  --act: var(--accent);
  --e-out: cubic-bezier(.16, 1, .3, 1);
  --e-inout: cubic-bezier(.65, 0, .35, 1);
  --e-spring: cubic-bezier(.34, 1.56, .64, 1);
  --d-1: 240ms; --d-2: 600ms; --d-3: 1000ms;
  --stagger: 70ms;
  --d0: 180ms;
}

/* ── Humor do fundo por ato (transição lenta entre atos; os blobs não andam sozinhos) ── */
@property --b1 { syntax: "<color>"; inherits: true; initial-value: #DCEBFF; }
@property --b2 { syntax: "<color>"; inherits: true; initial-value: #E9E4FF; }
@property --b3 { syntax: "<color>"; inherits: true; initial-value: #C6F0EC; }
#deck { --b1: var(--blob-ice); --b2: var(--blob-lavender); --b3: var(--blob-aqua);
  transition: --b1 1.6s var(--e-inout), --b2 1.6s var(--e-inout), --b3 1.6s var(--e-inout); }
#deck[data-act="problem"]  { --b1: var(--bad-bg);   --b2: var(--blob-lavender); --b3: var(--blob-ice);  --act: var(--bad); }
#deck[data-act="solution"] { --b1: var(--blob-ice); --b2: var(--blob-lavender); --b3: var(--blob-aqua); --act: var(--accent); }
#deck[data-act="proof"]    { --b1: var(--ok-bg);    --b2: var(--blob-ice);      --b3: var(--blob-aqua); --act: var(--ok); }
#deck[data-act="finale"]   { --b1: var(--blob-ice); --b2: var(--blob-lavender); --b3: var(--blob-aqua); --act: var(--accent); }
#deck > .blobs i:nth-child(1) { background: var(--b1); }
#deck > .blobs i:nth-child(2) { background: var(--b2); }
#deck > .blobs i:nth-child(3) { background: var(--b3); }

/* grão subtil por baixo do conteúdo: tira o aspeto liso dos gradientes no projetor */
#deck::after {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: .05; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* a barra de progresso segue o ato */
#deck .progress button { height: 3px; }
#deck .progress button.on { background: var(--act); transition: background .6s var(--e-inout); }
#deck > .brand { transition: opacity .6s var(--e-out), transform .6s var(--e-out); }

/* ── Tipografia de palco ── */
.slide { color: var(--ink); }
.slide .display { font-size: 112px; line-height: .98; letter-spacing: -.045em; font-weight: 600; }
.slide .statement { font-size: var(--t6); line-height: 1.04; font-weight: 600; letter-spacing: -.04em; max-width: 17ch; text-wrap: balance; }
.slide .kicker { font: 600 26px/1.2 var(--f-ui); letter-spacing: -.01em; color: var(--act); }
.slide .sub { font-size: var(--t3); line-height: 1.35; color: var(--muted); max-width: 34ch; text-wrap: pretty; }
.slide .big-num { font-size: 200px; line-height: .86; font-weight: 700; letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
.slide .unit { font-size: var(--t1); line-height: 1.3; color: var(--muted); }

/* ── Sistema de reveal ──
   .rv            entra quando o slide fica visível (.cur)
   .rv[data-s=N]  entra no passo N
   --i            ordem no stagger (FX.index numera os que não têm)
   variantes: .fade .scale .left .right .mask .pop */
.slide .rv {
  opacity: 0; transform: translate3d(0, 28px, 0); filter: blur(6px);
  transition: opacity var(--d-2) var(--e-out), transform var(--d-3) var(--e-out), filter var(--d-2) var(--e-out), clip-path var(--d-3) var(--e-out);
}
.slide .rv.fade { transform: none; }
.slide .rv.scale { transform: scale(.94); }
.slide .rv.pop { transform: scale(.6); filter: none; transition-timing-function: var(--e-out), var(--e-spring), var(--e-out); }
.slide .rv.left { transform: translate3d(-48px, 0, 0); }
.slide .rv.right { transform: translate3d(48px, 0, 0); }
.slide .rv.mask { transform: none; filter: none; clip-path: inset(-80px calc(100% + 80px) -80px -80px); opacity: 1; }
.slide.cur .rv:not([data-s]),
.slide.s1 .rv[data-s="1"], .slide.s2 .rv[data-s="2"], .slide.s3 .rv[data-s="3"], .slide.s4 .rv[data-s="4"] {
  opacity: 1; transform: none; filter: none;
  transition-delay: calc(var(--d0) + var(--i, 0) * var(--stagger));
}
.slide.cur .rv.mask:not([data-s]), .slide.s1 .rv.mask[data-s="1"], .slide.s2 .rv.mask[data-s="2"], .slide.s3 .rv.mask[data-s="3"] { clip-path: inset(-80px); }
.slide .rv[data-s] { --d0: 40ms; }

/* coisas que recuam num passo */
.slide .out { transition: opacity var(--d-2) var(--e-out), transform var(--d-2) var(--e-out), filter var(--d-2) var(--e-out); }
.slide.s1 .out[data-out="1"], .slide.s2 .out[data-out="2"], .slide.s3 .out[data-out="3"] { opacity: .14; filter: blur(3px); transform: scale(.98); }

/* títulos palavra a palavra (FX.split) */
.slide .w { display: inline-block; overflow: hidden; vertical-align: top; padding: 0 .02em .14em; margin: 0 -.02em -.14em; }
.slide .w > span { display: inline-block; transform: translate3d(0, 110%, 0) rotate(4deg); transform-origin: 0 100%; transition: transform var(--d-3) var(--e-out); }
.slide.cur .split:not([data-s]) .w > span,
.slide.s1 .split[data-s="1"] .w > span, .slide.s2 .split[data-s="2"] .w > span, .slide.s3 .split[data-s="3"] .w > span {
  transform: none; transition-delay: calc(var(--d0) + var(--wi, 0) * 55ms);
}
.slide .split[data-s] { --d0: 40ms; }

/* traço SVG que se desenha (FX.draw mede --len) */
.slide .draw { stroke-dasharray: var(--len, 1000); stroke-dashoffset: var(--len, 1000); transition: stroke-dashoffset 1.4s var(--e-inout); }
.slide.cur .draw:not([data-s]), .slide.s1 .draw[data-s="1"], .slide.s2 .draw[data-s="2"], .slide.s3 .draw[data-s="3"] {
  stroke-dashoffset: 0; transition-delay: calc(var(--d0) + var(--i, 0) * 120ms);
}

/* ── Componentes ── */
.slide .tag { display: inline-flex; align-items: center; gap: 10px; font: 500 20px/1 var(--f-mono); padding: 10px 16px; border-radius: 999px; background: rgba(255,255,255,.72); box-shadow: inset 0 0 0 1px var(--line); color: var(--muted); }
.slide .tag b { color: var(--ink); font-weight: 500; }
.slide .dot { width: 12px; height: 12px; border-radius: 50%; background: currentColor; flex: none; }
.slide .ok-c { color: var(--ok); }
.slide .bad-c { color: var(--bad); }
.slide .act-c { color: var(--act); }

/* ── ?static e movimento reduzido: estado final ── */
html.still .slide .rv, html.still .slide .w > span, html.still .slide .draw {
  opacity: 1 !important; transform: none !important; filter: none !important; clip-path: none !important; stroke-dashoffset: 0 !important;
}

/* harness */
#ctl { position: fixed; z-index: 99; right: 12px; bottom: 12px; display: flex; gap: 8px; }
#ctl button { font: 600 13px var(--f-ui); padding: 8px 12px; border-radius: 10px; background: var(--ink); color: #fff; cursor: pointer; }
</style></head>
<body>
<main id="deck"><div class="blobs" aria-hidden="true"><i></i><i></i><i></i></div>
  <div class="brand"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 45c10.5 0 19.2-6.2 27.6-17.9L49 13" stroke-width="6.5"/><path d="M35 13h14v14" stroke-width="6.5"/><path d="M11 31.5c7.1-.2 12.5-2.9 17.4-7.9" stroke-width="5" opacity=".5"/></svg><span>RISE</span></div>
  <nav class="progress"><button></button><button></button><button class="on"></button><button></button><button></button><button></button><button></button><button></button></nav>
</main>
<div id="ctl"><button id="play">Replay</button><button id="next">Next step</button></div>
<script>
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

</script>
<script>
document.documentElement.classList.toggle("still", new URLSearchParams(location.search).has("static") || matchMedia("(prefers-reduced-motion: reduce)").matches);
const MOCK = true; // dados falsos SÓ para pré-visualizar. Nunca copiar para o slide.
const MARK = `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path class="m-rise" d="M11 45c10.5 0 19.2-6.2 27.6-17.9L49 13" stroke-width="6.5"/><path class="m-head" d="M35 13h14v14" stroke-width="6.5"/><path class="m-trail" d="M11 31.5c7.1-.2 12.5-2.9 17.4-7.9" stroke-width="5" opacity=".5"/></svg>`;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const hx = n => Array.from({ length: n }, (_, i) => "0123456789abcdef"[(i * 7 + n) % 16]).join("");
const keys = ["slides/stat-89.svg", "slides/stat-79.svg", "slides/stat-73.svg", "slides/independência.svg", "brand/rise-icon.svg"];
const trace = keys.concat(keys).map((k, i) => ({ ts: `2026-11-20T15:5${i >> 2}:0${i % 4}`, key: k, provider: i < 3 ? "source" : "destination", ok: true, request_id: hx(16) }));
const STATE = { providers: [{ id: "source", name: "AWS S3 (moto)", simulated: true }, { id: "destination", name: "Garage", simulated: true }],
  active: "destination", link_up: false, trace,
  profile: { observed_calls: 12, operations: { PutObject: 4, GetObject: 5, HeadObject: 1, ListObjectsV2: 1, GeneratePresignedUrl: 1 } },
  plan: { source: { mode: "cached" }, tests: [{ title: "Round-trip keeps bytes and content type", kind: "put_get_roundtrip" }, { title: "Metadata survives HEAD", kind: "head_metadata" }, { title: "Prefix listing matches", kind: "list_prefix" }, { title: "Presigned GET works", kind: "presigned_get" }] } };
STATE.results = { source: [], destination: ["put_get_roundtrip","head_metadata","list_prefix","presigned_get"].map(k => ({ kind: k, status: "pass" })) };
STATE.results_before = STATE.results.destination.map((r, i) => i ? r : { ...r, status: "fail", error: { code: "AuthorizationHeaderMalformed", status: 400 } });
STATE.adaptation = { applied: true, before: { region: "us-east-1" }, retest: { passed: 4, total: 4 },
  proposal: { diagnosis: "Requests are signed for region 'us-east-1' but the destination expects 'garage'.", key: "region", value: "garage", source: { mode: "cached" } } };
const PROOF = { switch: { to: "destination" }, pitch_requests: trace,
  integrity: { objects: keys.concat(["docs/a.txt", "docs/b.txt"]).map(k => ({ key: k, sha256_source: hx(64), sha256_destination: hx(64), match: true })) },
  new_operation_after_switch: { key: "proof/live-3f9a1c2b7d10.txt", provider: "destination", match: true, sha256_read: hx(64), get_request_id: "17F2A9C0D1E2B3A4" },
  source_disconnection: { at: "2026-11-20T15:52:41", app_probe: { ok: false, result: "EndpointConnectionError: Could not connect to the endpoint URL" }, tcp_probe: { result: "connection refused" } } };
const CARD = n => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#F7F8FA"/><rect x="48" y="48" width="1104" height="579" rx="36" fill="#fff"/><text x="96" y="360" font-family="Geist,sans-serif" font-size="230" font-weight="700" letter-spacing="-9" fill="#121F35">${n}</text></svg>`);
const api = {
  still: false, esc, MARK, wait: ms => new Promise(r => setTimeout(r, ms)),
  config: { stats: keys.slice(0, 3), revealAsset: keys[3], dashboardPath: "/demo", demoVideo: "" },
  live: {
    online: MOCK,
    asset: async k => MOCK ? { ok: true, key: k, url: CARD(k.match(/\d+/)?.[0] + "%" || "RISE"), provider: "destination", requestId: hx(16) } : { ok: false, offline: true, key: k },
    providers: async () => MOCK ? { source: STATE.providers[0], destination: STATE.providers[1] } : {},
    state: async () => { if (!MOCK) throw new Error("offline"); return STATE; },
    proof: async () => { if (!MOCK) throw new Error("offline"); return PROOF; },
    onChange: () => () => {},
  },
  served: (r, p = {}) => !r ? "" : r.offline ? `<span class="pill idle">Local preview</span><span>not served through RISE</span>`
    : `<span class="pill ${r.provider === "destination" ? "live" : "idle"}">${esc(r.provider)}</span><span>${esc(p[r.provider]?.name || r.provider)}${p[r.provider]?.simulated ? " (simulated)" : ""}</span><span class="rid">req ${esc(r.requestId.slice(0, 16))}</span>`,
  frame: box => { box.innerHTML = `<div class="empty"><div><strong>Dashboard da app</strong>Aqui aparece a app real (iframe).</div></div>`; return null; },
};
let def; const RISE = { slide: d => def = Object.assign({ steps: 0 }, d), api };
</script>

<script>
/* ======== COLAR AQUI o ficheiro do slide (RISE.slide({...})) ======== */
</script>

<script>
const deck = document.getElementById("deck");
const el = document.createElement("section");
el.className = "slide"; el.dataset.slide = def.id; el.innerHTML = def.html || "";
deck.insertBefore(el, deck.querySelector(".brand"));
const st = document.createElement("style");
st.textContent = `.slide[data-slide="${def.id}"] {\n${def.css || ""}\n}\n${def.globalCss || ""}`;
document.head.append(st);
def.init?.(el, api);
let step = 0;
function enter() {
  def.leave?.(el, api); el.classList.remove("cur"); for (let k = 1; k <= def.steps; k++) el.classList.remove("s" + k);
  step = 0; void el.offsetWidth; el.classList.add("cur"); def.enter?.(el, api);
}
document.getElementById("play").onclick = enter;
document.getElementById("next").onclick = () => { if (step < def.steps) { step++; el.classList.add("s" + step); def.step?.(el, step, api); } };
function fit() { const k = Math.min(innerWidth / 1920, innerHeight / 1080); deck.style.transform = `translate(${(innerWidth - 1920 * k) / 2}px, ${(innerHeight - 1080 * k) / 2}px) scale(${k})`; }
addEventListener("resize", fit); fit(); enter();
</script>
</body></html>
```
