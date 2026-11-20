# Pitch RISE

Pitch em HTML com limite de 5 minutos. O vídeo começa às 3:30 e é o penúltimo slide. O fecho começa às 4:36, com 15 segundos de guião e 9 segundos de margem. Segue o design system Pearl Pro ([DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md)) e as regras do [CLAUDE.md](../../CLAUDE.md).

## Abrir

- **Ao vivo:** com o RISE a correr (`scripts/run.sh`), abrir `http://<host>:<porta>/static/pitch/Rise_Pitch.html`. Os slides pedem imagens novas ao routing do RISE (`/app/assets/...`) e mostram quem as serviu.
- **Ensaio:** abrir `Rise_Pitch.html` com duplo clique. Fica em pré-visualização local: vê-se a estrutura, mas nenhum pedido ou provider é inventado.
- **Capturas e PDF:** acrescentar `?static` ao URL para ver tudo no estado final.

Teclas:

- **Navegação:** `→` / espaço avança, `←` recua.
- **Ecrã e apoio:** `F` põe em ecrã inteiro, `N` mostra as notas do orador com o tempo-alvo, `T` liga o cronómetro.
- **Slide da demo:** `I` deixa clicar no dashboard (para sair, clicar fora do ecrã) e `V` mostra o vídeo de backup.

## Quem edita o quê

| Parte | Slides | Ficheiros |
|---|---|---|
| A | Capa, problema, lacuna, mercado, funcionamento, evidência, RISE Fast, modelo | `slides/a*.js` |
| B | Produto, impacto, vídeo, fecho | `slides/b*.js` |
| Partilhado | Motor, palco, motion, ligação à API | `core/`, `config.js`, `Rise_Pitch.html` |

Regras para trabalharem os dois ao mesmo tempo sem conflitos:

1. Cada pessoa só edita os ficheiros da sua parte. Cada slide é um ficheiro com o HTML, o CSS e o comportamento.
2. Os ficheiros em `core/` e o `config.js` são partilhados: combinem antes de os mudar e façam commits pequenos.
3. Para acrescentar um slide, criem o ficheiro e registem-no no ponto correspondente em `Rise_Pitch.html`. Reservem as duas últimas posições para o vídeo e o fecho.
4. Façam `git pull --rebase` antes de cada push. Como os ficheiros são separados, o merge é automático.
5. O CSS de cada slide fica limitado a esse slide automaticamente, por isso não colide com o do outro.

## Escrever um slide

```js
RISE.slide({
  id: "proof",                 // usado no URL: #proof
  title: "Proof",              // aparece nas notas e na barra de progresso
  time: "3:00 – 3:40",         // tempo-alvo (o cronómetro fica coral se passar)
  steps: 1,                    // passos dentro do slide → classes .s1, .s2 no <section>
  notes: `Guião falado…`,
  html: `<h2 class="title">…</h2>`,
  css: `.title { … } &.s1 .x { … }`,   // CSS nesting, limitado a este slide
  init(el, api) {},            // uma vez
  async enter(el, api) {},     // sempre que aparece: é aqui que se pedem dados frescos
  leave(el, api) {},
});
```

O `api` inclui:

- `api.live.asset(key)`: pedido novo a um asset através do RISE.
- `api.live.state()` e `api.live.proof()`: o estado e o Freedom Proof do backend.
- `api.live.onChange(cb)`: avisa a cada mudança de estado, por SSE.
- `api.served(res, providers)`: devolve a etiqueta de proveniência de um pedido.
- `api.frame(box, url)`: mostra uma página real dentro de uma moldura.
- `api.esc(texto)`, para escapar HTML, e `api.still`, que indica se a animação está desligada.

Só o `core/live.js` conhece os endpoints. Se a API mudar, muda-se esse ficheiro e os slides ficam iguais.

Para subscrever mudanças em tempo real, faz-se `this._off = api.live.onChange(...)` no `enter` e `this._off?.()` no `leave`. Subscrever no `init` deixa ligações abertas: o browser só permite 6 por servidor e o dashboard e as imagens ficam bloqueados.

### Motion (`core/stage.css` + `core/fx.js`)

- **Entradas:** a classe `.rv` faz o elemento entrar quando o slide aparece; com `data-s="N"`, entra no passo N. As variantes são `.fade`, `.scale`, `.left`, `.right`, `.mask` e `.pop`, e `--i` define a ordem.
- **Títulos:** `.split` faz o título entrar palavra a palavra.
- **Traços SVG:** `.draw` desenha o traço.
- **Preparação:** chamar `FX.prep(el)` no `init`.
- **Fundo:** `FX.act("problem" | "solution" | "proof" | "finale")` muda o fundo e a cor de acento do ato.
- **Valores técnicos:** `FX.type(el, texto)` escreve um valor real da esquerda para a direita. Não há contadores a subir nem caracteres aleatórios: isso seria animar o que não aconteceu.
- **Estilo:** sem itálico serifado nem palavras coloridas nos títulos, sem etiquetas em maiúsculas, e só as cores do `rise.css`.

## Regras de conteúdo

- Os jurados só assistem: nada de QR, de telemóveis ou de uploads.
- Tudo o que parece um dado do sistema vem do backend. Sem backend, o slide mostra um estado vazio ou a etiqueta `Example` / `Local preview`, nunca números inventados.
- Os providers locais aparecem como `simulated`. O destino da demo nunca se apresenta como Leaseweb.
- A revelação final ("RISE powered what you just watched") só aparece se o Freedom Proof tiver pedidos deste pitch servidos pelo destino. Caso contrário, o slide mostra o fecho normal.
- As estatísticas do inquérito são sempre apresentadas como respostas a um inquérito, com a fonte.
