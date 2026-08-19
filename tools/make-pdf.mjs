/* Сайт целиком одной длинной страницей PDF, в двух языках.
   Это не отдельный макет, а тот же сайт: браузер открывает страницу,
   раскрывает конверт и печатает всё как есть. Для русской версии перед
   печатью подменяются тексты — включая три надписи, которые на сайте
   лежат картинками (их заменяем на набранный текст).

   Запуск:  node tools/make-pdf.mjs <папка-сайта>
   Нужен playwright-core; в проекте его нет — запускать оттуда, где стоит. */
import { chromium } from 'playwright-core';
import { resolve, join } from 'path';

const site = resolve(process.argv[2] || 'sites/aiday-qyzuzatuu');
const url = 'file://' + join(site, 'index.html');

/* Что меняем для русской версии. Ключ — точный текст на сайте. */
const RU_TEXT = {
  'Кадырлуу': 'Дорогие',
  'Коноктор!': 'Гости!',
  'Той салтанатына чейин:': 'До торжества осталось:',
  'күн': 'дней', 'саат': 'часов', 'мүнөт': 'минут', 'секунд': 'секунд',
  'Сентябрь': 'Сентябрь',
  'Дареги жана': 'Место', 'убактысы': 'и время',
  'Рестораны': 'Ресторан',
  'Коноктор': 'Сбор', 'жыйыны': 'гостей',
  'Тойдун': 'Начало', 'башталышы': 'торжества',
  'Той ээлери:': 'Хозяева торжества:',
  'Карта': 'Карта',
};
const RU_BLOCK = [
  [/Сиздерди сүйүктүү кызыбыз[\s\S]*чакырабыз!/,
   'Приглашаем вас на торжество,<br>посвящённое кыз узатуу нашей<br>любимой дочери Айдай,<br>разделить с нами праздничный<br>дастархан, быть нашим<br>почётным гостем и дать<br>своё благословение!'],
  [/Жакшы маанай[\s\S]*кылыңыз/, 'Подарите нам<br>хорошее настроение<br>и сделайте наш<br>вечер ярким'],
  [/Жүрөктөн чыккан[\s\S]*болобуз/, 'Будем благодарны<br>за вашу искреннюю<br>поддержку'],
  [/Бишкек ш\., Мадиева к\., 22А/, 'г. Бишкек, ул. Мадиева, 22А'],
];
/* надписи-картинки → набранный текст */
const RU_IMAGES = [
  ['.hero__eyebrow', 'Приглашение на кыз узатуу',
   'display:block;white-space:nowrap;font-size:calc(15 * var(--u));letter-spacing:.16em;' +
   'text-transform:uppercase;color:#002676;text-align:center'],
  ['.hero__sub', 'Кыз узатуу',
   'display:block;white-space:nowrap;font-size:calc(27 * var(--u));letter-spacing:.14em;' +
   'text-transform:uppercase;color:#002676;text-align:right'],
  ['.timing__title', 'Программа вечера:',
   'display:block;white-space:nowrap;font-family:Florise,cursive;' +
   'font-size:calc(46 * var(--u));color:#3A518B;text-align:center'],
];
const WEEKDAYS = [['Дш','Пн'],['Ше','Вт'],['Ша','Ср'],['Бе','Чт'],['Жм','Пт'],['Иш','Сб'],['Жк','Вс']];

const b = await chromium.launch({ executablePath: '/Applications/Chrome.app/Contents/MacOS/Google Chrome' });

for (const lang of ['kg', 'ru']) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await p.emulateMedia({ media: 'screen' });           /* печатаем как на экране */
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.evaluate(() => document.getElementById('sealBtn').click());
  await p.waitForTimeout(1500);

  if (lang === 'ru') {
    await p.evaluate(([map, blocks, images, days]) => {
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walk.nextNode()) nodes.push(walk.currentNode);
      nodes.forEach(n => {
        const t = n.nodeValue.trim();
        if (t && map[t]) n.nodeValue = n.nodeValue.replace(t, map[t]);
      });
      days.forEach(([kg, ru]) => {
        document.querySelectorAll('.cal th').forEach(th => {
          if (th.textContent.trim() === kg) th.textContent = ru;
        });
      });
      blocks.forEach(([re, html]) => {
        document.querySelectorAll('p').forEach(el => {
          if (new RegExp(re, 'm').test(el.innerHTML.replace(/<br>/g, ' '))) el.innerHTML = html;
        });
      });
      images.forEach(([sel, text, css]) => {
        const el = document.querySelector(sel);
        if (!el) return;
        /* класс уже задаёт left/top/width — оставляем его и дописываем только шрифт */
        const span = document.createElement('span');
        span.className = el.className;
        span.textContent = text;
        span.setAttribute('style', css);
        el.replaceWith(span);
      });
    }, [RU_TEXT, RU_BLOCK.map(([re, h]) => [re.source, h]), RU_IMAGES, WEEKDAYS]);
    await p.waitForTimeout(400);
  }

  /* служебные элементы в документе не нужны; сердце ставим на середину пути */
  await p.evaluate(() => {
    ['.player', '.scroll-hint'].forEach(s => document.querySelector(s)?.remove());
    var path = document.getElementById('toiPath'), heart = document.querySelector('.timing__heart');
    if (path && heart) {
      var pt = path.getPointAtLength(path.getTotalLength() * 0.56),
          k = document.querySelector('.timing').getBoundingClientRect().width / 390;
      heart.style.transform = 'translate(-50%,-50%) translate(' +
        ((pt.x - 0.27 * 390) * k) + 'px,' + ((pt.y - 0.65 * 1250) * k) + 'px)';
    }
  });
  await p.waitForTimeout(600);

  const h = await p.evaluate(() => document.body.scrollHeight);
  const out = join(site, 'priglashenie-' + lang + '.pdf');
  await p.pdf({ path: out, width: '390px', height: h + 'px', printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  console.log('  собран priglashenie-%s.pdf  (390 × %d)', lang, h);
  await p.close();
}
await b.close();
