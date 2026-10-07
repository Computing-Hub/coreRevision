// pathway.html?topics=hcf,lcm,peel&font=readable&audio=on&speed=0.75   -> on screen
// pathway.html?topics=hcf,lcm,peel&print=1                             -> printable worksheet
(function () {
  var params = new URLSearchParams(location.search);
  var ids = (params.get('topics') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var printMode = params.get('print') === '1';
  var main = document.getElementById('pathway');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function link(extra) {
    var p = ['topics=' + ids.join(',')].concat(QE.toParams(QE.state)).concat(extra || []);
    return 'pathway.html?' + p.join('&');
  }

  // Link a QR code opens: the topic on its subject page, with the same settings, video ready to play.
  function topicUrl(t) {
    var q = QE.toParams(QE.state).filter(function (p) { return !/^chunk=/.test(p); });
    return new URL(t.page + (q.length ? '?' + q.join('&') : '') + '#' + t.id, location.href).href;
  }

  function qrSvg(text, label) {
    var qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: label, title: label });
  }

  function emptyState() {
    main.innerHTML =
      '<section class="page-hero"><h1>No topics in this link</h1>' +
      '<p>Ask your teacher for your link, or choose a subject: <a href="maths.html">Maths</a> or <a href="english.html">English</a>.</p></section>' +
      '<p>Teachers: <a href="builder.html">make a link for a student or group</a>.</p>';
  }

  // ---------- on screen ----------
  function settingsPanel() {
    var ticks = Object.keys(QE.SETTINGS).filter(function (k) { return k !== 'audio' || QE.canSpeak; }).map(function (k) {
      var s = QE.SETTINGS[k];
      return '<label class="tick"><input type="checkbox" name="' + k + '"' + (QE.state[k] ? ' checked' : '') + '>' +
        '<span><strong>' + s.label + '</strong><span>' + s.blurb + '</span></span></label>';
    }).join('');
    var speeds = QE.SPEEDS.map(function (v) {
      return '<label class="pill"><input type="radio" name="speed" value="' + v + '"' + (QE.state.speed === v ? ' checked' : '') + '><span>' +
        (v === '1' ? 'Normal' : v === '0.75' ? 'Slower' : 'Faster') + '</span></label>';
    }).join('');
    return '<details class="settings"><summary>Change how it looks</summary><div class="settings-body">' + ticks +
      '<fieldset class="speeds"><legend>Video speed</legend>' + speeds + '</fieldset></div></details>';
  }

  function renderScreen(found) {
    document.title = 'Your topics – Quick Explainers';
    var subjects = found.reduce(function (a, t) { if (a.indexOf(t.subjectName) < 0) a.push(t.subjectName); return a; }, []);
    main.innerHTML =
      '<section class="page-hero"><h1>Your topics</h1>' +
      '<p>' + found.length + (found.length === 1 ? ' topic' : ' topics') + ' in ' + subjects.join(' and ') +
      '. Work through them in order: read the idea, watch the video, then have a go.</p></section>' +
      '<div class="toolbar">' + settingsPanel() +
      '<a class="btn" id="printLink" href="' + esc(link(['print=1'])) + '">Printable worksheet</a></div>' +
      '<div class="topics" id="topicList"></div>';

    var list = document.getElementById('topicList');
    found.forEach(function (t, i) {
      var el = document.importNode(t.el, true);
      el.open = true;
      el.classList.add('is-' + t.subject);
      el.querySelector('.num').textContent = i + 1;
      var meta = el.querySelector('.meta');
      if (meta) meta.textContent = t.subjectName + (t.time ? ', ' + t.time : '');
      list.appendChild(el);
    });
    QE.enhance(list, { captions: true });

    // One video at a time; closing a topic pauses its video.
    document.addEventListener('play', function (e) {
      document.querySelectorAll('video').forEach(function (v) { if (v !== e.target) v.pause(); });
    }, true);
    list.querySelectorAll('details.topic').forEach(function (d) {
      d.addEventListener('toggle', function () { if (!d.open) { var v = d.querySelector('video'); if (v) v.pause(); } });
    });

    main.querySelector('.settings').addEventListener('change', function (e) {
      var inp = e.target;
      if (inp.name === 'speed') QE.state.speed = inp.value; else QE.state[inp.name] = inp.checked;
      QE.applyClasses();
      QE.stopReading();
      QE.enhance(list, { captions: true });
      try { history.replaceState(null, '', link()); } catch (err) {}
      document.getElementById('printLink').href = link(['print=1']);
    });
  }

  // ---------- printable worksheet ----------
  function renderPrint(found) {
    document.title = 'Worksheet – Quick Explainers';
    document.body.classList.add('print-view');
    var html =
      '<div class="print-bar"><button class="btn btn-primary" type="button" id="doPrint">Print or save as PDF</button>' +
      '<a class="btn" href="' + esc(link()) + '">Back to the topics</a>' +
      '<span class="small">The answers start on a new page, so you can print the questions on their own.</span></div>' +
      '<div class="sheet"><header class="sheet-head"><p class="sheet-brand">Le Rocquier School Quick Explainers</p>' +
      '<p class="sheet-name">Name <span></span></p><p class="sheet-name">Date <span></span></p></header>';

    var answers = '';
    found.forEach(function (t, i) {
      var el = t.el;
      var explain = el.querySelector('.explain');
      // Everything in "Have a go" except the heading and the answers: hint, extracts, questions.
      var practice = el.querySelector('.practice');
      var tasks = '';
      if (practice) {
        var c = practice.cloneNode(true);
        c.querySelectorAll('h3, details.answers, .read-btn, .print-topic').forEach(function (n) { n.remove(); });
        var ol = c.querySelector(':scope > ol');
        if (ol) ol.className = 'sheet-qs lines-' + (t.subject === 'english' ? 3 : 2);
        tasks = c.innerHTML;
      }
      var ans = el.querySelector('.answers > ol');
      var hasVideo = !!el.querySelector('video');
      var label = 'Scan to watch the ' + t.title + ' video';
      html += '<section class="sheet-topic is-' + t.subject + '">' +
        '<h2><span class="sheet-num">' + (i + 1) + '</span> ' + esc(t.title) + '</h2>' +
        (t.sub ? '<p class="sheet-sub">' + esc(t.sub) + '</p>' : '') +
        '<div class="sheet-grid"><div class="explain">' + (explain ? explain.innerHTML : '') + '</div>' +
        (hasVideo ? '<figure class="sheet-qr">' + qrSvg(topicUrl(t), label) +
          '<figcaption>Scan to watch the video' + (t.time ? ' (' + esc(t.time) + ')' : '') + '</figcaption></figure>' : '') +
        '</div><h3>Have a go</h3>' + tasks + '</section>';
      if (ans) answers += '<h3><span class="sheet-num">' + (i + 1) + '</span> ' + esc(t.title) + '</h3><ol class="sheet-ans">' + ans.innerHTML + '</ol>';
    });

    html += '<section class="sheet-answers"><h2>Answers</h2>' + answers + '</section></div>';
    main.innerHTML = html;
    main.querySelectorAll('.read-btn').forEach(function (b) { b.remove(); });
    document.getElementById('doPrint').addEventListener('click', function () { window.print(); });
  }

  // ---------- start ----------
  if (!ids.length) { emptyState(); return; }
  main.innerHTML = '<p class="loading">Loading your topics…</p>';
  QETopics.load().then(function (data) {
    var found = ids.map(function (id) { return data.byId[id]; }).filter(Boolean);
    if (!found.length) { emptyState(); return; }
    if (printMode) renderPrint(found); else renderScreen(found);
    var missing = ids.filter(function (id) { return !data.byId[id]; });
    if (missing.length) {
      var p = document.createElement('p');
      p.className = 'small notice';
      p.textContent = 'Some topics in this link no longer exist and were skipped: ' + missing.join(', ') + '.';
      main.insertBefore(p, main.firstChild);
    }
  }).catch(function (err) { main.innerHTML = QETopics.loadError(err); });
})();
