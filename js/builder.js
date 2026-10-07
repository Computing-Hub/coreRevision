// Teacher page: tick topics and settings, get a student link and a printable worksheet link.
(function () {
  // Settings ticked here are for the student's link, not for this page.
  document.documentElement.classList.remove('font-readable', 'motion-reduce', 'chunk-small');
  var picked = [];            // topic ids, in the order the student will see them
  var data = null;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Start from an existing link if one is in the address bar (handy for editing a link you sent).
  var start = new URLSearchParams(location.search).get('topics');
  if (start) picked = start.split(',').filter(Boolean);

  function url(extra) {
    var p = ['topics=' + picked.join(',')].concat(QE.toParams(QE.state)).concat(extra || []);
    return new URL('pathway.html?' + p.join('&'), location.href).href;
  }

  function renderTopics() {
    $('topicLists').innerHTML = data.sources.map(function (src) {
      var items = data.all.filter(function (t) { return t.subject === src.subject; }).map(function (t) {
        return '<label class="tick"><input type="checkbox" value="' + esc(t.id) + '"' + (picked.indexOf(t.id) > -1 ? ' checked' : '') + '>' +
          '<span><strong>' + esc(t.title) + '</strong><span>' + esc(t.sub) + (t.time ? ' (' + esc(t.time) + ')' : '') + '</span></span></label>';
      }).join('');
      return '<fieldset class="topic-pick is-' + src.subject + '"><legend>' + src.name + '</legend>' + items + '</fieldset>';
    }).join('');
  }

  function renderSettings() {
    var ticks = Object.keys(QE.SETTINGS).map(function (k) {
      var s = QE.SETTINGS[k];
      return '<label class="tick"><input type="checkbox" name="' + k + '"' + (QE.state[k] ? ' checked' : '') + '>' +
        '<span><strong>' + s.label + '</strong><span>' + s.blurb + '</span></span></label>';
    }).join('');
    var speeds = QE.SPEEDS.map(function (v) {
      return '<label class="pill"><input type="radio" name="speed" value="' + v + '"' + (QE.state.speed === v ? ' checked' : '') + '><span>' +
        (v === '1' ? 'Normal' : v === '0.75' ? 'Slower' : 'Faster') + '</span></label>';
    }).join('');
    $('settingsBox').innerHTML = ticks + '<fieldset class="speeds"><legend>Video speed</legend>' + speeds + '</fieldset>';
  }

  function renderOutput() {
    var ok = picked.length > 0;
    $('order').innerHTML = ok ? picked.map(function (id, i) {
      var t = data.byId[id];
      return '<li><span>' + esc(t.title) + ' <span class="small">(' + t.subjectName + ')</span></span>' +
        '<span class="order-btns"><button class="btn btn-icon" type="button" data-move="-1" data-i="' + i + '" aria-label="Move ' + esc(t.title) + ' up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="btn btn-icon" type="button" data-move="1" data-i="' + i + '" aria-label="Move ' + esc(t.title) + ' down"' + (i === picked.length - 1 ? ' disabled' : '') + '>↓</button></span></li>';
    }).join('') : '<li class="small">Tick at least one topic.</li>';

    $('output').hidden = !ok;
    if (!ok) return;
    var student = url(), sheet = url(['print=1']);
    $('studentLink').value = student; $('openStudent').href = student;
    $('sheetLink').value = sheet; $('openSheet').href = sheet;
    var qr = qrcode(0, 'M'); qr.addData(student); qr.make();
    $('qr').innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true, alt: 'QR code for the student link', title: 'QR code for the student link' });
    try { history.replaceState(null, '', 'builder.html?' + ['topics=' + picked.join(',')].concat(QE.toParams(QE.state)).join('&')); } catch (e) {}
  }

  function copy(inputId, btn) {
    var inp = $(inputId);
    function done() { var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1500); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(inp.value).then(done, function () { inp.select(); document.execCommand('copy'); done(); });
    else { inp.select(); document.execCommand('copy'); done(); }
  }

  QETopics.load().then(function (d) {
    data = d;
    picked = picked.filter(function (id) { return data.byId[id]; });
    renderTopics(); renderSettings(); renderOutput();

    $('topicLists').addEventListener('change', function (e) {
      var id = e.target.value, at = picked.indexOf(id);
      if (e.target.checked && at < 0) picked.push(id);
      if (!e.target.checked && at > -1) picked.splice(at, 1);
      renderOutput();
    });
    $('settingsBox').addEventListener('change', function (e) {
      if (e.target.name === 'speed') QE.state.speed = e.target.value; else QE.state[e.target.name] = e.target.checked;
      renderOutput();
    });
    $('order').addEventListener('click', function (e) {
      var b = e.target.closest('[data-move]'); if (!b) return;
      var i = +b.getAttribute('data-i'), j = i + (+b.getAttribute('data-move'));
      var tmp = picked[i]; picked[i] = picked[j]; picked[j] = tmp;
      renderOutput();
      var again = $('order').querySelector('[data-i="' + j + '"][data-move="' + b.getAttribute('data-move') + '"]');
      (again && !again.disabled ? again : $('order').querySelector('[data-i="' + j + '"]')).focus();
    });
    $('clearAll').addEventListener('click', function () { picked = []; renderTopics(); renderOutput(); });
    $('copyStudent').addEventListener('click', function () { copy('studentLink', this); });
    $('copySheet').addEventListener('click', function () { copy('sheetLink', this); });
  }).catch(function (err) { $('builderApp').innerHTML = QETopics.loadError(err); });
})();
