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

  // ---------- turning the page into speech, word by word ----------
  // Each word on the page becomes a token: what to say, and the bit of page to highlight.
  // Stacked fractions are one token ("1 over 2"); symbols are said as words.
  var SAY = [[/−/g, ' minus '], [/×/g, ' times '], [/÷/g, ' divided by '], [/=/g, ' equals '], [/\+/g, ' plus '],
             [/°C/g, ' degrees '], [/%/g, ' percent '], [/→/g, ' then '], [/✓/g, ' correct ']];
  function sayWord(w) {
    SAY.forEach(function (r) { w = w.replace(r[0], r[1]); });
    return w.replace(/\s+/g, ' ').trim();
  }
  var SKIP = '[aria-hidden="true"], .read-btn, .print-topic, details.answers, script, style';
  var BLOCK = /^(P|LI|H1|H2|H3|H4|DIV|UL|OL|BLOCKQUOTE)$/;

  // Returns sentences: [{ block: element to shade, tokens: [{ say, range }] }]
  function tokenize(target) {
    var sentences = [], cur = null;
    function open(block) { cur = { block: block, tokens: [] }; }
    function close() { if (cur && cur.tokens.length) sentences.push(cur); cur = null; }
    function add(say, range, block) {
      if (!say) return;
      // Punctuation on its own (e.g. after bold text) joins the word before it.
      if (/^[.,;:?!)\]"'’”]+$/.test(say) && cur && cur.tokens.length) {
        var prev = cur.tokens[cur.tokens.length - 1];
        prev.say += say;
        if (prev.range && range) prev.range.setEnd(range.endContainer, range.endOffset);
        if (/[.?!]$/.test(say)) close();
        return;
      }
      if (!cur) open(block);
      cur.tokens.push({ say: say, range: range });
      if (/[.?!]$/.test(say)) close();
    }
    function nodeRange(node) { var r = document.createRange(); r.selectNode(node); return r; }

    function walk(node, block) {
      if (node.nodeType === 3) {
        var re = /\S+/g, m;
        while ((m = re.exec(node.data))) {
          var r = document.createRange();
          r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
          add(sayWord(m[0]), r, block);
        }
        return;
      }
      if (node.nodeType !== 1 || node.matches(SKIP)) return;
      if (getComputedStyle(node).display === 'none') return;   // e.g. questions hidden by "Fewer questions"
      if (node.classList.contains('frac')) {
        var label = node.querySelector('.sr-only');
        add(label ? label.textContent.trim() : sayWord(node.textContent), nodeRange(node), block);
        return;
      }
      if (node.classList.contains('gap')) { add('blank', nodeRange(node), block); return; }
      var isBlock = BLOCK.test(node.tagName);
      if (isBlock) { close(); block = node; }
      if (node.tagName === 'LI' && node.parentNode === target && target.tagName === 'OL') {
        add('Question ' + (Array.prototype.indexOf.call(target.children, node) + 1) + '.', null, node);
        open(node);
      }
      if (node.classList.contains('remember')) add('Remember:', null, node);
      Array.prototype.forEach.call(node.childNodes, function (c) { walk(c, block); });
      if (isBlock) close();
    }
    walk(target, target);
    close();
    return sentences;
  }

  // ---------- highlighting ----------
  var canMark = !!(window.CSS && CSS.highlights && window.Highlight);
  var shaded = null;
  function markWord(range) {
    if (!canMark) return;
    if (range) CSS.highlights.set('qe-word', new Highlight(range)); else CSS.highlights.delete('qe-word');
  }
  function shade(block) {
    if (shaded === block) return;
    if (shaded) shaded.classList.remove('reading');
    shaded = block;
    if (!block) return;
    block.classList.add('reading');
    var r = block.getBoundingClientRect();
    if (r.top < 70 || r.bottom > window.innerHeight) {
      block.scrollIntoView({ block: 'center', behavior: state.motion ? 'auto' : 'smooth' });
    }
  }
  function clearMarks() { markWord(null); shade(null); }

  // ---------- speaking ----------
  var speakingBtn = null, session = 0, timers = [];
  var wordEvents = false;   // becomes true once the voice reports where each word starts
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function stop() {
    if (!canSpeak) return;
    session++;
    clearTimers();
    speechSynthesis.cancel();
    clearMarks();
    if (speakingBtn) { speakingBtn.textContent = '🔊 Read aloud'; speakingBtn.setAttribute('aria-pressed', 'false'); }
    speakingBtn = null;
  }

  function speak(target, btn) {
    stop();
    var my = session;
    var sentences = tokenize(target);
    if (!sentences.length) return;
    var RATE = 0.9;

    // One utterance per sentence: Chrome cuts long speech off after ~15 seconds.
    sentences.forEach(function (sen, si) {
      var text = '', starts = [];
      sen.tokens.forEach(function (t) { starts.push(text.length); text += t.say + ' '; });
      var u = new SpeechSynthesisUtterance(text.trim());
      if (voice) u.voice = voice;
      u.lang = voice ? voice.lang : 'en-GB';
      u.rate = RATE;

      u.onstart = function () {
        if (my !== session) return;
        clearTimers();
        shade(sen.block);
        markWord(sen.tokens[0].range);
        // Some voices (often Google's online ones) never say where words start.
        // Then move the highlight on by an estimate; each new sentence puts it back in step.
        if (!wordEvents) {
          var t = 0, msPerChar = 68 / RATE;
          sen.tokens.forEach(function (tok, i) {
            if (i === 0) { t += (tok.say.length + 1) * msPerChar; return; }
            timers.push(setTimeout(function () { if (my === session && !wordEvents) markWord(tok.range); }, t));
            t += (tok.say.length + 1) * msPerChar + (/[,;:]$/.test(sen.tokens[i - 1].say) ? 180 : 0);
          });
        }
      };
      u.onboundary = function (e) {
        if (my !== session || (e.name && e.name !== 'word')) return;
        if (!wordEvents) { wordEvents = true; clearTimers(); }
        var i = starts.length - 1;
        while (i > 0 && starts[i] > e.charIndex) i--;
        markWord(sen.tokens[i].range);
      };
      if (si === sentences.length - 1) u.onend = function () { if (my === session) stop(); };
      u.onerror = function (e) { if (my === session && e.error !== 'interrupted' && e.error !== 'canceled') stop(); };
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
      if (speakingBtn === b) stop(); else speak(target, b);
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
    toParams: toParams, applyClasses: applyClasses, enhance: enhance, stopReading: stop, tokenize: tokenize
  };
})();
