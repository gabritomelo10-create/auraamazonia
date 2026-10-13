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

Os loops em `assets/video/` foram gerados a partir das fotos (zoom lento + transições) por `scripts/make-videos.sh`. Se tiverem filmagens reais (rio, Festa, cozinha), é só substituir `hero.mp4` e `sabor.mp4` (de preferência 1280×720, sem áudio, até uns 3 MB) e os pôsteres `*-poster.jpg`.

## Animações 3D

`assets/js/scene3d.js` (Three.js, em `assets/vendor/`, sem dependência de CDN) cria:

- **A jornada de abertura**, controlada pelo scroll: vista da janela do avião chegando em Manaus, a câmera atravessa a janela, sobrevoa o Teatro Amazonas e desce até o rio para uma viagem de lancha ao pôr do sol, enquanto os textos do Tour passam pela tela. O mouse move o olhar da câmera.
- **Guaranás 3D** nas bordas da página: o "olho" de cada guaraná segue o cursor, eles desviam quando o mouse chega perto, giram com a velocidade do scroll e entram "pulando" quando aparecem.

Os textos da jornada ficam no `index.html` (blocos `data-jstep`, com `data-in`/`data-out` indicando em que ponto do scroll aparecem e somem). Sem WebGL ou com movimento reduzido ativado no sistema, a jornada é ocultada e a página abre direto no hero com vídeo.

Por usar módulos JavaScript, para testar localmente é preciso um servidor (`python3 -m http.server`); abrir o arquivo com duplo clique não carrega o 3D.

## Recursos da página

- Barra de urgência fixa com contagem regressiva, contagem grande no hero, na faixa de vídeo e no fechamento
- Medidor de vagas, faixa "Por que decidir esta semana" e passo a passo da reserva
- Vídeo em loop no hero e numa faixa com parallax no meio da página
- Efeitos de scroll: revelação de elementos, imagens que se abrem, parallax, galeria horizontal fixada (desktop) e com swipe (celular), linha do tempo que se preenche, números animados, faixa de ingredientes que acelera com o scroll e barra de progresso de leitura
- Botão de WhatsApp flutuante com balão de mensagem, barra fixa de CTA no celular e pop-up de intenção de saída (só desktop, uma vez por sessão)
- Respeita `prefers-reduced-motion` e o modo de economia de dados (não carrega o segundo vídeo)
