#!/usr/bin/env bash
# Render the garage's studio photographs (and, with --films, the turntable films) for the detailed cars.
#   tools/blender-studio/render_all.sh <outDir> [--photos] [--cars id,id…] [--films id,id…]
# Each car: its .blend in "Desktop/Новая папка/blender-cars", the site's paint colour, the driver's eye for the cabin
# shot (Blender coordinates), the cabin camera (centre: behind the seats; driver: over the wheel — the Bugatti's dark
# cabin and centre spine read better from the driver's seat) and the extra cabin exposure (white Ferrari leather needs little).
set -u
out="$1"; shift
blender="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
cars="C:/Users/Admin/Desktop/Новая папка/blender-cars"
here="$(cd "$(dirname "$0")" && pwd)"
declare -A file=([tourbillon]=bugatti [gt3]=porsche [458]=ferrari [revuelto]=revuelto [750s]=mclaren [valhalla]=valhalla [amg]=amg [jesko]=jesko)
declare -A eye=([tourbillon]=0.03,0.36,0.98 [gt3]=0.10,-0.34,1.02 [458]=0.02,-0.35,1.04 [revuelto]=0.16,-0.364,0.90 [750s]=-0.02,-0.32,0.95 [valhalla]=0.08,-0.33,0.97 [amg]=0.08,-0.37,1.13 [jesko]=0.12,-0.31,0.98)
declare -A cabin=([tourbillon]=2.0 [gt3]=0.15 [458]=0.3 [revuelto]=1.4 [750s]=1.4 [valhalla]=1.4 [amg]=1.0 [jesko]=1.4)
declare -A view=([tourbillon]=driver [gt3]=centre [458]=centre [revuelto]=centre [750s]=centre [valhalla]=driver [amg]=centre [jesko]=driver)
paint() { case "$1" in gt3) echo '--paint' '2025Paint_=#c0c3c1';; 458) echo '--paint' '^carpaint$=#a2b368';; revuelto) echo '--paint' '^M_CarPaint$=#ff5700' '--paint' '^car_paint_v3_03$=#ff5700';; 750s) echo '--paint' '^m_0_1413$=#ff8000';; valhalla) echo '--paint' '^AMAT_Aston_Martin_Valhalla_032$=#4e7064';; amg) echo '--paint' '^body$=#16181b';; jesko) echo '--paint' '^Jesko.paint$=#f65c00';; esac; }
photos=0; films=""; shots=front,side,rear,interior; list="tourbillon gt3 458 revuelto 750s valhalla amg jesko"
while [ $# -gt 0 ]; do case "$1" in --photos) photos=1;; --shots) shots="$2"; shift;; --cars) list="${2//,/ }"; shift;; --films) films="$2"; shift;; esac; shift; done
mkdir -p "$out"
if [ $photos = 1 ]; then for id in $list; do
  s=$(date +%s); read -ra p <<< "$(paint $id)"
  "$blender" --background "$cars/${file[$id]}.blend" --python "$here/render_studio.py" -- --out "$out" --name $id --shots "$shots" --eye="${eye[$id]}" --cabin "${cabin[$id]}" --cabin-view "${view[$id]}" "${p[@]}" 2>&1 | grep -E "Traceback|Error:|STUDIO done"
  echo "$id photos $(( $(date +%s) - s ))s"
done; fi
for id in ${films//,/ }; do
  s=$(date +%s); read -ra p <<< "$(paint $id)"
  "$blender" --background "$cars/${file[$id]}.blend" --python "$here/render_studio.py" -- --out "$out" --name $id --film --frames 240 "${p[@]}" 2>&1 | grep -E "Traceback|Error:|STUDIO done"
  node "$here/encode_film.mjs" "$out/$id" "$out/$id.webm" 30 2>&1 | tail -1
  echo "$id film $(( $(date +%s) - s ))s"
done
