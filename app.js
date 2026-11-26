// Moyennes IESEG — interface
'use strict';
{
  const $ = s => document.querySelector(s);
  const PALETTE = ['#16324f', '#e4572e', '#3a86b4', '#f2a541', '#2a9d8f', '#8e5ea2', '#c44569', '#6c8a3a', '#5c6b7a', '#d17a22'];
  const REST = '#d5dde5';
  const isDark = () => document.documentElement.dataset.theme === 'dark' || (matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light');
  const col = (i, pdf = false) => (i % PALETTE.length === 0 && !pdf && isDark()) ? '#7fb7d6' : PALETTE[i % PALETTE.length];
  const state = { user: null, subjects: [], mode: 'login', charts: [] };

  // ---------- Utilitaires ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n, d = 2) => n == null || !Number.isFinite(n) ? '–' : n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtP = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
  const parseNum = v => Number(String(v).replace(',', '.').trim());
  const ICON = {
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>'
  };

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ---------- Firebase ----------
  const CFG = window.FIREBASE_CONFIG || {};
  const configured = !!(window.fb && CFG.apiKey && !String(CFG.apiKey).includes('A_REMPLACER'));
  let auth = null, db = null;
  if (configured) {
    const app = fb.initializeApp(CFG);
    auth = fb.getAuth(app);
    auth.languageCode = 'fr';
    db = fb.getFirestore(app);
    if (window.FIREBASE_EMULATOR) {
      fb.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      fb.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
  }
  const BAD_LOGIN = 'E-mail ou mot de passe incorrect.';
  const ERR = {
    'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse.',
    'auth/invalid-email': 'Adresse e-mail invalide.',
    'auth/missing-email': 'Indique ton adresse e-mail.',
    'auth/weak-password': 'Le mot de passe doit faire au moins 8 caractères.',
    'auth/missing-password': 'Indique ton mot de passe.',
    'auth/invalid-credential': BAD_LOGIN, 'auth/wrong-password': BAD_LOGIN, 'auth/user-not-found': BAD_LOGIN,
    'auth/too-many-requests': 'Trop de tentatives. Réessaie dans quelques minutes.',
    'auth/network-request-failed': 'Pas de connexion internet.',
    'auth/requires-recent-login': 'Par sécurité, reconnecte-toi puis réessaie.',
    'permission-denied': 'Action refusée (données invalides ou session expirée).',
    'unavailable': 'Serveur injoignable, vérifie ta connexion.'
  };
  const friendly = e => new Error(ERR[e && e.code] || (e && !e.code && e.message) || 'Une erreur est survenue.');
  async function run(fn) { try { return await fn(); } catch (e) { throw friendly(e); } }

  const round2 = n => Math.round(n * 100) / 100;
  function checkSubject(name, credits) {
    name = String(name || '').trim().slice(0, 100);
    if (!name) throw new Error('Donne un nom à la matière.');
    if (!Number.isFinite(credits) || credits < 0 || credits > 60) throw new Error('Les crédits doivent être compris entre 0 et 60.');
    return { name, credits: round2(credits) };
  }
  function checkGrade(label, value, weight, allowEmpty = false) {
    label = String(label || '').trim().slice(0, 100) || 'Note';
    if (value === null && allowEmpty) {
      if (!Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error('Le pourcentage doit être compris entre 0 et 100.');
      return { label, value: null, weight: round2(weight) };
    }
    if (!Number.isFinite(value) || value < 0 || value > 20) throw new Error('La note doit être comprise entre 0 et 20.');
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) throw new Error('Le pourcentage doit être compris entre 0 et 100.');
    return { label, value: round2(value), weight: round2(weight) };
  }
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const subjCol = () => fb.collection(db, 'users', state.user.uid, 'subjects');
  const subjRef = id => fb.doc(db, 'users', state.user.uid, 'subjects', id);
  const store = {
    list: () => run(async () => {
      const snap = await fb.getDocs(fb.query(subjCol(), fb.orderBy('position')));
      return snap.docs.map(d => { const x = d.data(); return { id: d.id, name: x.name, credits: x.credits, position: x.position, grades: x.grades || [] }; });
    }),
    addSubject: (data, grades = []) => run(async () => {
      const position = state.subjects.reduce((m, s) => Math.max(m, s.position || 0), 0) + 1;
      const ref = await fb.addDoc(subjCol(), { ...data, position, grades });
      return { id: ref.id, ...data, position, grades };
    }),
    updateSubject: (s, data) => run(() => fb.updateDoc(subjRef(s.id), data)),
    deleteSubject: s => run(() => fb.deleteDoc(subjRef(s.id))),
    saveGrades: (s, grades) => run(() => fb.updateDoc(subjRef(s.id), { grades }))
  };

  // ---------- Calculs ----------
  const isGraded = g => g.value !== null && g.value !== undefined;
  function stats(s) {
    const graded = s.grades.filter(isGraded);
    const w = graded.reduce((a, g) => a + g.weight, 0);          // % déjà noté
    const planned = s.grades.reduce((a, g) => a + g.weight, 0);  // % prévu (noté + à venir)
    const pts = graded.reduce((a, g) => a + g.value * g.weight, 0);
    const avg = w > 0 ? pts / w : null;
    const target = getTarget();
    let need = null;
    if (w > 0 && w < 100) need = (target * 100 - pts) / (100 - w);
    return { w, planned, pts, avg, need, nGraded: graded.length, rest: Math.max(0, 100 - w), unplanned: Math.max(0, 100 - planned) };
  }
  function overall() {
    let sum = 0, cr = 0, n = 0;
    state.subjects.forEach(s => {
      const { avg } = stats(s);
      if (avg != null && s.credits > 0) { sum += avg * s.credits; cr += s.credits; n++; }
    });
    return { avg: cr > 0 ? sum / cr : null, credits: cr, n };
  }
  // ---------- Évolution dans le temps ----------
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !isNaN(Date.parse(v)) ? v : null;
  const fmtDate = (iso, long = false) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: '2-digit' });
  // Moyenne d'une matière / générale en ne comptant que les notes connues à la date D (les notes sans date comptent toujours)
  function avgAt(s, D) {
    const gs = s.grades.filter(g => isGraded(g) && (!g.date || g.date <= D));
    const w = gs.reduce((a, g) => a + g.weight, 0);
    return w > 0 ? gs.reduce((a, g) => a + g.value * g.weight, 0) / w : null;
  }
  function history(subjectId = 'all') {
    const subs = subjectId === 'all' ? state.subjects : state.subjects.filter(s => s.id === subjectId);
    const dates = [...new Set(subs.flatMap(s => s.grades.filter(g => isGraded(g) && g.date).map(g => g.date)))].sort();
    const undated = subs.some(s => s.grades.some(g => isGraded(g) && !g.date));
    if (!dates.length && undated) dates.push(todayISO());
    return dates.map(D => {
      let v;
      if (subjectId !== 'all') v = avgAt(subs[0], D);
      else {
        let sum = 0, cr = 0;
        subs.forEach(s => { const a = avgAt(s, D); if (a != null && s.credits > 0) { sum += a * s.credits; cr += s.credits; } });
        v = cr > 0 ? sum / cr : null;
      }
      return { date: D, value: v };
    }).filter(p => p.value != null);
  }

  function getTarget() {
    const v = parseNum($('#target').value);
    return Number.isFinite(v) && v >= 0 && v <= 20 ? v : 10;
  }

  // ---------- Dialogue ----------
  function dialog({ title, html, ok = 'Valider', danger = false, read }) {
    const d = $('#dlg');
    $('#dlg-title').textContent = title;
    $('#dlg-body').innerHTML = html;
    $('#dlg-error').textContent = '';
    const okBtn = $('#dlg-ok');
    okBtn.textContent = ok; okBtn.className = 'btn ' + (danger ? 'danger' : 'primary');
    return new Promise(resolve => {
      const onSubmit = async e => {
        if (e.submitter && e.submitter.value === 'cancel') return;
        e.preventDefault();
        try {
          const val = read ? await read() : true;
          cleanup(); d.close(); resolve(val);
        } catch (err) { $('#dlg-error').textContent = err.message; }
      };
      const onClose = () => { if (d.open) return; cleanup(); resolve(null); };
      const cleanup = () => { $('#dlg-form').removeEventListener('submit', onSubmit); d.removeEventListener('close', onClose); };
      $('#dlg-form').addEventListener('submit', onSubmit);
      d.addEventListener('close', onClose);
      d.showModal();
      const first = d.querySelector('#dlg-body input'); if (first) first.focus();
    });
  }
  const confirmBox = (title, text, ok = 'Supprimer') =>
    dialog({ title, html: `<p>${esc(text)}</p>`, ok, danger: true });

  // ---------- Authentification ----------
  function setMode(mode) {
    state.mode = mode;
    const reg = mode === 'register';
    $('#tab-login').setAttribute('aria-selected', String(!reg));
    $('#tab-register').setAttribute('aria-selected', String(reg));
    $('#name-field').hidden = !reg;
    $('#f-pass').autocomplete = reg ? 'new-password' : 'current-password';
    $('#auth-submit').textContent = reg ? 'Créer mon compte' : 'Se connecter';
    $('#auth-error').textContent = '';
  }
  function showAuth() {
    state.user = null; state.subjects = [];
    destroyCharts();
    $('#app').hidden = true; $('#auth').hidden = false;
  }
  async function showApp(u) {
    state.user = { uid: u.uid, email: u.email, name: u.displayName || state.pendingName || u.email.split('@')[0] };
    $('#auth').hidden = true; $('#app').hidden = false;
    $('#hello').textContent = `Bonjour ${state.user.name}`;
    state.subjects = [];
    render();
    try { state.subjects = await store.list(); render(); } catch (err) { toast(err.message); }
  }

  $('#tab-login').addEventListener('click', () => setMode('login'));
  $('#tab-register').addEventListener('click', () => setMode('register'));
  $('#auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!configured) return;
    const btn = $('#auth-submit'); btn.disabled = true;
    $('#auth-error').textContent = '';
    try {
      const email = $('#f-email').value.trim(), pass = $('#f-pass').value;
      if (state.mode === 'register') {
        const name = $('#f-name').value.trim().slice(0, 80);
        if (!name) throw new Error('Indique ton prénom.');
        if (pass.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères.');
        state.pendingName = name;
        const cred = await run(() => fb.createUserWithEmailAndPassword(auth, email, pass));
        await run(() => fb.updateProfile(cred.user, { displayName: name }));
        if (state.user) { state.user.name = name; $('#hello').textContent = `Bonjour ${name}`; }
      } else {
        await run(() => fb.signInWithEmailAndPassword(auth, email, pass));
      }
      $('#f-pass').value = '';
    } catch (err) { $('#auth-error').textContent = err.message; }
    finally { btn.disabled = false; }
  });
  $('#forgot').addEventListener('click', async () => {
    if (!configured) return;
    const ok = await dialog({
      title: 'Mot de passe oublié',
      html: `<p>Tu vas recevoir un e-mail pour choisir un nouveau mot de passe.</p>
             <label class="field">Adresse e-mail<input id="d-mail" type="email" autocomplete="email" value="${esc($('#f-email').value)}"></label>`,
      ok: 'Envoyer',
      read: async () => { await run(() => fb.sendPasswordResetEmail(auth, $('#d-mail').value.trim())); return true; }
    });
    if (ok) toast('E-mail envoyé (pense à vérifier tes spams).');
  });

  // ---------- Rendu ----------
  function destroyCharts() { state.charts.forEach(c => c.destroy()); state.charts = []; }

  function renderSummary() {
    const o = overall();
    $('#gpa').textContent = fmt(o.avg);
    $('#sum-meta').textContent = !state.subjects.length ? 'Ajoute une matière pour commencer.'
      : o.n === 0 ? 'Ajoute des notes pour voir ta moyenne.'
      : `${o.n} matière${o.n > 1 ? 's' : ''} notée${o.n > 1 ? 's' : ''} · ${fmtP(o.credits)} crédits ECTS pris en compte`;
    const target = getTarget();
    $('#sum-bars').innerHTML = state.subjects.map(s => {
      const { avg } = stats(s);
      const pct = avg == null ? 0 : avg / 20 * 100;
      return `<div class="bar"><span class="nm" title="${esc(s.name)}">${esc(s.name)}</span>
        <span class="tr"><span class="fl${avg != null && avg < target ? ' low' : ''}" style="width:${pct}%"></span><span class="tk" style="left:${target / 20 * 100}%"></span></span>
        <span class="vl">${fmt(avg)}</span></div>`;
    }).join('');
  }

  function needText(st) {
    if (st.w <= 0 || st.w >= 100) return '';
    const t = fmtP(getTarget());
    if (st.need <= 0) return `<p class="need">Objectif ${t}/20 <strong>déjà assuré</strong>, quoi qu'il arrive sur les ${fmtP(st.rest)} % restants.</p>`;
    if (st.need > 20) return `<p class="need">Objectif ${t}/20 hors d'atteinte : il faudrait ${fmt(st.need)}/20 sur les ${fmtP(st.rest)} % restants.</p>`;
    return `<p class="need">Pour finir à ${t}/20, il te faut <strong>${fmt(st.need)}/20</strong> en moyenne sur les ${fmtP(st.rest)} % restants.</p>`;
  }

  function sparkHTML(s) {
    const pts = history(s.id);
    if (pts.length < 2) return '';
    const W = 200, H = 44, vs = pts.map(p => p.value);
    const lo = Math.min(...vs, getTarget()) - 0.5, hi = Math.max(...vs, getTarget()) + 0.5;
    const ts = pts.map(p => Date.parse(p.date + 'T12:00:00')), t0 = ts[0], t1 = ts[ts.length - 1];
    const X = t => 4 + (t - t0) / ((t1 - t0) || 1) * (W - 8), Y = v => H - 4 - (v - lo) / (hi - lo) * (H - 8);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(ts[i]).toFixed(1)} ${Y(p.value).toFixed(1)}`).join('');
    const diff = vs[vs.length - 1] - vs[0];
    return `<div class="spark"><span>Évolution</span>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Évolution de la moyenne de ${esc(s.name)}"><line x1="0" x2="${W}" y1="${Y(getTarget()).toFixed(1)}" y2="${Y(getTarget()).toFixed(1)}" class="sp-t"/><path d="${d}" class="sp-l"/></svg>
      <strong class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))}</strong></div>`;
  }
  function cardHTML(s) {
    const st = stats(s);
    const over = st.planned > 100.001;
    const rows = s.grades.map((g, i) => `<tr${isGraded(g) ? '' : ' class="todo"'}>
        <td class="lbl"><span class="dot" style="background:${col(i)}"></span>${esc(g.label)}</td>
        <td class="n">${isGraded(g) ? fmt(g.value) : `<button class="pill" data-act="edit-grade" data-s="${s.id}" data-g="${g.id}">à venir</button>`}</td><td class="n">${fmtP(g.weight)} %</td>
        <td class="act"><button class="icon-btn" data-act="edit-grade" data-s="${s.id}" data-g="${g.id}" aria-label="Modifier ${esc(g.label)}">${ICON.edit}</button><button class="icon-btn" data-act="del-grade" data-s="${s.id}" data-g="${g.id}" aria-label="Supprimer ${esc(g.label)}">${ICON.del}</button></td>
      </tr>`).join('');
    return `<article class="card" data-id="${s.id}">
      <div class="card-head">
        <div><h3>${esc(s.name)}</h3><div class="sub">${fmtP(s.credits)} crédit${s.credits > 1 ? 's' : ''} ECTS · ${st.nGraded}/${s.grades.length} note${s.grades.length > 1 ? 's' : ''}</div></div>
        <div class="card-tools">
          <button class="icon-btn" data-act="edit-subject" data-s="${s.id}" aria-label="Modifier la matière">${ICON.edit}</button>
          <button class="icon-btn" data-act="del-subject" data-s="${s.id}" aria-label="Supprimer la matière">${ICON.del}</button>
        </div>
      </div>
      <div class="card-body">
        <div class="donut"><canvas id="c-${s.id}" role="img" aria-label="Répartition des notes de ${esc(s.name)}"></canvas>
          <div class="ctr"><span class="avg${st.avg != null && st.avg < getTarget() ? ' low' : ''}">${fmt(st.avg)}</span><small>/20</small></div></div>
        <div class="facts">
          <div>Déjà noté : <strong>${fmtP(st.w)} %</strong> sur 100 %${st.planned > st.w ? ` <span class="muted">(${fmtP(st.planned)} % prévu)</span>` : ''}</div>
          <div class="meter${over ? ' over' : ''}"><span style="width:${Math.min(100, st.w)}%"></span><i style="width:${Math.max(0, Math.min(100, st.planned) - Math.min(100, st.w))}%"></i></div>
          ${sparkHTML(s)}
          ${over ? `<p class="warn">Attention : le total des évaluations dépasse 100 % (${fmtP(st.planned)} %).</p>` : needText(st)}
        </div>
      </div>
      ${s.grades.length ? `<table><thead><tr><th>Évaluation</th><th class="n">Note /20</th><th class="n">Poids</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p class="none">Pas encore d\'évaluation. Ajoute la première ci-dessous.</p>'}
      <form class="inline" data-s="${s.id}" novalidate>
        <label>Évaluation<input name="label" maxlength="100" placeholder="ex. Partiel"></label>
        <label>Note /20<input name="value" inputmode="decimal" placeholder="14,5" required></label>
        <label>Poids %<input name="weight" inputmode="decimal" placeholder="${st.unplanned > 0 && st.unplanned < 100 ? fmtP(st.unplanned) : '40'}" required></label>
        <label>Date<input name="date" type="date" value="${todayISO()}" max="${todayISO()}"></label>
        <button class="btn primary" type="submit">Ajouter</button>
      </form>
    </article>`;
  }

  function donutConfig(s, { animate = true, forPdf = false } = {}) {
    const st = stats(s);
    const data = s.grades.map(g => g.weight);
    const colors = s.grades.map((g, i) => isGraded(g) ? col(i, forPdf) : col(i, forPdf) + '59');
    const labels = s.grades.map(g => g.label + (isGraded(g) ? '' : ' (à venir)'));
    if (st.unplanned > 0) { data.push(st.unplanned); colors.push(forPdf ? '#e3e8ee' : (isDark() ? '#2c4054' : REST)); labels.push('Non prévu'); }
    return {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: forPdf ? '#ffffff' : (isDark() ? '#172634' : '#ffffff'), borderWidth: 2 }] },
      options: {
        responsive: !forPdf, maintainAspectRatio: false, cutout: '64%',
        animation: animate ? { duration: 500 } : false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: !forPdf,
            callbacks: {
              label: ctx => {
                const g = s.grades[ctx.dataIndex];
                return g ? (isGraded(g) ? ` ${fmt(g.value)}/20 · ${fmtP(g.weight)} %` : ` à venir · ${fmtP(g.weight)} %`) : ` ${fmtP(st.unplanned)} % non prévus`;
              }
            }
          }
        }
      }
    };
  }

  // series : [{ label, color, points:[{date,value}] }] — une seule série = moyenne (points rouges sous l'objectif)
  function evoConfig(series, { forPdf = false } = {}) {
    const dark = !forPdf && isDark();
    const ink = dark ? '#9fb1c2' : '#506173', grid = dark ? '#26394b' : '#e3e8ee';
    const main = dark ? '#7fb7d6' : '#16324f';
    const target = getTarget();
    const single = series.length === 1;
    const ts = d => Date.parse(d + 'T12:00:00');
    const all = series.flatMap(s => s.points);
    const vals = all.map(p => p.value), xs = all.map(p => ts(p.date));
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const lo = Math.max(0, Math.floor(Math.min(target, ...vals) - 1)), hi = Math.min(20, Math.ceil(Math.max(target, ...vals) + 1));
    const pad = Math.max(864e5, (x1 - x0) * 0.03);
    const datasets = series.map(s => {
      const c = single ? main : s.color;
      return {
        label: s.label, data: s.points.map(p => ({ x: ts(p.date), y: p.value, date: p.date })),
        borderColor: c, backgroundColor: c,
        pointBackgroundColor: single ? s.points.map(p => p.value < target ? '#e4572e' : c) : c,
        pointRadius: forPdf ? 3 : (single ? 5 : 4), pointHoverRadius: 7, borderWidth: single ? 3 : 2.5, tension: 0
      };
    });
    datasets.push({ label: 'Objectif', data: [{ x: x0 - pad, y: target }, { x: x1 + pad, y: target }], borderColor: '#e4572e', borderDash: [6, 5], borderWidth: 1.5, pointRadius: 0, fill: false, isTarget: true });
    return {
      type: 'line',
      data: { datasets },
      options: {
        responsive: !forPdf, maintainAspectRatio: false, animation: forPdf ? false : { duration: 400 },
        interaction: single ? { mode: 'nearest', axis: 'x', intersect: false } : { mode: 'nearest', intersect: true },
        scales: {
          y: { min: lo, max: hi, ticks: { color: ink, stepSize: hi - lo > 8 ? 2 : 1 }, grid: { color: grid } },
          x: { type: 'linear', min: x0 - pad, max: x1 + pad, grid: { display: false },
               ticks: { color: ink, maxRotation: 0, maxTicksLimit: forPdf ? 8 : 6, callback: v => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) } }
        },
        plugins: {
          legend: { display: !single, position: 'bottom', labels: { color: ink, usePointStyle: true, pointStyle: 'circle', pointStyleWidth: 9, boxHeight: 7, padding: 10, filter: it => it.text !== 'Objectif', font: { size: forPdf || narrow() ? 11 : 12 } } },
          tooltip: { enabled: !forPdf, filter: it => !it.dataset.isTarget, callbacks: {
            title: items => fmtDate(items[0].raw.date, true),
            label: ctx => ` ${single ? 'Moyenne' : ctx.dataset.label} : ${fmt(ctx.parsed.y)}/20`
          } }
        }
      }
    };
  }
  const narrow = () => window.innerWidth < 600;
  const subjectSeries = () => state.subjects.map((s, i) => ({ label: s.name, color: col(i), points: history(s.id) })).filter(x => x.points.length);

  // Graphique en toile d'araignée : moyenne de chaque matière notée
  function radarConfig({ forPdf = false } = {}) {
    const dark = !forPdf && isDark();
    const ink = dark ? '#c9d6e2' : '#26394b', grid = dark ? '#2c4054' : '#dbe3ea';
    const main = dark ? '#7fb7d6' : '#16324f';
    const rows = state.subjects.map(s => ({ s, a: stats(s).avg })).filter(x => x.a != null);
    const target = getTarget();
    const max = !forPdf && narrow() ? 11 : 16;
    const wrap = t => { const w = t.split(' '), out = []; let cur = ''; for (const x of w) { if ((cur + ' ' + x).trim().length > max && cur) { out.push(cur); cur = x; } else cur = (cur + ' ' + x).trim(); } out.push(cur); return out.length > 4 ? [...out.slice(0, 3), out.slice(3).join(' ').slice(0, max - 1) + '…'] : out; };
    return {
      type: 'radar',
      data: {
        labels: rows.map(r => wrap(r.s.name)),
        datasets: [
          { label: 'Moyenne', data: rows.map(r => round2(r.a)), borderColor: main, backgroundColor: main + '33', borderWidth: 2.5,
            pointBackgroundColor: rows.map(r => r.a < target ? '#e4572e' : main), pointRadius: forPdf ? 3 : 4, pointHoverRadius: 6 },
          { label: 'Objectif', data: rows.map(() => target), borderColor: '#e4572e', borderDash: [6, 5], borderWidth: 1.5, pointRadius: 0, backgroundColor: 'transparent' }
        ]
      },
      options: {
        responsive: !forPdf, maintainAspectRatio: false, animation: forPdf ? false : { duration: 400 },
        scales: { r: { min: 0, max: 20, ticks: { stepSize: 5, color: dark ? '#9fb1c2' : '#6a7a89', backdropColor: 'transparent', font: { size: 11 } },
          grid: { color: grid }, angleLines: { color: grid }, pointLabels: { color: ink, padding: 4, font: { size: !forPdf && narrow() ? 10 : 12, weight: '600' } } } },
        layout: { padding: !forPdf && narrow() ? { left: 22, right: 22, top: 4, bottom: 4 } : 8 },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: !forPdf, filter: it => it.datasetIndex === 0, callbacks: {
            title: items => rows[items[0].dataIndex].s.name,
            label: ctx => ` ${fmt(ctx.parsed.r)}/20`
          } }
        }
      },
      _count: rows.length
    };
  }

  function renderEvolution() {
    const sel = $('#evo-subject');
    const cur = sel.value || 'all';
    sel.innerHTML = '<option value="all">Moyenne générale</option><option value="subjects">Toutes les matières</option>'
      + state.subjects.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    sel.value = [...sel.options].some(o => o.value === cur) ? cur : 'all';
    $('#charts').hidden = !state.subjects.some(s => s.grades.some(isGraded));
    const box = $('#evo-fig');
    if (state.evo) { state.evo.destroy(); state.evo = null; }
    if (sel.value === 'subjects') {
      const series = subjectSeries();
      const n = series.reduce((a, s) => a + s.points.length, 0);
      if (!series.length) { box.hidden = true; $('#evo-note').textContent = ''; return; }
      box.hidden = false;
      $('#evo-note').textContent = `Un point par matière à chaque nouvelle note (${n} points sur ${series.length} matière${series.length > 1 ? 's' : ''}). Clique sur un nom dans la légende pour le masquer.`;
      box.classList.add('multi');
      if (window.Chart) state.evo = new Chart($('#evo-canvas'), evoConfig(series));
      return;
    }
    box.classList.remove('multi');
    const pts = history(sel.value);
    if (pts.length < 2) {
      box.hidden = true;
      $('#evo-note').textContent = pts.length ? `Un seul point pour l'instant (${fmtDate(pts[0].date, true)} : ${fmt(pts[0].value)}/20). Chaque note ajoutée à une autre date, ou chaque nouvel import Aurion, ajoutera un point.` : 'Pas encore de note dans cette matière.';
      return;
    }
    box.hidden = false;
    const first = pts[0].value, last = pts[pts.length - 1].value, diff = last - first;
    $('#evo-note').innerHTML = `${pts.length} points, du ${fmtDate(pts[0].date, true)} au ${fmtDate(pts[pts.length - 1].date, true)} : <strong class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))} pt</strong>`;
    if (window.Chart) state.evo = new Chart($('#evo-canvas'), evoConfig([{ label: 'Moyenne', points: pts }]));
  }
  function renderRadar() {
    if (state.radar) { state.radar.destroy(); state.radar = null; }
    const { _count, ...cfg } = radarConfig();
    const ok = _count >= 3;
    $('#radar-fig').hidden = !ok;
    const below = state.subjects.filter(s => { const a = stats(s).avg; return a != null && a < getTarget(); }).map(s => s.name);
    $('#radar-note').textContent = !ok ? 'Il faut au moins 3 matières notées pour dessiner la toile.'
      : below.length ? `Sous l'objectif : ${below.join(', ')}.` : `Toutes tes matières notées sont au-dessus de l'objectif (${fmtP(getTarget())}/20).`;
    if (ok && window.Chart) state.radar = new Chart($('#radar-canvas'), cfg);
  }
  $('#evo-subject').addEventListener('change', renderEvolution);
  $('#sems').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.getAttribute('aria-disabled') === 'true') toast(`${b.dataset.sem} : bientôt disponible (pondérations à venir).`);
  });

  function render() {
    destroyCharts();
    renderSummary();
    renderEvolution();
    renderRadar();
    $('#empty').hidden = state.subjects.length > 0;
    $('#cards').innerHTML = state.subjects.map(cardHTML).join('');
    const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (window.Chart) state.subjects.forEach(s => {
      const cv = document.getElementById('c-' + s.id);
      if (cv) state.charts.push(new Chart(cv, donutConfig(s, { animate })));
    });
  }

  // ---------- Actions ----------
  const findSubject = id => state.subjects.find(s => String(s.id) === String(id));

  $('#add-subject').addEventListener('submit', async e => {
    e.preventDefault();
    $('#subject-error').textContent = '';
    try {
      const subject = await store.addSubject(checkSubject($('#s-name').value, parseNum($('#s-credits').value || 1)));
      state.subjects.push(subject);
      $('#s-name').value = '';
      render(); toast('Matière ajoutée');
      document.querySelector(`.card[data-id="${subject.id}"] input[name=label]`)?.focus();
    } catch (err) { $('#subject-error').textContent = err.message; }
  });

  $('#cards').addEventListener('submit', async e => {
    const f = e.target.closest('form.inline'); if (!f) return;
    e.preventDefault();
    const s = findSubject(f.dataset.s);
    const F = n => f.elements.namedItem(n);
    try {
      const body = { label: F('label').value, value: parseNum(F('value').value), weight: parseNum(F('weight').value) };
      if (!F('value').value.trim() || !F('weight').value.trim()) throw new Error('Renseigne la note et son pourcentage.');
      const grade = { id: newId(), ...checkGrade(body.label, body.value, body.weight), date: validDate(F('date').value) || todayISO() };
      if (s.grades.length >= 50) throw new Error('50 notes maximum par matière.');
      const grades = [...s.grades, grade];
      await store.saveGrades(s, grades);
      s.grades = grades;
      render(); toast('Note ajoutée');
      document.querySelector(`.card[data-id="${s.id}"] input[name=label]`)?.focus();
    } catch (err) { toast(err.message); }
  });

  $('#cards').addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const s = findSubject(b.dataset.s);
    const g = s && s.grades.find(x => String(x.id) === b.dataset.g);
    try {
      if (b.dataset.act === 'edit-subject') {
        const ok = await dialog({
          title: 'Modifier la matière',
          html: `<label class="field">Nom<input id="d-name" maxlength="100" value="${esc(s.name)}"></label>
                 <label class="field">Crédits ECTS<input id="d-cred" inputmode="decimal" value="${s.credits}"></label>`,
          read: async () => {
            const data = checkSubject($('#d-name').value, parseNum($('#d-cred').value));
            await store.updateSubject(s, data);
            Object.assign(s, data);
            return true;
          }
        });
        if (ok) { render(); toast('Matière modifiée'); }
      } else if (b.dataset.act === 'del-subject') {
        if (await confirmBox('Supprimer la matière ?', `« ${s.name} » et ses ${s.grades.length} note(s) seront supprimées.`)) {
          await store.deleteSubject(s);
          state.subjects = state.subjects.filter(x => x !== s);
          render(); toast('Matière supprimée');
        }
      } else if (b.dataset.act === 'edit-grade') {
        const ok = await dialog({
          title: 'Modifier la note',
          html: `<label class="field">Évaluation<input id="d-label" maxlength="100" value="${esc(g.label)}"></label>
                 <label class="field">Note /20 <small>(laisse vide si pas encore reçue)</small><input id="d-val" inputmode="decimal" value="${isGraded(g) ? g.value : ''}"></label>
                 <label class="field">Poids %<input id="d-w" inputmode="decimal" value="${g.weight}"></label>
                 <label class="field">Date de la note<input id="d-date" type="date" value="${g.date || todayISO()}" max="${todayISO()}"></label>`,
          read: async () => {
            const raw = $('#d-val').value.trim();
            const data = checkGrade($('#d-label').value, raw === '' ? null : parseNum(raw), parseNum($('#d-w').value), true);
            const date = data.value === null ? null : (validDate($('#d-date').value) || todayISO());
            const grades = s.grades.map(x => x === g ? { ...g, ...data, date } : x);
            await store.saveGrades(s, grades);
            s.grades = grades;
            return true;
          }
        });
        if (ok) { render(); toast('Note modifiée'); }
      } else if (b.dataset.act === 'del-grade') {
        if (await confirmBox('Supprimer la note ?', `« ${g.label} » (${fmt(g.value)}/20, ${fmtP(g.weight)} %) sera supprimée.`)) {
          const grades = s.grades.filter(x => x !== g);
          await store.saveGrades(s, grades);
          s.grades = grades;
          render(); toast('Note supprimée');
        }
      }
    } catch (err) { toast(err.message); }
  });

  $('#target').addEventListener('input', () => {
    try { localStorage.setItem('objectif', $('#target').value); } catch { /* ignoré */ }
    render();
  });
  try { const t = localStorage.getItem('objectif'); if (t) $('#target').value = t; } catch { /* ignoré */ }

  // Menu du compte
  $('#btn-menu').addEventListener('click', e => {
    e.stopPropagation();
    let m = $('.menu');
    if (m) { m.remove(); return; }
    m = document.createElement('div'); m.className = 'menu';
    m.innerHTML = `<button data-m="logout">Se déconnecter</button><button data-m="delete" class="del">Supprimer mon compte</button>`;
    document.body.appendChild(m);
    m.addEventListener('click', async ev => {
      const k = ev.target.dataset.m; m.remove();
      try {
        if (k === 'logout') { await run(() => fb.signOut(auth)); setMode('login'); }
        if (k === 'delete') {
          const ok = await dialog({
            title: 'Supprimer mon compte', ok: 'Supprimer définitivement', danger: true,
            html: `<p>Toutes tes matières et notes seront effacées. Confirme avec ton mot de passe.</p>
                   <label class="field">Mot de passe<input id="d-pass" type="password" autocomplete="current-password"></label>`,
            read: async () => {
              const u = auth.currentUser;
              await run(() => fb.reauthenticateWithCredential(u, fb.EmailAuthProvider.credential(u.email, $('#d-pass').value)));
              await run(async () => {
                const batch = fb.writeBatch(db);
                state.subjects.forEach(s => batch.delete(subjRef(s.id)));
                await batch.commit();
              });
              await run(() => fb.deleteUser(u));
              return true;
            }
          });
          if (ok) { setMode('register'); toast('Compte supprimé'); }
        }
      } catch (err) { toast(err.message); }
    });
  });
  document.addEventListener('click', e => { const m = $('.menu'); if (m && !m.contains(e.target)) m.remove(); });


  // ---------- Modèles de semestre ----------
  function openTemplate() {
    const tpl = (window.SEMESTER_TEMPLATES || [])[0];
    if (!tpl) return toast('Aucun modèle disponible.');
    const have = new Set(state.subjects.map(s => s.name.trim().toLowerCase()));
    const rows = tpl.subjects.map((m, i) => {
      const exists = have.has(m.name.toLowerCase());
      const ects = m.ects ?? m.ectsProvisoire;
      const evals = m.evals.length ? m.evals.map(e => `${esc(e[0])} (${fmtP(e[1])} %)`).join(' · ') : 'Évaluations à compléter';
      return `<li class="tpl-item${exists ? ' done' : ''}">
        <label class="tpl-check"><input type="checkbox" data-i="${i}" ${exists ? 'disabled' : 'checked'}>
          <span><strong>${esc(m.name)}</strong>${m.code ? ` <span class="muted">${esc(m.code)}</span>` : ''}${exists ? ' <span class="muted">— déjà ajoutée</span>' : ''}
          <small>${evals}</small></span></label>
        <label class="tpl-ects">ECTS<input data-e="${i}" inputmode="decimal" value="${ects}" ${exists ? 'disabled' : ''}>
          ${m.ects == null ? '<em>à confirmer</em>' : '<em class="ok">confirmé</em>'}</label>
      </li>`;
    }).join('');
    $('#dlg').classList.add('wide');
    return dialog({
      title: tpl.name, ok: 'Ajouter les matières',
      html: `<p>${esc(tpl.note)}</p><ul class="tpl">${rows}</ul>
             <p class="muted small">Les évaluations sont créées sans note (« à venir ») : clique dessus pour saisir ta note dès que tu la reçois.</p>`,
      read: async () => {
        const picks = [...document.querySelectorAll('.tpl input[type=checkbox]:checked')].map(c => Number(c.dataset.i));
        if (!picks.length) throw new Error('Sélectionne au moins une matière.');
        const items = picks.map(i => {
          const m = tpl.subjects[i];
          const data = checkSubject(m.name, parseNum(document.querySelector(`.tpl input[data-e="${i}"]`).value));
          const grades = m.evals.map(([label, weight]) => ({ id: newId(), label, value: null, weight }));
          return { data, grades };
        });
        let n = 0;
        for (const it of items) { state.subjects.push(await store.addSubject(it.data, it.grades)); n++; }
        return n;
      }
    }).then(n => { $('#dlg').classList.remove('wide'); if (n) { render(); toast(`${n} matière${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}`); } });
  }
  $('#btn-template').addEventListener('click', openTemplate);
  $('#empty-template').addEventListener('click', openTemplate);

  // ---------- Import Aurion (CSV « Mes notes aux épreuves ») ----------
  const norm = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const FIX = [[/Contr�le/g, 'Contrôle'], [/�preuve/g, 'épreuve'], [/�valuation/g, 'évaluation'], [/Ma�trise/g, 'Maîtrise'], [/�/g, 'é']];
  const fixText = t => FIX.reduce((a, [r, v]) => a.replace(r, v), t);
  const TYPE_WORDS = {
    MIDT: ['partiel', 'midterm', 'mi parcours'], MCQ: ['qcm', 'mcq', 'quiz'], EXERC: ['exercice', 'test', 'devoir', 'grammar'],
    CONT: ['controle continu', 'cont', 'presentation', 'cc'], PARTN: ['participation'], GPROJ: ['groupe', 'projet', 'presentation orale'],
    EXAM: ['final', 'examen'], FINAL: ['final', 'examen'], ORAL: ['oral', 'presentation'], REPORT: ['rapport'], PROJ: ['projet']
  };
  function decodeFile(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch { return new TextDecoder('windows-1252').decode(buf); }
  }
  const ACCENTS = { efficacite: 'efficacité', economique: 'économique', economie: 'économie', methodes: 'méthodes', mathematiques: 'mathématiques',
    decision: 'décision', '2eme': '2ème', '3eme': '3ème', '1ere': '1ère', strategie: 'stratégie', ethique: 'éthique', societe: 'société',
    developpement: 'développement', reseaux: 'réseaux', general: 'général', generale: 'générale', creativite: 'créativité', seminaire: 'séminaire',
    responsabilite: 'responsabilité', competences: 'compétences', bureautiques: 'bureautiques', francais: 'français', allemand: 'allemand' };
  const prettyCourse = t => { const x = fixText(t).replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().replace(/[a-z0-9]+/g, w => ACCENTS[w] || w).replace(/\bba s(\d)\b/g, 'BA S$1').replace(/\b(i{1,3})$/, m => m.toUpperCase()); return x.charAt(0).toUpperCase() + x.slice(1); };
  function parseAurion(text) {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
    if (!lines.length || !/^"?note"?;/i.test(lines[0].trim())) throw new Error("Ce fichier ne ressemble pas à l'export Aurion « Mes notes aux épreuves » (CSV).");
    const rows = [], skipped = [];
    for (const line of lines.slice(1)) {
      const c = line.split(';').map(x => x.trim().replace(/^"(.*)"$/, '$1'));
      const [noteS, coefS, , code, libelle = ''] = c;
      if (!code) continue;
      const parts = code.split('_');
      const key = parts[parts.length - 1], course = parts[parts.length - 2];
      const sem = (parts.find(x => /^S\d$/.test(x)) || '').toUpperCase();
      const lib = fixText(libelle).split(' - ').map(x => x.trim()).filter(Boolean);
      const evalLabel = lib.length > 1 ? lib[lib.length - 1] : key;
      const courseName = prettyCourse((lib[0] || course).replace(new RegExp('\\s*' + course + '\\s*$'), ''));
      const value = Number(String(noteS).replace(',', '.'));
      const weight = Number(String(coefS).replace(',', '.'));
      if (!/^\d{3,4}$/.test(course) || !key) { skipped.push(libelle || code); continue; }
      if (!Number.isFinite(value) || value < 0 || value > 20 || !Number.isFinite(weight) || weight <= 0 || weight > 100) {
        skipped.push(`${courseName} – ${evalLabel} (${noteS.trim() || 'sans note'})`); continue;
      }
      rows.push({ sem, course, key, src: `${course}_${key}`, courseName, evalLabel, value: round2(value), weight: round2(weight) });
    }
    return { rows, skipped };
  }
  function tplByCode(code) {
    for (const t of window.SEMESTER_TEMPLATES || []) { const m = t.subjects.find(x => x.code === code); if (m) return m; }
    return null;
  }
  // Construit le plan d'import sans rien enregistrer
  function planImport(rows) {
    const importDate = todayISO();
    const work = new Map(); // id (ou "new:<code>") -> { subject, grades, isNew, tpl }
    const changes = [];
    const tplNames = new Map();
    for (const r of rows) {
      const tpl = tplByCode(r.course);
      let entry = [...work.values()].find(e => e.code === r.course);
      if (!entry) {
        let subj = state.subjects.find(s => s.grades.some(g => g.src && g.src.split('_')[0] === r.course))
          || (tpl && state.subjects.find(s => norm(s.name) === norm(tpl.name)))
          || state.subjects.find(s => norm(s.name) === norm(r.courseName));
        if (subj) entry = { code: r.course, subject: subj, grades: subj.grades.map(g => ({ ...g })), isNew: false, tpl };
        else entry = {
          code: r.course, isNew: true, tpl,
          subject: { name: tpl ? tpl.name : r.courseName, credits: tpl ? (tpl.ects ?? tpl.ectsProvisoire) : 2 },
          grades: tpl ? tpl.evals.map(([label, weight]) => ({ id: newId(), label, value: null, weight })) : []
        };
        work.set(r.course, entry);
      }
      const G = entry.grades;
      let g = G.find(x => x.src === r.src);
      if (!g && entry.tpl) {
        const te = entry.tpl.evals.find(e => e[2] === r.key);
        if (te) g = G.find(x => !x.src && norm(x.label) === norm(te[0]));
      }
      if (!g) {
        const type = r.key.replace(/\d+$/, '');
        const words = TYPE_WORDS[type] || [];
        const fits = x => !x.src && x.value == null && words.some(w => norm(x.label).includes(w));
        g = G.find(x => fits(x) && x.weight === r.weight) || null;
      }
      let action;
      if (g) {
        action = g.value == null ? 'new' : (g.value === r.value && g.weight === r.weight ? 'same' : 'update');
        changes.push({ entry, r, action, old: g.value, label: g.label });
        if (action !== 'same') g.date = importDate;
        Object.assign(g, { value: r.value, weight: r.weight, src: r.src });
      } else {
        G.push({ id: newId(), label: r.evalLabel, value: r.value, weight: r.weight, src: r.src, date: importDate });
        changes.push({ entry, r, action: 'new', old: null, label: r.evalLabel });
      }
    }
    return { entries: [...work.values()], changes };
  }

  async function openImport() {
    const sems = ['S1', 'S2'];
    const parsed = await dialog({
      title: 'Importer mes notes depuis Aurion',
      ok: 'Analyser le fichier',
      html: `<p>Dans Aurion : <strong>Ma scolarité → Cours → Mes notes aux épreuves – année courante</strong>, puis <strong>Exporter → CSV pour Microsoft Excel</strong>. Choisis ensuite ce fichier ici. Tu peux réimporter un nouvel export à chaque nouvelle note : rien n'est ajouté en double.</p>
        <button type="button" class="link tuto-link" data-tuto>▶ Voir le tutoriel vidéo (1 min)</button>
        <label class="field">Semestre<select id="imp-sem">${sems.map(x => `<option value="${x}">${x}</option>`).join('')}</select></label>
        <label class="field">Fichier exporté d'Aurion <small>(même si son nom ne finit pas par .csv)</small><input id="imp-file" type="file"></label>`,
      read: async () => {
        const f = $('#imp-file').files[0];
        if (!f) throw new Error('Choisis le fichier CSV exporté depuis Aurion.');
        if (f.size > 2e6) throw new Error('Fichier trop volumineux.');
        const { rows, skipped } = parseAurion(decodeFile(await f.arrayBuffer()));
        const sem = $('#imp-sem').value;
        const keep = rows.filter(r => r.sem === sem || r.sem === '');
        if (!keep.length) throw new Error(`Aucune note du ${sem} dans ce fichier.`);
        return { rows: keep, skipped, sem, other: rows.length - keep.length, annual: [...new Set(keep.filter(r => r.sem === '').map(r => r.courseName))] };
      }
    });
    if (!parsed) return;
    const plan = planImport(parsed.rows);
    const label = { new: 'nouvelle', update: 'mise à jour', same: 'inchangée' };
    const count = k => plan.changes.filter(c => c.action === k).length;
    const groups = plan.entries.map((e, i) => {
      const lines = plan.changes.filter(c => c.entry === e).map(c => `<tr class="${c.action}"><td>${esc(c.label)}</td><td class="n">${fmt(c.r.value)}</td><td class="n">${fmtP(c.r.weight)} %</td>
        <td>${label[c.action]}${c.action === 'update' ? ` <span class="muted">(${fmt(c.old)})</span>` : ''}</td></tr>`).join('');
      return `<li><div class="imp-h"><strong>${esc(e.subject.name)}</strong>${e.isNew ? `<span class="tag">nouvelle matière</span>
        <label class="imp-ects">ECTS <input data-n="${i}" inputmode="decimal" value="${e.subject.credits}"></label>` : ''}</div>
        <table class="imp-t"><tbody>${lines}</tbody></table></li>`;
    }).join('');
    $('#dlg').classList.add('wide');
    const n = await dialog({
      title: `Import Aurion – ${parsed.sem}`,
      ok: count('new') + count('update') ? 'Enregistrer les notes' : 'Fermer',
      html: `<p><strong>${count('new')}</strong> nouvelle(s) note(s), <strong>${count('update')}</strong> mise(s) à jour, ${count('same')} inchangée(s).</p>
        ${parsed.skipped.length ? `<p class="warn">Ignoré : ${parsed.skipped.map(esc).join(' · ')}</p>` : ''}
        ${parsed.other ? `<p class="muted small">${parsed.other} note(s) d'un autre semestre ignorée(s).</p>` : ''}
        ${parsed.annual.length ? `<p class="muted small">Cours sans semestre dans Aurion (cours annuel ou mutualisé), inclus ici : ${parsed.annual.map(esc).join(', ')}.</p>` : ''}
        <ul class="imp">${groups}</ul>
        ${plan.entries.some(e => e.isNew) ? '<p class="muted small">Les nouvelles matières sont créées avec le modèle du S1 quand il existe. Vérifie leurs crédits ECTS.</p>' : ''}`,
      read: async () => {
        let saved = 0;
        for (const [i, e] of plan.entries.entries()) {
          const changed = plan.changes.some(c => c.entry === e && c.action !== 'same');
          if (!changed) continue;
          if (e.grades.length > 50) throw new Error(`Trop d'évaluations pour ${e.subject.name}.`);
          if (e.isNew) {
            const data = checkSubject(e.subject.name, parseNum(document.querySelector(`.imp input[data-n="${i}"]`).value));
            state.subjects.push(await store.addSubject(data, e.grades));
          } else {
            await store.saveGrades(e.subject, e.grades);
            e.subject.grades = e.grades;
          }
          saved++;
        }
        return saved;
      }
    });
    $('#dlg').classList.remove('wide');
    if (n) { render(); toast(`Notes importées (${n} matière${n > 1 ? 's' : ''})`); }
  }
  // Tutoriel vidéo
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-tuto]')) return;
    e.preventDefault();
    $('#tuto').showModal();
    $('#tuto-video').play().catch(() => {});
  });
  const closeTuto = () => { $('#tuto-video').pause(); if ($('#tuto').open) $('#tuto').close(); };
  $('#tuto-close').addEventListener('click', closeTuto);
  $('#tuto').addEventListener('close', () => $('#tuto-video').pause());
  $('#tuto').addEventListener('click', e => { if (e.target === $('#tuto')) closeTuto(); });

  $('#btn-import').addEventListener('click', () => openImport().catch(err => toast(err.message)));
  $('#empty-import').addEventListener('click', () => openImport().catch(err => toast(err.message)));

  // ---------- Export PDF ----------
  function donutImage(s) {
    const cv = document.createElement('canvas');
    cv.width = 360; cv.height = 360;
    cv.style.cssText = 'position:fixed;left:-9999px;top:0;width:360px;height:360px';
    document.body.appendChild(cv);
    const ch = new Chart(cv, donutConfig(s, { animate: false, forPdf: true }));
    const url = cv.toDataURL('image/png');
    ch.destroy(); cv.remove();
    return url;
  }
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const pdfNum = (n, d = 2) => fmt(n, d).replace(/ | /g, ' ');

  $('#btn-pdf').addEventListener('click', () => {
    if (!window.jspdf) return toast("L'export PDF n'a pas pu se charger.");
    if (!state.subjects.length) return toast('Ajoute au moins une matière avant d’exporter.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 16;
    const deep = hexRgb('#16324f'), acc = hexRgb('#e4572e');
    const o = overall();
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    // En-tête
    doc.setFillColor(...deep); doc.rect(0, 0, W, 44, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('Relevé de moyennes', M, 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    doc.text(`${state.user.name} - ${state.user.email}`, M, 26);
    doc.text(`Édité le ${today}`, M, 32);
    doc.setFontSize(10); doc.text('Moyenne générale', W - M, 15, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26);
    doc.text(`${pdfNum(o.avg)} /20`, W - M, 27, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`${o.n} matière(s) - ${pdfNum(o.credits, 1)} ECTS`, W - M, 34, { align: 'right' });

    // Récapitulatif
    doc.setTextColor(20);
    doc.autoTable({
      startY: 52, margin: { left: M, right: M },
      head: [['Matière', 'ECTS', '% noté', 'Moyenne /20']],
      body: state.subjects.map(s => { const st = stats(s); return [s.name, pdfNum(s.credits, 1), `${fmtP(st.w)} %`, pdfNum(st.avg)]; }),
      foot: [['Moyenne générale (pondérée ECTS)', { content: pdfNum(o.credits, 1), styles: { halign: 'right' } }, '', { content: pdfNum(o.avg), styles: { halign: 'right' } }]],
      headStyles: { fillColor: deep }, footStyles: { fillColor: [235, 240, 245], textColor: 20 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      styles: { fontSize: 10, cellPadding: 2.4 }
    });

    // Évolution de la moyenne générale
    const evoPts = history('all');
    let yEvo = doc.lastAutoTable.finalY + 10;
    if (window.Chart && evoPts.length >= 2) {
      if (yEvo + 70 > 285) { doc.addPage(); yEvo = 18; }
      const cv = document.createElement('canvas');
      cv.width = 1000; cv.height = 360; cv.style.cssText = 'position:fixed;left:-9999px;top:0;width:1000px;height:360px';
      document.body.appendChild(cv);
      const ch = new Chart(cv, evoConfig([{ label: 'Moyenne générale', points: evoPts }], { forPdf: true }));
      const img = cv.toDataURL('image/png'); ch.destroy(); cv.remove();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20);
      doc.text('Évolution de la moyenne générale', M, yEvo);
      doc.addImage(img, 'PNG', M, yEvo + 3, W - 2 * M, (W - 2 * M) * 0.36);
      doc.lastAutoTable.finalY = yEvo + 3 + (W - 2 * M) * 0.36;
    }

    // Détail par matière
    let y = doc.lastAutoTable.finalY + 12;
    state.subjects.forEach(s => {
      const st = stats(s);
      const need = 62 + Math.max(1, s.grades.length) * 8;
      if (y + Math.min(need, 120) > 285) { doc.addPage(); y = 18; }
      doc.setDrawColor(220); doc.line(M, y - 4, W - M, y - 4);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20);
      doc.text(doc.splitTextToSize(s.name, 120), M, y + 2);
      doc.setFontSize(18);
      doc.setTextColor(...(st.avg != null && st.avg < getTarget() ? acc : deep));
      doc.text(`${pdfNum(st.avg)} /20`, W - M, y + 3, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(90);
      doc.text(`${pdfNum(s.credits, 1)} ECTS - ${fmtP(st.w)} % des évaluations notées`, M, y + 9);

      const top = y + 14;
      if (window.Chart && s.grades.length) doc.addImage(donutImage(s), 'PNG', M, top, 44, 44);
      doc.autoTable({
        startY: top, margin: { left: M + 52, right: M },
        head: [['', 'Évaluation', 'Note /20', 'Poids']],
        body: s.grades.length ? s.grades.map(g => ['', g.label, isGraded(g) ? pdfNum(g.value) : 'à venir', `${fmtP(g.weight)} %`])
          .concat(st.unplanned > 0 ? [['', 'Non prévu', '-', `${fmtP(st.unplanned)} %`]] : [])
          : [['', 'Aucune note', '-', '-']],
        headStyles: { fillColor: [235, 240, 245], textColor: 40 },
        styles: { fontSize: 9.5, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 6 }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        didDrawCell: d => {
          if (d.section === 'body' && d.column.index === 0) {
            const g = s.grades[d.row.index];
            const c = g ? (isGraded(g) ? hexRgb(PALETTE[d.row.index % PALETTE.length]) : hexRgb(PALETTE[d.row.index % PALETTE.length]).map(v => Math.round(v * 0.35 + 255 * 0.65))) : (s.grades.length ? [227, 232, 238] : null);
            if (c) { doc.setFillColor(...c); doc.rect(d.cell.x + 1.5, d.cell.y + d.cell.height / 2 - 1.5, 3, 3, 'F'); }
          }
        }
      });
      let endY = Math.max(doc.lastAutoTable.finalY, top + 46);
      if (st.w > 0 && st.w < 100 && st.need != null) {
        doc.setFontSize(9); doc.setTextColor(90);
        const t = fmtP(getTarget());
        const msg = st.need <= 0 ? `Objectif ${t}/20 déjà assuré.`
          : st.need > 20 ? `Objectif ${t}/20 hors d'atteinte (il faudrait ${pdfNum(st.need)}/20).`
          : `Pour finir à ${t}/20 : ${pdfNum(st.need)}/20 en moyenne sur les ${fmtP(st.rest)} % restants.`;
        doc.text(msg, M, endY + 4); endY += 6;
      }
      y = endY + 14;
    });

    // Pied de page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i); doc.setFontSize(8); doc.setTextColor(140);
      doc.text('Document indicatif généré par Moyennes IESEG - seul le relevé officiel de l\'école fait foi.', M, 290);
      doc.text(`${i} / ${pages}`, W - M, 290, { align: 'right' });
    }
    const safe = state.user.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_');
    doc.save(`moyennes_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast('PDF téléchargé');
  });

  // ---------- Démarrage ----------
  setMode('login');
  if (!configured) {
    showAuth();
    $('#setup').hidden = false;
    $('#auth-submit').disabled = true;
  } else {
    fb.setPersistence(auth, fb.browserLocalPersistence).catch(() => {});
    fb.onAuthStateChanged(auth, u => { if (u) showApp(u); else showAuth(); });
  }
}
