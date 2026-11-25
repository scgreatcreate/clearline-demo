/* Logo preview only: switches the logo on every page. Not part of the real site. */
(function () {
  var OPTS = [['current', 'Current'], ['overlap', 'Overlap'], ['beside', 'Beside'], ['nodrop', 'No drop']];
  var KEY = 'clearline-logo', root = document.documentElement;
  function valid(v) { return OPTS.some(function (o) { return o[0] === v; }); }
  function read() {
    var q = (location.search.match(/[?&]logo=([a-z]+)/) || [])[1];
    if (valid(q)) return q;
    try { var s = localStorage.getItem(KEY); if (valid(s)) return s; } catch (e) {}
    return 'current';
  }
  function apply(v, save) {
    root.setAttribute('data-logo', v);
    if (save) { try { localStorage.setItem(KEY, v); } catch (e) {} }
    document.querySelectorAll('#logo-toggle button').forEach(function (b) { b.setAttribute('aria-pressed', b.value === v ? 'true' : 'false'); });
  }
  apply(read(), false);               // runs in <head>: no flash of the old logo
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.id = 'logo-toggle'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Choose a logo');
    OPTS.forEach(function (o, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.value = o[0]; b.innerHTML = '<b>' + (i + 1) + '</b> ' + o[1];
      b.addEventListener('click', function () {
        apply(o[0], true);
        setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);   // re-fit the line under the name
      });
      bar.appendChild(b);
    });
    document.body.appendChild(bar);
    apply(root.getAttribute('data-logo'), false);
    document.body.classList.add('has-logo-toggle');
  });
})();
