/* Печатный вариант приглашения: одна страница A5, два языка.
   Верстается тем же шрифтом и теми же материалами, что и сайт,
   и печатается через headless-браузер в PDF.
   Запуск:  node tools/make-pdf.mjs <папка-сайта> */
import { chromium } from 'playwright-core';
import { writeFileSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';

const site = resolve(process.argv[2] || 'sites/aiday-qyzuzatuu');
/* Страницу кладём временным файлом внутрь сайта: из памяти (setContent)
   браузер не пускает file://-ссылки, и ни шрифт, ни картинки не грузятся. */
const A = 'assets';

const L = {
  kg: {
    file: 'priglashenie-kg.pdf',
    eyebrow: 'Кыз узатууга чакыруу',
    name: 'Айдай',
    sub: 'Кыз узатуу',
    hello: 'Кадырлуу коноктор!',
    body: ['Сиздерди сүйүктүү кызыбыз Айдайдын кыз узатуу',
           'тоюна арналган салтанатка келип, ак дасторкон',
           'үстүндө кадырлуу коногубуз болуп, ак батаңызды',
           'берип кетүүгө чакырабыз!'],
    date: '14-сентябрь 2026',
    t1: 'Коноктор жыйыны', t1v: '16:00',
    t2: 'Тойдун башталышы', t2v: '17:00',
    placeLabel: 'Дареги жана убактысы',
    venue: '«ANEL GRAND HALL» рестораны',
    addr: 'Бишкек ш., Мадиева к., 22А',
    hosts: 'Той ээлери:',
  },
  ru: {
    file: 'priglashenie-ru.pdf',
    eyebrow: 'Приглашение на кыз узатуу',
    name: 'Айдай',
    sub: 'Кыз узатуу',
    hello: 'Дорогие гости!',
    body: ['Приглашаем вас на торжество, посвящённое кыз узатуу',
           'нашей любимой дочери Айдай, разделить с нами',
           'праздничный дастархан, быть нашим почётным гостем',
           'и дать своё благословение!'],
    date: '14 сентября 2026',
    t1: 'Сбор гостей', t1v: '16:00',
    t2: 'Начало торжества', t2v: '17:00',
    placeLabel: 'Место и время',
    venue: 'ресторан «ANEL GRAND HALL»',
    addr: 'г. Бишкек, ул. Мадиева, 22А',
    hosts: 'Хозяева торжества:',
  },
};
const HOSTS = ['Акиналы', 'Гулжамал'];

const page = (t) => `<!doctype html><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&display=swap');
@font-face{ font-family:'Florise'; src:url('${A}/fonts/florise.woff') format('woff'); }
@page{ size:148mm 210mm; margin:0 }
*{ margin:0; box-sizing:border-box }
body{ width:148mm; height:210mm; position:relative; overflow:hidden;
      background:linear-gradient(#F7F9FF 0%, #EBF0FF 48%, #E3EAFB 100%);
      font-family:'Cormorant Garamond',Georgia,serif; color:#4E6294;
      -webkit-print-color-adjust:exact; print-color-adjust:exact }
img{ position:absolute; display:block; z-index:0 }
.fl{ width:42mm; left:-21mm; top:-14mm }
.fr{ width:41mm; right:-20mm; top:-11mm }
.fb{ width:32mm; left:-13mm; bottom:44mm; opacity:.8 }
.silk{ width:176mm; left:-14mm; bottom:-56mm }
.wrap{ position:absolute; inset:0; z-index:2; display:flex; flex-direction:column;
       align-items:center; text-align:center; padding:17mm 12mm 0 }
.eyebrow{ font-size:9pt; letter-spacing:.34em; text-transform:uppercase; color:#002676 }
.name{ font-family:'Florise',cursive; font-size:64pt; line-height:1; color:#264386; margin-top:2mm }
.sub{ font-size:15pt; letter-spacing:.24em; text-transform:uppercase; color:#002676; margin-top:1mm }
.rule{ width:26mm; height:1px; background:#9FB2D8; margin:6mm 0 }
.hello{ font-family:'Florise',cursive; font-size:26pt; line-height:1; color:#3A518B }
.body{ margin-top:4mm; font-size:9.5pt; line-height:1.85; letter-spacing:.05em; text-transform:uppercase }
.date{ margin-top:7mm; font-size:16pt; letter-spacing:.16em; text-transform:uppercase; color:#002676 }
.times{ display:flex; gap:11mm; margin-top:4mm }
.t b{ display:block; font-weight:400; font-size:14pt; color:#002676 }
.t span{ font-size:8.5pt; letter-spacing:.13em; text-transform:uppercase }
.plabel{ margin-top:7mm; font-family:'Florise',cursive; font-size:19pt; color:#3A518B }
.venue{ margin-top:1mm; font-size:12pt; letter-spacing:.06em; color:#002676 }
.addr{ margin-top:1mm; font-size:10pt; letter-spacing:.03em }
.hosts{ margin-top:9mm; text-align:center }
.hosts em{ display:block; font-style:normal; font-size:9pt; letter-spacing:.2em;
           text-transform:uppercase; color:#4E6294 }
.hosts strong{ display:block; margin-top:1mm; font-family:'Florise',cursive;
               font-weight:400; font-size:23pt; line-height:1.15; color:#002676 }
.amp{ font-family:Georgia,serif; font-size:15pt; color:#B9C7EA; vertical-align:2pt }
</style>
<img class="fl" src="${A}/img/flower-dark.png">
<img class="fr" src="${A}/img/flower-dark-2.png">
<img class="fb" src="${A}/img/flower-light.png">
<img class="silk" src="${A}/img/silk.png">
<div class="wrap">
  <div class="eyebrow">${t.eyebrow}</div>
  <div class="name">${t.name}</div>
  <div class="sub">${t.sub}</div>
  <div class="rule"></div>
  <div class="hello">${t.hello}</div>
  <div class="body">${t.body.join('<br>')}</div>
  <div class="date">${t.date}</div>
  <div class="times">
    <div class="t"><b>${t.t1v}</b><span>${t.t1}</span></div>
    <div class="t"><b>${t.t2v}</b><span>${t.t2}</span></div>
  </div>
  <div class="plabel">${t.placeLabel}</div>
  <div class="venue">${t.venue}</div>
  <div class="addr">${t.addr}</div>
  <div class="hosts"><em>${t.hosts}</em>
    <strong>${HOSTS[0]} <span class="amp">&</span> ${HOSTS[1]}</strong></div>
</div>`;

const b = await chromium.launch({ executablePath: '/Applications/Chrome.app/Contents/MacOS/Google Chrome' });
for (const key of ['kg', 'ru']) {
  const t = L[key];
  const p = await b.newPage();
  const tmp = join(site, '_pdf-tmp.html');
  writeFileSync(tmp, page(t), 'utf-8');
  await p.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  await p.pdf({ path: join(site, t.file), width: '148mm', height: '210mm',
                printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  unlinkSync(tmp);
  console.log('  собран', t.file);
  await p.close();
}
await b.close();
