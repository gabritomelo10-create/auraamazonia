#!/usr/bin/env bash
# Gera os loops de vídeo de fundo a partir das fotos (efeito Ken Burns + crossfade).
# Para usar filmagens reais, basta substituir assets/video/*.mp4 mantendo os nomes.
set -euo pipefail
cd "$(dirname "$0")/.."

make_loop() {
  local out="$1"; shift
  local seg=5 fade=1 n=$#
  local inputs=() filters="" i=0 prev="" offset=0
  for img in "$@"; do
    inputs+=(-i "assets/img/$img")
    # alterna zoom-in / zoom-out e direção de pan para dar ritmo
    if (( i % 2 == 0 )); then z="1+0.0012*on"; else z="1.18-0.0012*on"; fi
    filters+="[$i:v]scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440,"
    filters+="zoompan=z='$z':d=$((seg*30)):x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=30,setsar=1,format=yuv420p[v$i];"
    i=$((i+1))
  done
  prev="v0"
  for ((k=1; k<n; k++)); do
    offset=$(( k*(seg-fade) ))
    filters+="[$prev][v$k]xfade=transition=fade:duration=$fade:offset=$offset[x$k];"
    prev="x$k"
  done
  local total=$(( n*seg - (n-1)*fade ))
  filters+="[$prev]fade=t=in:st=0:d=0.8,fade=t=out:st=$(echo "$total-0.8" | bc):d=0.8[out]"
  ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$filters" -map "[out]" \
    -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -movflags +faststart -an "assets/video/$out.mp4"
  ffmpeg -y -loglevel error -ss 1.2 -i "assets/video/$out.mp4" -frames:v 1 -q:v 4 "assets/video/$out-poster.jpg"
}

mkdir -p assets/video
make_loop hero  hero-maues.jpg guarana-pe.jpg peixe-tucupi.jpg festa-frutos.jpg barco-tucupi.jpg
make_loop sabor aula-tony.jpg produtor.jpg jantares.jpg acai.jpg
ls -lh assets/video
