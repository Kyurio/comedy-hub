// app/js/bootstrap.js
(function () {
    // Render de iconos al cargar
    document.addEventListener('DOMContentLoaded', () => {
      try { window.lucide?.createIcons(); } catch (_) {}
    });
  
    // Rellenar los <template> con los .html reales
    async function fillTemplates() {
      const pairs = [
        { tplId: 'tpl-comedy-notes', url: 'app/components/comedy-notes/comedy-notes.html' },
        { tplId: 'tpl-tour-planer',  url: 'app/components/tour-planer/tour-planer.html' }
      ];
      for (const { tplId, url } of pairs) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error(url + ' -> ' + res.status);
          const html = await res.text();
          const tpl = document.getElementById(tplId);
          if (tpl) tpl.innerHTML = html;
        } catch (e) {
          console.error('No se pudo cargar', url, e);
        }
      }
      // Aviso opcional para que otros módulos reaccionen
      document.dispatchEvent(new CustomEvent('templates:ready'));
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fillTemplates);
    } else {
      fillTemplates();
    }
  })();
  