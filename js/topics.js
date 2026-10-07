// Reads the topics straight out of maths.html and english.html,
// so each topic is still written once, in its subject page.
(function () {
  var SOURCES = [
    { page: 'maths.html', subject: 'maths', name: 'Maths' },
    { page: 'english.html', subject: 'english', name: 'English' }
  ];

  function load() {
    return Promise.all(SOURCES.map(function (src) {
      return fetch(src.page).then(function (r) {
        if (!r.ok) throw new Error(src.page + ' (' + r.status + ')');
        return r.text();
      }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        return Array.prototype.map.call(doc.querySelectorAll('details.topic'), function (el) {
          var strong = el.querySelector('.title strong'), sub = el.querySelector('.title > span');
          var meta = el.querySelector('.meta');
          return {
            id: el.id, subject: src.subject, subjectName: src.name, page: src.page,
            title: strong ? strong.textContent.trim() : el.id,
            sub: sub ? sub.textContent.trim() : '',
            time: meta ? meta.textContent.trim() : '',
            el: el
          };
        });
      });
    })).then(function (lists) {
      var all = [].concat.apply([], lists), byId = {};
      all.forEach(function (t) { byId[t.id] = t; });
      return { all: all, byId: byId, sources: SOURCES };
    });
  }

  // Short message for when the pages can't be read, e.g. opened as a file instead of from a server.
  function loadError(err) {
    var local = location.protocol === 'file:';
    return '<div class="callout"><h2>The topics could not be loaded</h2><p>' +
      (local ? 'This page needs to be opened from a web server, not straight from the file. In this folder run <code>python3 -m http.server 8000</code> and visit http://localhost:8000.'
             : 'Check your internet connection and reload the page.') +
      '</p><p class="small">' + String(err && err.message || err).replace(/</g, '&lt;') + '</p></div>';
  }

  window.QETopics = { load: load, loadError: loadError };
})();
