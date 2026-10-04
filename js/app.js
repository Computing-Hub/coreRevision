// Small enhancements on top of the native <details> accordions.
// The pages still work with JavaScript turned off.
(function () {
  var topics = Array.prototype.slice.call(document.querySelectorAll('details.topic'));
  if (!topics.length) return;

  // Open the topic named in the URL, e.g. maths.html#hcf
  function openFromHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    var target = id && document.getElementById(id);
    if (target && target.classList.contains('topic')) {
      target.open = true;
      target.scrollIntoView({ block: 'start' });
    }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);

  topics.forEach(function (topic) {
    topic.addEventListener('toggle', function () {
      var video = topic.querySelector('video');
      if (topic.open) {
        // Keep a shareable link to the open topic without jumping the page
        if (history.replaceState) history.replaceState(null, '', '#' + topic.id);
      } else if (video) {
        video.pause();
      }
    });
  });

  // Only one video plays at a time
  document.addEventListener('play', function (e) {
    document.querySelectorAll('video').forEach(function (v) {
      if (v !== e.target) v.pause();
    });
  }, true);

  // Open all / close all buttons
  document.querySelectorAll('[data-toggle-all]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('data-toggle-all') === 'open';
      topics.forEach(function (t) { t.open = open; });
    });
  });
})();
