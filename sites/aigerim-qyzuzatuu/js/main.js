/* =========================================================
   Кыз узатуу — сайт-приглашение
   ========================================================= */
(function () {
  'use strict';

  /* --- НАСТРОЙКИ: дата и время торжества (Бишкек, UTC+6) --- */
  var EVENT_DATE = '2026-10-01T16:00:00+06:00';

  /* ---------------------------------------------------------
     Конверт
     --------------------------------------------------------- */
  var envelope = document.getElementById('envelope');
  var sealBtn  = document.getElementById('sealBtn');
  var player   = document.getElementById('playerBtn');
  var track    = document.getElementById('track');

  function openEnvelope() {
    if (envelope.classList.contains('is-open')) return;
    envelope.classList.add('is-open');
    document.body.classList.remove('is-locked');
    player.classList.add('is-visible');
    playTrack();
    window.setTimeout(function () { envelope.remove(); }, 2100);
  }

  sealBtn.addEventListener('click', openEnvelope);

  /* ---------------------------------------------------------
     Плеер
     --------------------------------------------------------- */
  function playTrack() {
    var p = track.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        player.classList.add('is-playing');
        player.setAttribute('aria-pressed', 'true');
      }).catch(function () {
        /* автозапуск заблокирован браузером — ждём клика по кнопке */
        player.classList.remove('is-playing');
        player.setAttribute('aria-pressed', 'false');
      });
    }
  }

  player.addEventListener('click', function () {
    if (track.paused) {
      playTrack();
    } else {
      track.pause();
      player.classList.remove('is-playing');
      player.setAttribute('aria-pressed', 'false');
    }
  });

  /* ---------------------------------------------------------
     Сердце едет по линии программы вечера.
     Позиция привязана к прокрутке: доходишь до блока — сердце
     выезжает из начала линии, к концу блока уходит за экран вправо.
     --------------------------------------------------------- */
  (function () {
    var sec   = document.querySelector('.timing');
    var path  = document.getElementById('toiPath');
    var heart = document.querySelector('.timing__heart');
    if (!sec || !path || !heart || !path.getPointAtLength) return;

    var VB_W = 390, VB_H = 1250;      /* система координат секции */
    var BASE_X = 0.27 * VB_W;         /* left/top сердца из CSS — */
    var BASE_Y = 0.65 * VB_H;         /* от них считаем смещение  */
    var LEN = path.getTotalLength();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var shown = 0, want = 0, raf = null;

    function place(t) {
      var pt = path.getPointAtLength(LEN * t);
      var k  = sec.getBoundingClientRect().width / VB_W;
      heart.style.transform = 'translate(-50%,-50%) translate(' +
        ((pt.x - BASE_X) * k).toFixed(1) + 'px,' + ((pt.y - BASE_Y) * k).toFixed(1) + 'px)';
    }

    function tick() {
      shown += (want - shown) * 0.14;
      if (Math.abs(want - shown) < 0.0004) { shown = want; raf = null; }
      else raf = window.requestAnimationFrame(tick);
      place(shown);
    }

    function update() {
      var r = sec.getBoundingClientRect();
      /* 0 — блок только показался снизу, 1 — блок ушёл вверх */
      var t = (window.innerHeight * 0.72 - r.top) / r.height;
      want = t < 0 ? 0 : t > 1 ? 1 : t;
      if (!raf) raf = window.requestAnimationFrame(tick);
    }

    if (reduce) { place(0.62); return; }

    shown = want = 0;
    place(0);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { place(shown); }, { passive: true });
    update();
  })();

  /* ---------------------------------------------------------
     Обратный отсчёт
     --------------------------------------------------------- */
  var target = new Date(EVENT_DATE).getTime();
  var cells  = {};
  ['days', 'hours', 'minutes', 'seconds'].forEach(function (k) {
    cells[k] = document.querySelector('[data-cd="' + k + '"]');
  });

  function tick() {
    var diff = Math.max(0, target - Date.now());
    var s = Math.floor(diff / 1000);
    cells.days.textContent    = Math.floor(s / 86400);
    cells.hours.textContent   = Math.floor(s / 3600) % 24;
    cells.minutes.textContent = Math.floor(s / 60) % 60;
    cells.seconds.textContent = s % 60;
  }
  tick();
  window.setInterval(tick, 1000);

})();
