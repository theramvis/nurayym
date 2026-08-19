"""К адресам меняющихся файлов дописывает метку по содержимому.

Cloudflare Pages кеширует статику на 4 часа и не даёт переопределить это
через _headers. Поэтому меняем не заголовки, а сам адрес: другое
содержимое — другой адрес, и старая версия ни у кого не залипает.
Страницы при этом всегда сверяются с сервером (см. _headers), так что
свежие адреса доезжают сразу.
"""
import hashlib, pathlib, re, sys

IMAGES = ('env-seal.png', 'env-flap.png', 'env-body.png',
          'og.jpg', 'bride.jpg', 'venue.jpg')


def digest(path):
    return hashlib.md5(path.read_bytes()).hexdigest()[:8]


def stamp(text, name, mark):
    return re.sub(re.escape(name) + r'(?![?\w])', name + '?v=' + mark, text)


root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'dist')
for site in sorted(root.iterdir()):
    if not site.is_dir():
        continue
    pages = list(site.rglob('*.html'))
    css, js = site / 'css' / 'style.css', site / 'js' / 'main.js'
    marked = []

    # картинки — и в разметке, и внутри стилей
    for name in IMAGES:
        f = site / 'assets' / 'img' / name
        if not f.exists():
            continue
        d = digest(f)
        for page in pages + ([css] if css.exists() else []):
            page.write_text(stamp(page.read_text('utf-8'), name, d), 'utf-8')
        marked.append(name)

    # стили и скрипт — хеш берём уже после подстановки картинок в CSS
    for f, name in ((css, 'style.css'), (js, 'main.js')):
        if not f.exists():
            continue
        d = digest(f)
        for page in pages:
            page.write_text(stamp(page.read_text('utf-8'), name, d), 'utf-8')
        marked.append(name)

    print('  метки %s: %s' % (site.name, ', '.join(marked)))
