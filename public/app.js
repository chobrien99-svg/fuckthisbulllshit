(function () {
  var cfg = window.SITE_CONFIG || {};

  // ---- Fill in config values ----
  document.querySelectorAll('[data-config-text]').forEach(function (el) {
    var v = cfg[el.getAttribute('data-config-text')];
    if (v) el.textContent = v;
  });
  document.querySelectorAll('[data-config-link]').forEach(function (el) {
    var v = cfg[el.getAttribute('data-config-link')];
    if (v) { el.href = v; el.target = '_blank'; el.rel = 'noopener'; }
  });
  document.querySelectorAll('[data-config-email]').forEach(function (el) {
    var v = cfg[el.getAttribute('data-config-email')];
    if (!v) return;
    var a = document.createElement('a');
    a.href = 'mailto:' + v;
    a.textContent = v;
    el.replaceWith(a);
  });

  var hashtag = document.getElementById('hashtag-link');
  if (hashtag) {
    hashtag.href = cfg.platformUrl ||
      'https://x.com/intent/post?text=' + encodeURIComponent('#fuckthisbullshit ' + location.origin);
  }

  // ---- Live count + signer list ----
  var countEl = document.getElementById('live-count');
  var signersBox = document.getElementById('signers');
  var signerList = document.getElementById('signer-list');
  var signersEmpty = document.getElementById('signers-empty');

  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  function renderSigners(list) {
    if (!cfg.showSignerNames || !Array.isArray(list)) return;
    signersBox.hidden = false;
    signerList.innerHTML = '';
    signersEmpty.hidden = list.length > 0;
    list.forEach(function (s) {
      var li = document.createElement('li');
      li.textContent = s.name;
      if (s.role) {
        var r = document.createElement('span');
        r.textContent = ' · ' + s.role;
        li.appendChild(r);
      }
      signerList.appendChild(li);
    });
  }

  function load() {
    fetch('/api/signatures', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) {
        countEl.textContent = fmt(d.count || 0);
        renderSigners(d.recent);
      })
      .catch(function () { countEl.textContent = '—'; });
  }
  load();

  // ---- Sign form ----
  var form = document.getElementById('sign-form');
  var status = document.getElementById('form-status');
  var button = document.getElementById('sign-button');

  function say(msg, ok) {
    status.textContent = msg;
    status.className = 'form-status ' + (ok ? 'ok' : 'err');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      role: form.role.value,
      website: form.website.value,
    };
    if (data.name.length < 2) return say('We need a name. Your actual one.', false);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return say('That email doesn\'t look right.', false);

    button.disabled = true;
    button.textContent = 'Signing…';
    fetch('/api/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          say('Done. You\'re on the letter. Now go outside.', true);
          if (res.body.count != null) countEl.textContent = fmt(res.body.count);
          load();
        } else {
          say(res.body.error || 'Something broke. Try again in a minute.', false);
        }
      })
      .catch(function () { say('Something broke. Try again in a minute.', false); })
      .finally(function () { button.disabled = false; button.textContent = 'Sign the letter'; });
  });
})();
