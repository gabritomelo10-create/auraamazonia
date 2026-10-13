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

## Jornada de abertura (vinheta 3D controlada pelo scroll)

`assets/js/journey.js` transforma a vinheta do Tour em uma sequência de quadros controlada pela rolagem: rolar para baixo avança o voo pelo rio até Maués, a explosão de ingredientes e o logo; rolar para cima volta. Os textos e o botão de vaga aparecem por cima, em momentos definidos.

- Quadros em `assets/seq/d/` (computador, 192 quadros 1600×900) e `assets/seq/m/` (celular, 96 quadros 1024×576), em WebP. Eles carregam aos poucos: primeiro um a cada 8 quadros, depois o resto.
- O ritmo (quanto de rolagem cada trecho do vídeo ganha) fica em `MAP`, no topo de `journey.js`. Os textos ficam no `index.html` (blocos `data-jstep`, com `data-in`/`data-out`).
- Em tela vertical, a partir dos ingredientes a imagem encolhe para o logo caber inteiro.
- Para trocar a vinheta: exporte os quadros com o ffmpeg nos mesmos tamanhos e nomes (`f000.webp`, `f001.webp`...) e ajuste `COUNT` e `MAP` se a duração mudar:
  `ffmpeg -i vinheta.mp4 -vf scale=1600:900 -c:v libwebp -quality 72 -start_number 0 assets/seq/d/f%03d.webp`
- Com "reduzir movimento" ativado no sistema, a jornada é ocultada e a página abre no hero com vídeo.

## Recursos da página

- Barra de urgência fixa com contagem regressiva, contagem grande no hero, na faixa de vídeo e no fechamento
- Medidor de vagas, faixa "Por que decidir esta semana" e passo a passo da reserva
- Vídeo em loop no hero e numa faixa com parallax no meio da página
- Efeitos de scroll: revelação de elementos, imagens que se abrem, parallax, galeria horizontal fixada (desktop) e com swipe (celular), linha do tempo que se preenche, números animados, faixa de ingredientes que acelera com o scroll e barra de progresso de leitura
- Botão de WhatsApp flutuante com balão de mensagem, barra fixa de CTA no celular e pop-up de intenção de saída (só desktop, uma vez por sessão)
- Respeita `prefers-reduced-motion` e o modo de economia de dados (não carrega o segundo vídeo)
