// app/js/app.js
(() => {
  // ---------- Utils ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // ---------- Offcanvas refs ----------
  const ocRoot = $('#ocRoot');
  const ocBackdrop = $('#ocBackdrop');
  const ocPanel = $('#ocPanel');
  const ocTitle = $('#ocTitle');
  const ocIcon = $('#ocIcon');
  const ocClose = $('#ocClose');
  const ocContent = $('#ocContent');

  // Render icons on first load (home)
  try { window.lucide?.createIcons?.(); } catch { }

  // ---------- UI helpers ----------
  function openOffcanvas({ title, icon, html }) {
    ocTitle.textContent = title || 'Módulo';
    ocIcon.setAttribute('data-lucide', icon || 'panel-right');
    ocContent.innerHTML = html || '';

    if (window.lucide?.createIcons) setTimeout(() => lucide.createIcons(), 0);

    ocRoot.classList.remove('hidden');
    requestAnimationFrame(() => {
      ocBackdrop.classList.remove('opacity-0');
      ocPanel.classList.remove('translate-x-full');
    });
  }

  function closeOffcanvas() {
    ocBackdrop.classList.add('opacity-0');
    ocPanel.classList.add('translate-x-full');
    setTimeout(() => {
      ocRoot.classList.add('hidden');
      ocContent.innerHTML = '';
    }, 200);
  }

  // cierres estándar
  ocClose.addEventListener('click', closeOffcanvas);
  ocBackdrop.addEventListener('click', closeOffcanvas);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOffcanvas(); });

  // ---------- Network helper ----------
  async function fetchHTML(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${url} -> ${res.status}`);
      return await res.text();
    } catch (err) {
      console.error('Error cargando HTML:', err);
      return `<div class="p-6 text-sm text-red-400">No se pudo cargar: <code>${url}</code></div>`;
    }
  }

  // ---------- Loading skeleton ----------
  const LOADING_HTML = `
    <div class="p-6 text-sm text-neutral-400">
      Cargando…
    </div>
  `;

  // ---------- Open module flow ----------
  async function openModule({ title, icon, url, afterOpen }) {
    openOffcanvas({ title, icon, html: LOADING_HTML });

    const html = await fetchHTML(url);
    ocContent.innerHTML = html;

    if (window.lucide?.createIcons) setTimeout(() => lucide.createIcons(), 0);

    try { afterOpen?.(); } catch (e) { console.error('afterOpen error:', e); }
  }

  // ---------- Router de módulos (delegación global) ----------
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-open]');
    if (!btn) return;
    ev.preventDefault();

    const mod = btn.getAttribute('data-open');

    if (mod === 'comedy-notes') {
      return openModule({
        title: 'Comedy Notes',
        icon: 'sticky-note',
        url: 'app/components/comedy-notes/comedy-notes.html',
        afterOpen: () => { window.ComedyNotesVueMount?.(); }
      });
    }

    if (mod === 'tour-planer') {
      return openModule({
        title: 'Tour Planner',
        icon: 'calendar-days',
        url: 'app/components/tour-planer/tour-planer.html',
        afterOpen: () => { window.TourPlanerInit?.(); }
      });
    }

    if (mod === 'comedy-builder') {
      return openModule({
        title: 'Guion a Colores',
        icon: 'puzzle',
        url: 'app/components/comedy-builder/comedy-builder.html',
        afterOpen: () => { window.ComedyBuilderMount?.(); }
      });
    }

    if (mod === 'profile') {
      return openModule({
        title: 'Perfil',
        icon: 'user-round',
        url: 'app/components/profile/profile.html',
        afterOpen: () => { window.ProfileMount?.(); }
      });
    }

    // Fallback
    openOffcanvas({
      title: 'Módulo',
      icon: 'panel-right',
      html: '<div class="p-6 text-sm text-red-400">Módulo no reconocido.</div>'
    });
  });

  // ---------- Tema ----------
  const themeToggle = $('#themeToggle');
  themeToggle?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
  document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');
})();
