#!/bin/bash
# Собирает все сайты студии в dist/ и публикует одним деплоем.
# ВАЖНО: Cloudflare Pages заливает снимок целиком — если выложить один сайт,
# остальные исчезнут с домена. Поэтому собираем всегда всё.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp index.html _headers dist/
for d in sites/*/; do
  rsync -a --exclude 'assets/envelope' --exclude 'README.md' --exclude '.DS_Store' \
        "$d" "dist/$(basename "$d")/"
  echo "  собран $(basename "$d")"
done
python3 tools/stamp.py dist
du -sh dist
npx --yes wrangler@latest pages deploy dist --project-name kelgile --branch main --commit-dirty=true
