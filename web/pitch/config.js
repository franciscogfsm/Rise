/*
  Ligação do pitch ao RISE. Servido pelo próprio RISE (/static/pitch/Rise_Pitch.html) não é
  preciso mudar nada: usa a mesma origem. Aberto com duplo clique (file://) fica em modo
  "pré-visualização local": mostra a estrutura, mas nunca finge dados ou pedidos reais.
*/
window.RISE_CONFIG = {
  // Origem da API. Vazio = a mesma origem da página.
  apiBase: "",
  // Página da app mostrada no slide de demo.
  dashboardPath: "/demo",
  // Assets do pitch servidos pelo routing do RISE (criados em rise/seed.py).
  stats: ["slides/stat-89.svg", "slides/stat-79.svg", "slides/stat-73.svg"],
  revealAsset: "slides/independência.svg",
  // Vídeo de backup da demo, por exemplo "media/demo.mp4" (tecla V). Aparece sempre marcado como gravação.
  demoVideo: "",
};
