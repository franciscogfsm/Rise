# RISE Design System — Option E · Pearl Pro

Escolhido pela equipa a 20 nov 2026. Referência visual viva: [design/design-system-options.html](design/design-system-options.html) (separador **E · Pearl Pro ★**) · https://claude.ai/artifact/HMFSAPgXtzmU2FNoqgU8BV

**Direção:** Light Liquid Glass / Pearl White Futurism. É o vidro pérola da opção A, com a aresta refratada da B em versão subtil e o contraste da D, para ser legível a 10 m num projetor.
**Regra de ouro:** a legibilidade vence o efeito. Se o vidro tirar contraste ao texto, aumenta-se a opacidade do vidro e nunca se aclara o texto.

## Tokens

```css
:root {
  /* surfaces */
  --bg: #F7F8FA;            /* pearl */
  --white: #FFFFFF;
  --blob-ice: #DCEBFF;      /* background blobs behind glass */
  --blob-lavender: #E9E4FF;
  --blob-aqua: #C6F0EC;
  --glass: rgba(255,255,255,.66);
  --glass-strong: rgba(255,255,255,.88);   /* active nav, ghost buttons */
  --edge: #FFFFFF;

  /* text */
  --ink: #121F35;           /* primary text — never lighter on glass */
  --muted: #42506A;         /* secondary text (AA on glass) */

  /* accent + semantic (semantic ≠ accent) */
  --accent: #2563EB;
  --ok: #0A8A74;   --ok-bg: #D2F4EC;    /* mint: pass / verified */
  --bad: #D4513B;  --bad-bg: #FCE0D9;   /* coral: fail / disconnected */
  --warn: #C98510;                      /* amber: unsupported / untested */

  /* shape + depth */
  --radius: 22px;           /* panels; pills 999px; buttons 14px; inner rows 12px */
  --blur: 30px;
  --sat: 1.7;
  --shadow: 0 1px 1px rgba(26,41,63,.05), 0 14px 34px -10px rgba(26,41,63,.20);

  /* type */
  --f-ui: "Geist", "Segoe UI", system-ui, sans-serif;
  --f-mono: "Geist Mono", ui-monospace, "Cascadia Mono", monospace;
}
```
Google Fonts: `Geist:wght@300..700` + `Geist Mono:wght@400;500`.

## Glass recipe (material, not a translucent rectangle)
```css
.glass {
  position: relative;
  background: var(--glass);
  backdrop-filter: blur(var(--blur)) saturate(var(--sat));
  -webkit-backdrop-filter: blur(var(--blur)) saturate(var(--sat));
  border-radius: var(--radius);
  box-shadow: inset 0 1px 0 var(--edge), inset 0 0 0 1px rgba(255,255,255,.45),
              inset 0 -1px 0 rgba(26,41,63,.05), var(--shadow);
}
/* specular sheen on top edge */
.glass::before { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,0) 38%),
              radial-gradient(120% 60% at 0% 0%, rgba(255,255,255,.5), transparent 60%);
  mix-blend-mode: soft-light; }
/* subtle refracted edge (ice → lavender) */
.glass::after { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; padding:1px;
  background: linear-gradient(135deg, #fff, rgba(220,235,255,.7) 45%, rgba(233,228,255,.7) 75%, #fff);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; }
```
O vidro só funciona se houver cor por trás: o fundo da página usa 2 ou 3 blobs grandes desfocados (`filter: blur(60px)`) em ice, lavanda e aqua.

## Typography
- UI e display: **Geist**. Títulos com peso 600, `letter-spacing: -0.025em` e `text-wrap: balance`.
- Números grandes (stats e métricas): Geist 700, `letter-spacing: -0.04em` e `font-variant-numeric: tabular-nums`.
- Dados técnicos (hashes, request IDs, regiões, nomes de operação): **Geist Mono** a 12–13 px.
- Eyebrows: mono, 11 px, maiúsculas, `letter-spacing: .08em`, cor `--muted`.
- Corpo de texto com no máximo cerca de 65 caracteres por linha.

## State language (as cores contam a história)
| Estado | Visual |
|---|---|
| Pass / Verified | mint: `--ok` em `--ok-bg`, ícone ✓ |
| Fail / Disconnected | coral: `--bad` em `--bad-bg`, ícone !, linha com fundo coral a 55% |
| Unsupported / Untested | amber `--warn`, borda tracejada |
| Live / Serving | pill sólida `--accent` com texto branco |
| Idle / Standby | `--muted` em rgba(26,41,63,.07) |
| Source cortada | cartão com `opacity .45` + `grayscale(1)` |

Pills: `border-radius: 999px`, ponto de 7 px em `currentColor` e texto a 12 px com peso 600.

## Components
- **Sidebar** em vidro com logo, navegação pelos passos (Discover · Challenge · Switch · Freedom Proof) e item ativo em `--glass-strong`.
- **Provider cards** (Source → Destination), ligados por uma linha em gradiente de accent para ok. Cada cartão mostra: label, nome, meta em mono (tipo, região, `simulated` se aplicável) e pill de estado.
- **Journey chips:** CONNECT → … → PROVE. Os feitos ficam mint, o atual fica accent sólido e os seguintes ficam neutros.
- **Lista de testes:** ícone, descrição + detalhe em mono, e resultado (PASS / FAIL / UNSUPPORTED / UNTESTED). A sugestão da IA aparece em mono na cor accent.
- **Stat card:** número grande, uma frase e a fonte em mono pequeno (obrigatório nas estatísticas do inquérito).
- **Freedom Proof:** lista chave-valor em mono (object, sha256, served by, request id, timestamp).
- **Botões:** o primário tem gradiente de accent, highlight inset e sombra colorida. O ghost usa `--glass-strong`.

## Motion
- Transições de estado entre 300 e 500 ms, com ease-out. A cor e a opacidade mudam com os **eventos reais do backend** e nunca com timers falsos.
- A falha entra em coral, a correção passa a mint e o grafo de providers reorganiza-se no switch.
- O Freedom Proof aparece dentro da mesma UI e não abre uma página nova.
- Nada de loaders artificiais. Respeitar `prefers-reduced-motion`.

## Logo
- Ficheiros oficiais: `rise-icon.svg` (ícone, `currentColor`) e `rise-logo.svg` (ícone + wordmark, `#222B42`).
- O ícone funciona a 16 px e em negativo. Não se aplica vidro ao ícone; o vidro é só para a interface.
- ⚠️ O wordmark do `rise-logo.svg` usa `<text>` com a fonte Inter. Converter para paths antes do pitch, ou escrever o wordmark em HTML com Geist e `letter-spacing: .14em`.

## Don'ts
Neon, temas escuros "hacker", gradientes excessivos, texto cinzento-claro em vidro quase transparente, emoji como marcadores, cartões todos iguais sem hierarquia, animações longas, e animar o que não aconteceu.
