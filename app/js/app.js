// app/js/app.js
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // Offcanvas refs
  const ocRoot = $('#ocRoot');
  const ocBackdrop = $('#ocBackdrop');
  const ocPanel = $('#ocPanel');
  const ocTitle = $('#ocTitle');
  const ocIcon = $('#ocIcon');
  const ocClose = $('#ocClose');
  const ocContent = $('#ocContent');

  // Render icons on first load (for the homepage cards)
  try { window.lucide?.createIcons?.(); } catch {}

  // --- UI helpers ---
  function openOffcanvas({ title, icon, html }) {
    ocTitle.textContent = title || 'Módulo';
    ocIcon.setAttribute('data-lucide', icon || 'panel-right');
    ocContent.innerHTML = html || '';

    // Re-render icons dentro del panel
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
    setTimeout(() => ocRoot.classList.add('hidden'), 200);
  }

  ocClose.addEventListener('click', closeOffcanvas);
  ocBackdrop.addEventListener('click', closeOffcanvas);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOffcanvas(); });

  // --- network helper ---
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

  // Loading skeleton simple
  const LOADING_HTML = `
    <div class="p-6 text-sm text-neutral-400">
      Cargando…
    </div>
  `;

  // --- open module flow (con fetch on click) ---
  async function openModule({ title, icon, url, afterOpen }) {
    // abre de inmediato con loader
    openOffcanvas({ title, icon, html: LOADING_HTML });

    // trae el HTML real
    const html = await fetchHTML(url);
    ocContent.innerHTML = html;

    // re-pinta iconos si hay
    if (window.lucide?.createIcons) setTimeout(() => lucide.createIcons(), 0);

    // llama inicializador del módulo (si existe)
    try { afterOpen?.(); } catch (e) { console.error('afterOpen error:', e); }
  }

  // --- botones "Abrir" del grid ---
  $$('#apps [data-open]').forEach(btn => {
    btn.addEventListener('click', async () => {
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

      // Fallback desconocido
      openOffcanvas({
        title: 'Módulo',
        icon: 'panel-right',
        html: '<div class="p-6 text-sm text-red-400">Módulo no reconocido.</div>'
      });
    });
  });
})();
