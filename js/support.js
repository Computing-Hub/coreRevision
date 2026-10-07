// Inclusion settings, shared by every page.
// Settings live only in the link (?font=readable&audio=on ...). Nothing is stored or sent anywhere.
(function () {
  var SETTINGS = {
    font:   { value: 'readable', label: 'Easier to read', blurb: 'Bigger text, more space between lines and letters, plain background.' },
    motion: { value: 'reduce',   label: 'Less movement',  blurb: 'Nothing slides or moves on the page.' },
    chunk:  { value: 'small',    label: 'Fewer questions', blurb: 'Only the first 3 questions in each topic.' },
    audio:  { value: 'on',       label: 'Read aloud',     blurb: 'Adds a button that reads the explanation and questions out loud.' }
  };
  var SPEEDS = ['0.75', '1', '1.25'];

  var params = new URLSearchParams(location.search);
  var state = { speed: SPEEDS.indexOf(params.get('speed')) > -1 ? params.get('speed') : '1' };
  Object.keys(SETTINGS).forEach(function (k) { state[k] = params.get(k) === SETTINGS[k].value; });

  function toParams(s) {
    var out = [];
    Object.keys(SETTINGS).forEach(function (k) { if (s[k]) out.push(k + '=' + SETTINGS[k].value); });
    if (s.speed && s.speed !== '1') out.push('speed=' + s.speed);
    return out;
  }

  // ---------- read aloud ----------
  var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var voice = null;

  // The browser default voice is often robotic. Prefer natural/online British voices when the device has them.
  function pickVoice() {
    if (!canSpeak) return;
    var best = null, bestScore = -1;
    speechSynthesis.getVoices().forEach(function (v) {
      if (!/^en/i.test(v.lang)) return;
      var score = 0;
      if (/natural|neural|online/i.test(v.name)) score += 4;
      if (/google uk english|sonia|libby|ryan|serena|daniel/i.test(v.name)) score += 2;
      if (/en[-_]GB/i.test(v.lang)) score += 2;
      if (v.localService === false) score += 1;
      if (score > bestScore) { best = v; bestScore = score; }
    });
    voice = best;
  }
  if (canSpeak) {
    pickVoice();
    speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', pickVoice)
                                     : (speechSynthesis.onvoiceschanged = pickVoice);
  }

  // Turn page text into something that sounds right: "1 over 2", "3 minus 8 equals" ...
  function speechText(el) {
    var c = el.cloneNode(true);
    c.querySelectorAll('[aria-hidden="true"], .read-btn, .print-topic, details.answers').forEach(function (n) { n.remove(); });
    c.querySelectorAll('.remember').forEach(function (n) { n.prepend('Remember: '); });
    c.querySelectorAll('.gap').forEach(function (n) { n.textContent = ' blank '; });
    c.querySelectorAll('p, li, h3').forEach(function (n) { n.append('. '); });
    if (el.matches('ol')) {
      Array.prototype.forEach.call(c.children, function (li, i) { li.prepend('Question ' + (i + 1) + '. '); });
    }
    return c.textContent
      .replace(/−/g, ' minus ').replace(/×/g, ' times ').replace(/÷/g, ' divided by ')
      .replace(/=/g, ' equals ').replace(/\+/g, ' plus ').replace(/°C/g, ' degrees ').replace(/%/g, ' percent ')
      .replace(/→/g, ' then ').replace(/✓/g, ' correct ')
      .replace(/\s+/g, ' ').replace(/([:?!])\s*\./g, '$1').replace(/(\.\s*){2,}/g, '. ').trim();
  }

  var speakingBtn = null;
  function stop() {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    if (speakingBtn) { speakingBtn.textContent = '🔊 Read aloud'; speakingBtn.setAttribute('aria-pressed', 'false'); }
    speakingBtn = null;
  }
  function speak(text, btn) {
    stop();
    // Chrome cuts long speech off after ~15 seconds, so speak one sentence at a time.
    var parts = text.match(/[^.?!]+[.?!]*/g) || [text];
    parts.forEach(function (p, i) {
      var u = new SpeechSynthesisUtterance(p.trim());
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-GB';
      u.rate = 0.9;
      if (i === parts.length - 1) u.onend = function () { if (speakingBtn === btn) stop(); };
      speechSynthesis.speak(u);
    });
    speakingBtn = btn;
    btn.textContent = '⏹ Stop reading';
    btn.setAttribute('aria-pressed', 'true');
  }
  function readButton(target) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn read-btn'; b.textContent = '🔊 Read aloud';
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      if (speakingBtn === b) stop(); else speak(speechText(target), b);
    });
    return b;
  }

  // ---------- apply settings to a page (or part of one) ----------
  function applyClasses() {
    var h = document.documentElement;
    h.classList.toggle('font-readable', state.font);
    h.classList.toggle('motion-reduce', state.motion);
    h.classList.toggle('chunk-small', state.chunk);
  }

  function setupVideo(v, opts) {
    var rate = parseFloat(state.speed) || 1;
    function setRate() { v.defaultPlaybackRate = rate; v.playbackRate = rate; }
    setRate();
    v.addEventListener('loadedmetadata', setRate);
    v.addEventListener('play', function () { if (v.playbackRate !== rate) setRate(); stop(); });
    if (opts && opts.captions) {
      var t = v.querySelector('track');
      if (t) t.setAttribute('default', '');
      function show() { if (v.textTracks[0]) v.textTracks[0].mode = 'showing'; }
      show(); v.addEventListener('loadedmetadata', show);
    }
  }

  function enhance(root, opts) {
    root = root || document;
    root.querySelectorAll('video').forEach(function (v) { setupVideo(v, opts); });
    root.querySelectorAll('.read-btn').forEach(function (b) { b.remove(); });
    if (state.audio && canSpeak) {
      root.querySelectorAll('.explain').forEach(function (ex) { ex.appendChild(readButton(ex)); });
      root.querySelectorAll('.practice > ol').forEach(function (ol) { ol.before(readButton(ol)); });
    }
  }

  applyClasses();

  window.QE = {
    SETTINGS: SETTINGS, SPEEDS: SPEEDS, state: state, canSpeak: canSpeak,
    toParams: toParams, applyClasses: applyClasses, enhance: enhance, stopReading: stop
  };
})();
