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
  function checkGrade(label, value, weight) {
    label = String(label || '').trim().slice(0, 100) || 'Note';
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
    addSubject: data => run(async () => {
      const position = state.subjects.reduce((m, s) => Math.max(m, s.position || 0), 0) + 1;
      const ref = await fb.addDoc(subjCol(), { ...data, position, grades: [] });
      return { id: ref.id, ...data, position, grades: [] };
    }),
    updateSubject: (s, data) => run(() => fb.updateDoc(subjRef(s.id), data)),
    deleteSubject: s => run(() => fb.deleteDoc(subjRef(s.id))),
    saveGrades: (s, grades) => run(() => fb.updateDoc(subjRef(s.id), { grades }))
  };

  // ---------- Calculs ----------
  function stats(s) {
    const w = s.grades.reduce((a, g) => a + g.weight, 0);
    const pts = s.grades.reduce((a, g) => a + g.value * g.weight, 0);
    const avg = w > 0 ? pts / w : null;
    const target = getTarget();
    let need = null;
    if (w > 0 && w < 100) need = (target * 100 - pts) / (100 - w);
    return { w, pts, avg, need, rest: Math.max(0, 100 - w) };
  }
  function overall() {
    let sum = 0, cr = 0, n = 0;
    state.subjects.forEach(s => {
      const { avg } = stats(s);
      if (avg != null && s.credits > 0) { sum += avg * s.credits; cr += s.credits; n++; }
    });
    return { avg: cr > 0 ? sum / cr : null, credits: cr, n };
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
      const onClose = () => { cleanup(); resolve(null); };
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

  function cardHTML(s) {
    const st = stats(s);
    const over = st.w > 100.001;
    const rows = s.grades.map((g, i) => `<tr>
        <td class="lbl"><span class="dot" style="background:${col(i)}"></span>${esc(g.label)}</td>
        <td class="n">${fmt(g.value)}</td><td class="n">${fmtP(g.weight)} %</td>
        <td class="act"><button class="icon-btn" data-act="edit-grade" data-s="${s.id}" data-g="${g.id}" aria-label="Modifier ${esc(g.label)}">${ICON.edit}</button><button class="icon-btn" data-act="del-grade" data-s="${s.id}" data-g="${g.id}" aria-label="Supprimer ${esc(g.label)}">${ICON.del}</button></td>
      </tr>`).join('');
    return `<article class="card" data-id="${s.id}">
      <div class="card-head">
        <div><h3>${esc(s.name)}</h3><div class="sub">${fmtP(s.credits)} crédit${s.credits > 1 ? 's' : ''} ECTS · ${s.grades.length} note${s.grades.length > 1 ? 's' : ''}</div></div>
        <div class="card-tools">
          <button class="icon-btn" data-act="edit-subject" data-s="${s.id}" aria-label="Modifier la matière">${ICON.edit}</button>
          <button class="icon-btn" data-act="del-subject" data-s="${s.id}" aria-label="Supprimer la matière">${ICON.del}</button>
        </div>
      </div>
      <div class="card-body">
        <div class="donut"><canvas id="c-${s.id}" role="img" aria-label="Répartition des notes de ${esc(s.name)}"></canvas>
          <div class="ctr"><span class="avg${st.avg != null && st.avg < getTarget() ? ' low' : ''}">${fmt(st.avg)}</span><small>/20</small></div></div>
        <div class="facts">
          <div>Pourcentage saisi : <strong>${fmtP(st.w)} %</strong> sur 100 %</div>
          <div class="meter${over ? ' over' : ''}"><span style="width:${Math.min(100, st.w)}%"></span></div>
          ${over ? `<p class="warn">Attention : le total dépasse 100 % (${fmtP(st.w)} %).</p>` : needText(st)}
        </div>
      </div>
      ${s.grades.length ? `<table><thead><tr><th>Évaluation</th><th class="n">Note /20</th><th class="n">Poids</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
        : '<p class="none">Pas encore de note. Ajoute la première ci-dessous.</p>'}
      <form class="inline" data-s="${s.id}" novalidate>
        <label>Évaluation<input name="label" maxlength="100" placeholder="ex. Partiel"></label>
        <label>Note /20<input name="value" inputmode="decimal" placeholder="14,5" required></label>
        <label>Poids %<input name="weight" inputmode="decimal" placeholder="${st.rest > 0 && st.rest < 100 ? fmtP(st.rest) : '40'}" required></label>
        <button class="btn primary" type="submit">Ajouter</button>
      </form>
    </article>`;
  }

  function donutConfig(s, { animate = true, forPdf = false } = {}) {
    const st = stats(s);
    const data = s.grades.map(g => g.weight);
    const colors = s.grades.map((_, i) => col(i, forPdf));
    const labels = s.grades.map(g => g.label);
    if (st.rest > 0) { data.push(st.rest); colors.push(forPdf ? '#e3e8ee' : (isDark() ? '#2c4054' : REST)); labels.push('Non encore noté'); }
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
                return g ? ` ${fmt(g.value)}/20 · ${fmtP(g.weight)} %` : ` ${fmtP(st.rest)} % restants`;
              }
            }
          }
        }
      }
    };
  }

  function render() {
    destroyCharts();
    renderSummary();
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
      const grade = { id: newId(), ...checkGrade(body.label, body.value, body.weight) };
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
                 <label class="field">Note /20<input id="d-val" inputmode="decimal" value="${g.value}"></label>
                 <label class="field">Poids %<input id="d-w" inputmode="decimal" value="${g.weight}"></label>`,
          read: async () => {
            const data = checkGrade($('#d-label').value, parseNum($('#d-val').value), parseNum($('#d-w').value));
            const grades = s.grades.map(x => x === g ? { ...g, ...data } : x);
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
      head: [['Matière', 'ECTS', '% saisi', 'Moyenne /20']],
      body: state.subjects.map(s => { const st = stats(s); return [s.name, pdfNum(s.credits, 1), `${fmtP(st.w)} %`, pdfNum(st.avg)]; }),
      foot: [['Moyenne générale (pondérée ECTS)', pdfNum(o.credits, 1), '', pdfNum(o.avg)]],
      headStyles: { fillColor: deep }, footStyles: { fillColor: [235, 240, 245], textColor: 20 },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      styles: { fontSize: 10, cellPadding: 2.4 }
    });

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
      doc.text(`${pdfNum(s.credits, 1)} ECTS - ${fmtP(st.w)} % des évaluations saisies`, M, y + 9);

      const top = y + 14;
      if (window.Chart && s.grades.length) doc.addImage(donutImage(s), 'PNG', M, top, 44, 44);
      doc.autoTable({
        startY: top, margin: { left: M + 52, right: M },
        head: [['', 'Évaluation', 'Note /20', 'Poids']],
        body: s.grades.length ? s.grades.map(g => ['', g.label, pdfNum(g.value), `${fmtP(g.weight)} %`])
          .concat(st.rest > 0 ? [['', 'Non encore noté', '-', `${fmtP(st.rest)} %`]] : [])
          : [['', 'Aucune note', '-', '-']],
        headStyles: { fillColor: [235, 240, 245], textColor: 40 },
        styles: { fontSize: 9.5, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 6 }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        didDrawCell: d => {
          if (d.section === 'body' && d.column.index === 0) {
            const g = s.grades[d.row.index];
            const c = g ? hexRgb(PALETTE[d.row.index % PALETTE.length]) : (s.grades.length ? [227, 232, 238] : null);
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
