(() => {
    const STORAGE = 'ch_profile_v1';
    const subs = new Set(); // listeners

    function load() {
        try { return JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch { return {}; }
    }
    function save(p) {
        localStorage.setItem(STORAGE, JSON.stringify(p));
        subs.forEach(fn => { try { fn(p); } catch { } });
    }

    // API global para que otros módulos (Planner) lean el perfil
    window.CHProfile = {
        get: () => load(),
        onChange: (fn) => { subs.add(fn); return () => subs.delete(fn); }
    };

    function el(id) { return document.getElementById(id); }
    const root = document.getElementById('profile-app'); if (!root) return;

    const pfThumb = el('pfThumb');
    const pfFile = el('pfFile');
    const pfBtnUpload = el('pfBtnUpload');
    const pfBtnRemove = el('pfBtnRemove');
    const pfForm = el('pfForm');
    const pfName = el('pfName');
    const pfHandle = el('pfHandle');
    const pfSaved = el('pfSaved');

    function render() {
        const p = load();
        pfName.value = p.name || '';
        pfHandle.value = p.handle || '';
        if (p.photo) {
            pfThumb.textContent = '';
            pfThumb.style.backgroundImage = `url(${p.photo})`;
        } else {
            pfThumb.style.backgroundImage = '';
            pfThumb.textContent = 'Sin foto';
        }
    }

    pfBtnUpload.addEventListener('click', () => pfFile.click());
    pfFile.addEventListener('change', async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        const dataUrl = await fileToDataURL(f);
        const p = load(); p.photo = dataUrl; save(p); render();
    });
    pfBtnRemove.addEventListener('click', () => {
        const p = load(); delete p.photo; save(p); render();
    });

    pfForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = load();
        p.name = pfName.value.trim();
        p.handle = pfHandle.value.trim();
        save(p);
        pfSaved.textContent = 'Guardado ✓';
        setTimeout(() => pfSaved.textContent = '', 1200);
    });

    function fileToDataURL(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
        });
    }

    render();
})();
