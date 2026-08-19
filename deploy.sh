#!/bin/bash
# Собирает все сайты студии в dist/ и публикует одним деплоем.
# ВАЖНО: Cloudflare Pages заливает снимок целиком — если выложить один сайт,
# остальные исчезнут. Поэтому собираем всегда всё.
set -e
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp index.html _headers dist/
for d in sites/*/; do
  name=$(basename "$d")
  rsync -a --exclude 'assets/envelope' --exclude 'README.md' --exclude '.DS_Store' "$d" "dist/$name/"
  echo "  собран $name"
done

# Pages держит на картинках свои 4 часа и не даёт переопределить это через
# _headers. Поэтому к меняющимся файлам дописываем метку по содержимому:
# поменялась картинка — поменялся адрес, и старая версия ни у кого не залипнет.
python3 - <<'PY'
import hashlib, pathlib, re
STAMPED = ('env-seal.png', 'env-flap.png', 'env-body.png', 'og.jpg', 'bride.jpg', 'venue.jpg')
for site in sorted(pathlib.Path('dist').iterdir()):
    if not site.is_dir(): continue
    stamps = {}
    for n in STAMPED:
        f = site / 'assets' / 'img' / n
        if f.exists():
            stamps[n] = hashlib.md5(f.read_bytes()).hexdigest()[:8]
    for page in list(site.rglob('*.html')) + list(site.rglob('*.css')):
        t = page.read_text(encoding='utf-8'); orig = t
        for n, h in stamps.items():
            t = re.sub(re.escape(n) + r'(?![?\w])', f'{n}?v={h}', t)
        if t != orig:
            page.write_text(t, encoding='utf-8')
    if stamps:
        print('  метки %s: %s' % (site.name, ', '.join(f'{k}={v}' for k, v in stamps.items())))
PY

du -sh dist
npx --yes wrangler@latest pages deploy dist --project-name kelgile --branch main --commit-dirty=true
