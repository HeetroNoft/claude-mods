#!/usr/bin/env bash
# Office page test runner: builds a throwaway copy of the page with fake data, opens it in a headless
# browser and prints what matters (JS errors, layout checks, activity states); screenshots go to $OUT.
#
#   tools/office/run.sh check              every theme: layout checks + break activities + a screenshot
#   tools/office/run.sh shot <theme> [h]   one screenshot (h = hour of day, 0-24; default 12)
#   tools/office/run.sh scenario <theme> <a|b|t>
#   tools/office/run.sh gallery [held|looks|motion|bubbles]   every mascot pose in a grid, the props in hand, the accessories, film strips of the springs, or the speech bubbles
#   tools/office/run.sh preview [off]      copy the page to ~/.claude/office and keep it there: sessions starting no longer replace it
# Env: N (desks, default 6), OUT (default: $TMPDIR/office-shots), BROWSER (path to Edge or Chrome).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; WEB="$HERE/../../plugins/office/web"
OUT="${OUT:-${TMPDIR:-/tmp}/office-shots}"; mkdir -p "$OUT"
BROWSER="${BROWSER:-}"
for b in "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" "/c/Program Files/Google/Chrome/Application/chrome.exe" "$(command -v chromium || true)" "$(command -v google-chrome || true)"; do
  [ -z "$BROWSER" ] && [ -n "$b" ] && [ -x "$b" ] && BROWSER="$b"; done
[ -z "$BROWSER" ] && { echo "no browser found: set BROWSER"; exit 1; }
SITE="$(mktemp -d)"; trap 'rm -rf "$SITE"' EXIT
build(){ # $1: extra scripts after main.js (space separated), or "gallery"
  rm -rf "$SITE"/*; cp -r "$WEB"/. "$SITE"/; N="${N:-6}" node "$HERE/mkdata.js" > "$SITE/data.js"
  cp "$HERE"/check.js "$HERE"/scenario.js "$HERE"/gallery.js "$HERE"/floors.js "$SITE/js/"
  local tags=""; for s in $1; do tags="$tags<script src=\"js/$s\"></script>"; done
  if [ "$1" = gallery.js ]; then sed -i "s#<script src=\"js/core/main.js\"></script>#$tags#" "$SITE/index.html"
  else sed -i "s#<script src=\"js/core/main.js\"></script>#<script src=\"js/core/main.js\"></script>$tags#" "$SITE/index.html"; fi
}
open(){ # $1: query string, $2: screenshot name
  local p; p="$(cd "$SITE" && pwd -W 2>/dev/null || pwd)"
  timeout 60 "$BROWSER" --headless=new --disable-gpu --enable-logging=stderr --v=0 --virtual-time-budget=4900 --window-size=1600,900 \
    --screenshot="$(cd "$OUT" && pwd -W 2>/dev/null || pwd)/$2.png" "file:///$p/index.html?$1" 2>&1 \
    | grep -E 'CONSOLE.*(ERR|CHECK|STATE|GALLERY)|Uncaught' | sed 's/.*CONSOLE:[0-9]*\] "//;s/", source.*//' | sed 's/\n/\n  /g'
}
LOG="$(mktemp)"
main(){
case "${1:-check}" in
  check) build "check.js scenario.js"
    for t in pixel claude cosy neon japan paper retro space; do echo "== $t"; open "theme=$t&hour=12&scn=t&desks=6" "check_$t"; done
    echo "== floors"; N=11 build "floors.js"; open "theme=pixel&hour=12" "check_floors" ;;
  shot) build ""; open "theme=${2:-pixel}&hour=${3:-12}&desks=6" "shot_${2:-pixel}_${3:-12}" ;;
  scenario) build "scenario.js"; open "theme=${2:-pixel}&hour=12&desks=6&scn=${3:-a}" "scn_${2:-pixel}_${3:-a}" ;;
  preview) D="$HOME/.claude/office"; if [ "${2:-}" = off ]; then rm -f "$D/.dev"; echo "the next session to start puts the installed page back"; else mkdir -p "$D" && cp -r "$WEB"/. "$D"/ && touch "$D/.dev" && echo "page copied: reload it (run.sh preview off to stop)"; fi ;;
  gallery) build "gallery.js"; open "theme=pixel&set=${2:-poses}" "gallery${2:+_$2}" ;;
  *) sed -n '2,11p' "$0"; exit 1 ;;
esac
}
main "$@" | tee "$LOG"
echo "screenshots: $OUT"
if grep -qE "^ERR|CHECK FAIL|Uncaught" "$LOG"; then echo "FAILED"; rm -f "$LOG"; exit 1; fi
rm -f "$LOG"
