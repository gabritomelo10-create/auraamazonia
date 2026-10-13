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

## Jornada de abertura (vinheta que acompanha a rolagem)

`assets/js/journey.js` faz a vinheta do Tour acompanhar a rolagem: cada movimento move o vídeo na hora. Para frente, o próprio vídeo toca em Full HD, mais rápido quando a rolagem é rápida (até 4×) e desacelerando até parar quando a rolagem para. Para trás, quadros leves voltam suavemente.

- Vídeos: `assets/video/vinheta-1080.*` (computador) e `vinheta-720.*` (celular), em WebM (VP9) e MP4 (H.264). O navegador escolhe o formato que suporta.
- Quadros leves para a volta: `assets/seq/m/` (96 quadros WebP). Pôsteres: `assets/seq/poster*.jpg`.
- O ritmo (quanto de rolagem cada trecho ganha) fica em `MAP`, no topo de `journey.js`. Os textos ficam no `index.html` (blocos `data-jstep`, com `data-fin`/`data-fout` indicando os quadros em que aparecem).
- O indicador lateral mostra em que parte da viagem a pessoa está; clicar nele leva àquela parte.
- Com "reduzir movimento" ativado no sistema, a jornada é ocultada e a página abre no hero com vídeo.

Para trocar a vinheta, gere os arquivos com os mesmos nomes:
```
ffmpeg -i vinheta.mp4 -an -c:v libx264 -crf 20 -g 12 -movflags +faststart assets/video/vinheta-1080.mp4
ffmpeg -i vinheta.mp4 -an -c:v libvpx-vp9 -b:v 0 -crf 33 -g 12 assets/video/vinheta-1080.webm
ffmpeg -i vinheta.mp4 -an -vf scale=1280:720 -c:v libx264 -crf 22 -g 12 -movflags +faststart assets/video/vinheta-720.mp4
ffmpeg -i vinheta.mp4 -an -vf scale=1280:720 -c:v libvpx-vp9 -b:v 0 -crf 35 -g 12 assets/video/vinheta-720.webm
ffmpeg -i vinheta.mp4 -vf "select='not(mod(n\,2))',scale=1024:576" -fps_mode vfr -c:v libwebp -quality 66 -start_number 0 assets/seq/m/f%03d.webp
```

## Recursos da página

- Barra de urgência fixa com contagem regressiva, contagem grande no hero, na faixa de vídeo e no fechamento
- Medidor de vagas, faixa "Por que decidir esta semana" e passo a passo da reserva
- Vídeo em loop no hero e numa faixa com parallax no meio da página
- Efeitos de scroll: revelação de elementos, imagens que se abrem, parallax, galeria horizontal fixada (desktop) e com swipe (celular), linha do tempo que se preenche, números animados, faixa de ingredientes que acelera com o scroll e barra de progresso de leitura
- Botão de WhatsApp flutuante com balão de mensagem, barra fixa de CTA no celular e pop-up de intenção de saída (só desktop, uma vez por sessão)
- Respeita `prefers-reduced-motion` e o modo de economia de dados (não carrega o segundo vídeo)
