# Tour Gastronômico de Maués · Página de vendas

Landing page estática (HTML + CSS + JS puro, sem build) da experiência Aura Amazônia de 25 a 30 de novembro de 2026.

## Publicar

Suba a pasta inteira em qualquer hospedagem estática: GitHub Pages, Netlify, Vercel, Hostinger etc. O arquivo de entrada é o `index.html`.

Para testar localmente: `python3 -m http.server` e abra `http://localhost:8000`.

## O que ajustar (tudo no topo de `assets/js/main.js`)

```js
const CONFIG = {
  whatsapp: '555191911504',                 // número que recebe os contatos
  deadline: '2026-10-20T23:59:59-04:00',    // fim das inscrições (horário de Manaus)
  vagasTotal: 22,
  vagasRestantes: 22,                       // atualize conforme vender
  leadEndpoint: '',                         // opcional: URL que recebe os leads em JSON
};
```

- **Vagas restantes**: com valor menor que 22, aparece "Restam X de 22 vagas" com a barra de ocupação. Com 0, aparece "Vagas esgotadas".
- **Prazo**: alimenta a contagem regressiva, a barra do topo, a barra fixa no celular e todos os textos "até 20 de outubro". Depois do prazo, a contagem vira "Inscrições encerradas".
- **Leads**: o formulário abre o WhatsApp com nome, WhatsApp, e-mail e número de pessoas já preenchidos. Se `leadEndpoint` estiver preenchido, os mesmos dados (mais UTMs) são enviados por POST, para uma planilha do Google via Apps Script, Zapier, Make ou CRM.
- **Pixel/Analytics**: cole os scripts no `<head>` do `index.html`. O formulário já dispara `fbq('track','Lead')`, `gtag('event','generate_lead')` e um evento `lead` no `dataLayer`; os cliques no WhatsApp disparam `Contact`.

## Vídeos

`assets/video/floresta.mp4` é um corte de filmagens reais da Aura (rio e floresta). Para trocar por filmagens de Maués, substitua o arquivo e o pôster `floresta-poster.jpg` (de preferência 1280×720, sem áudio, até uns 3 MB).

## Jornada de abertura (fotos reais em camadas)

`assets/js/journey.js` monta a abertura controlada pelo scroll com fotos reais do acervo da Aura Amazônia (`assets/img/aura/`): vista pela janela do avião com névoa passando, a câmera atravessa a janela e desce sobre o rio, segue a lancha, chega à praia do rio e termina à mesa com as cozinheiras e o chamado para a vaga.

- Cada foto tem um mapa de profundidade (`*-depth.png`): perto e longe se deslocam em velocidades diferentes com o scroll, o mouse ou o giroscópio do celular (efeito "foto 3D"). Sem WebGL, as mesmas fotos aparecem em camadas CSS.
- Os textos ficam no `index.html` (blocos `data-jstep`, com `data-in`/`data-out` marcando em que ponto do scroll aparecem). As cenas, o zoom e o foco de cada foto ficam no topo de `journey.js` (`SCENES`).
- Os guaranás flutuantes são recortes da foto `guarana-pe.jpg`.
- O vídeo `assets/video/floresta.mp4` é um corte do vídeo do site da Aura (floresta e rio).
- Com "reduzir movimento" ativado no sistema, a jornada é ocultada e a página abre no hero com vídeo.

As fotos do acervo são de experiências da Aura na RDS do Uatumã; a página traz o crédito "Fotos: acervo Aura Amazônia" e não as apresenta como sendo de Maués. Quando houver fotos e vídeos de Maués e da Festa do Guaraná, basta trocar os arquivos mantendo os nomes (e ajustar os mapas de profundidade, se o enquadramento mudar muito).

## Recursos da página

- Barra de urgência fixa com contagem regressiva, contagem grande no hero, na faixa de vídeo e no fechamento
- Medidor de vagas, faixa "Por que decidir esta semana" e passo a passo da reserva
- Vídeo em loop no hero e numa faixa com parallax no meio da página
- Efeitos de scroll: revelação de elementos, imagens que se abrem, parallax, galeria horizontal fixada (desktop) e com swipe (celular), linha do tempo que se preenche, números animados, faixa de ingredientes que acelera com o scroll e barra de progresso de leitura
- Botão de WhatsApp flutuante com balão de mensagem, barra fixa de CTA no celular e pop-up de intenção de saída (só desktop, uma vez por sessão)
- Respeita `prefers-reduced-motion` e o modo de economia de dados (não carrega o segundo vídeo)
