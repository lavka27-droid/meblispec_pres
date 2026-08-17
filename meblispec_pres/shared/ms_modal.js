// MebliSpec PRES — стилізовані модальні діалоги (заміна нативних alert/confirm/prompt).
// build92: усі функції повертають Promise. window.alert ПЕРЕВИЗНАЧЕНО → усі нативні
// сповіщення (навіть зі сторонніх бібліотек) показуються в стилі плагіна.
// confirm/prompt НЕ перевизначаються (їм потрібен синхронний результат) — місця викликів
// переведено на `await msConfirm(...)` / `await msPrompt(...)`.
(function () {
  if (window.__msModalReady) return;
  window.__msModalReady = true;

  var T = function (s) { return (window.t ? window.t(s) : s); };

  var css = ''
    + '.msm-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:100001;display:flex;align-items:center;'
    + 'justify-content:center;background:rgba(15,23,42,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);'
    + 'font-family:Arial,sans-serif;opacity:0;transition:opacity .15s ease;}'
    + '.msm-overlay.msm-show{opacity:1;}'
    + '.msm-card{background:#fff;width:min(430px,92vw);border-radius:14px;overflow:hidden;'
    + 'box-shadow:0 24px 60px rgba(15,23,42,.30),0 4px 12px rgba(15,23,42,.15);'
    + 'transform:translateY(8px) scale(.97);transition:transform .18s cubic-bezier(.2,.8,.2,1);}'
    + '.msm-overlay.msm-show .msm-card{transform:none;}'
    + '.msm-head{display:flex;align-items:center;gap:12px;padding:18px 20px 0 20px;}'
    + '.msm-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;'
    + 'font-size:20px;flex-shrink:0;background:#eff6ff;color:#2563eb;}'
    + '.msm-icon.msm-danger{background:#fef2f2;color:#ef4444;}'
    + '.msm-icon.msm-warn{background:#fffbeb;color:#f59e0b;}'
    + '.msm-icon.msm-ok{background:#f0fdf4;color:#22c55e;}'
    + '.msm-title{font-size:16px;font-weight:700;color:#1e293b;line-height:1.3;}'
    + '.msm-body{padding:12px 20px 4px 20px;}'
    + '.msm-msg{font-size:13.5px;line-height:1.5;color:#475569;white-space:pre-wrap;word-break:break-word;}'
    + '.msm-input,.msm-select{width:100%;margin-top:12px;padding:9px 11px;border:1px solid #cbd5e1;border-radius:9px;'
    + 'font-size:13.5px;color:#1e293b;font-family:inherit;outline:none;background:#fff;transition:border-color .15s,box-shadow .15s;}'
    + '.msm-input:focus,.msm-select:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15);}'
    + '.msm-foot{display:flex;justify-content:flex-end;gap:8px;padding:16px 20px 18px 20px;}'
    + '.msm-btn{padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid transparent;'
    + 'font-family:inherit;transition:all .15s;min-width:84px;text-align:center;}'
    + '.msm-btn-ghost{background:#fff;color:#334155;border-color:#e2e8f0;}'
    + '.msm-btn-ghost:hover{background:#f1f5f9;border-color:#cbd5e1;}'
    + '.msm-btn-primary{background:#2563eb;color:#fff;}'
    + '.msm-btn-primary:hover{background:#1d4ed8;}'
    + '.msm-btn-danger{background:#ef4444;color:#fff;}'
    + '.msm-btn-danger:hover{background:#dc2626;}'
    // build93: підпис слота MultiView клікабельний + спливне меню вибору типу виду
    + '.msm-slot-label{cursor:pointer;}'
    + '.msm-slot-label:hover .msm-slot-label-bg{fill:rgba(37,99,235,.14);}'
    + 'body.is-printing .msm-slot-chevron{display:none !important;}'
    + '.msm-vmenu{position:fixed;z-index:100002;background:#fff;border:1px solid #e2e8f0;border-radius:10px;'
    + 'box-shadow:0 12px 30px rgba(15,23,42,.22);padding:5px;min-width:152px;font-family:Arial,sans-serif;max-height:72vh;overflow:auto;}'
    + '.msm-vmenu-item{padding:7px 12px;border-radius:7px;font-size:13px;color:#334155;cursor:pointer;white-space:nowrap;}'
    + '.msm-vmenu-item:hover{background:#f1f5f9;}'
    + '.msm-vmenu-active{background:#eff6ff;color:#2563eb;font-weight:700;}'
    + '.msm-vmenu-active:hover{background:#dbeafe;}';
  var st = document.createElement('style'); st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var ICONS = { info: 'ℹ', question: '?', danger: '🗑', warning: '⚠', error: '✕', success: '✓', edit: '✎' };

  // Один діалог за раз; решта стають у чергу (як блокуючий нативний alert).
  var _chain = Promise.resolve();

  function _build(opts) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div'); overlay.className = 'msm-overlay';
      var card = document.createElement('div'); card.className = 'msm-card';
      card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true');

      var head = document.createElement('div'); head.className = 'msm-head';
      var ic = document.createElement('div'); ic.className = 'msm-icon';
      if (opts.iconClass) ic.classList.add(opts.iconClass);
      ic.textContent = opts.icon || ICONS.info;
      var ttl = document.createElement('div'); ttl.className = 'msm-title';
      ttl.textContent = opts.title || '';
      head.appendChild(ic); head.appendChild(ttl);

      var body = document.createElement('div'); body.className = 'msm-body';
      var msg = document.createElement('div'); msg.className = 'msm-msg';
      msg.textContent = opts.message || '';
      body.appendChild(msg);

      var input = null, select = null;
      if (opts.mode === 'prompt') {
        if (opts.options && opts.options.length) {
          select = document.createElement('select'); select.className = 'msm-select';
          opts.options.forEach(function (o) {
            var op = document.createElement('option'); op.value = o.value; op.textContent = o.label;
            if (String(o.value) === String(opts.defaultValue)) op.selected = true;
            select.appendChild(op);
          });
          body.appendChild(select);
        } else {
          input = document.createElement('input'); input.className = 'msm-input'; input.type = 'text';
          input.value = (opts.defaultValue != null ? opts.defaultValue : '');
          if (opts.placeholder) input.placeholder = opts.placeholder;
          body.appendChild(input);
        }
      }

      var foot = document.createElement('div'); foot.className = 'msm-foot';
      var cancelBtn = null;
      if (opts.mode !== 'alert') {
        cancelBtn = document.createElement('button');
        cancelBtn.className = 'msm-btn msm-btn-ghost';
        cancelBtn.textContent = opts.cancelText || T('Скасувати');
        foot.appendChild(cancelBtn);
      }
      var okBtn = document.createElement('button');
      okBtn.className = 'msm-btn ' + (opts.danger ? 'msm-btn-danger' : 'msm-btn-primary');
      okBtn.textContent = opts.okText || T('OK');
      foot.appendChild(okBtn);

      card.appendChild(head); card.appendChild(body); card.appendChild(foot);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add('msm-show'); });

      var done = false;
      function close(result) {
        if (done) return; done = true;
        document.removeEventListener('keydown', onKey, true);
        overlay.classList.remove('msm-show');
        setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 160);
        resolve(result);
      }
      function okVal() {
        if (opts.mode === 'prompt') return select ? select.value : (input ? input.value : '');
        return true; // alert / confirm
      }
      function cancelVal() { return opts.mode === 'confirm' ? false : null; }

      okBtn.addEventListener('click', function () { close(okVal()); });
      if (cancelBtn) cancelBtn.addEventListener('click', function () { close(cancelVal()); });
      overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay && opts.mode !== 'alert') close(cancelVal());
      });
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(opts.mode === 'alert' ? true : cancelVal()); }
        else if (e.key === 'Enter') { e.preventDefault(); close(okVal()); }
      }
      document.addEventListener('keydown', onKey, true);

      setTimeout(function () {
        if (input) { input.focus(); input.select(); }
        else if (select) select.focus();
        else okBtn.focus();
      }, 30);
    });
  }

  function _enqueue(opts) {
    var p = _chain.then(function () { return _build(opts); });
    _chain = p.catch(function () { }); // помилка одного діалогу не ламає чергу
    return p;
  }

  window.msAlert = function (message, opts) {
    opts = opts || {};
    var type = opts.type;
    return _enqueue({
      mode: 'alert', message: message != null ? String(message) : '',
      title: opts.title || T('Повідомлення'),
      icon: opts.icon || (type === 'error' ? ICONS.error : type === 'success' ? ICONS.success : type === 'warning' ? ICONS.warning : ICONS.info),
      iconClass: opts.iconClass || (type === 'error' ? 'msm-danger' : type === 'success' ? 'msm-ok' : type === 'warning' ? 'msm-warn' : ''),
      okText: opts.okText
    });
  };

  window.msConfirm = function (message, opts) {
    opts = opts || {};
    return _enqueue({
      mode: 'confirm', message: message != null ? String(message) : '',
      title: opts.title || T('Підтвердження'),
      icon: opts.icon || (opts.danger ? ICONS.danger : ICONS.question),
      iconClass: opts.iconClass || (opts.danger ? 'msm-danger' : ''),
      danger: !!opts.danger, okText: opts.okText, cancelText: opts.cancelText
    });
  };

  window.msPrompt = function (message, defaultValue, opts) {
    opts = opts || {};
    return _enqueue({
      mode: 'prompt', message: message != null ? String(message) : '',
      defaultValue: defaultValue != null ? defaultValue : '',
      title: opts.title || T('Введення'),
      icon: opts.icon || ICONS.edit, iconClass: opts.iconClass || '',
      placeholder: opts.placeholder, options: opts.options,
      okText: opts.okText, cancelText: opts.cancelText
    });
  };

  // Нативний alert → стилізований (ловить усі сповіщення без правки кожного виклику).
  window.alert = function (message) { window.msAlert(message); };
})();
