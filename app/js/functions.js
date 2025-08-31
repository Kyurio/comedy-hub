(function () {
    const preloader = document.getElementById('preloader');

    function reveal() {
        // 1) Mostrar contenido con transiciones
        document.body.classList.add('is-loaded');

        // 2) Pintar íconos Lucide una vez visible
        if (window.lucide && typeof lucide.createIcons === 'function') {
            try { lucide.createIcons(); } catch (e) { }
        }

        // 3) Ocultar preloader (delay corto para que se aprecie la animación)
        setTimeout(() => preloader?.classList.add('is-hidden'), 120);
    }

    // Espera a que la página esté completamente cargada
    window.addEventListener('load', () => {
        // pequeño delay para sensación más “premium”
        setTimeout(reveal, 200);
    });
})();

(function () {
    const KEY = 'comedyhub_theme_v1';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const saved = localStorage.getItem(KEY);
    const initialDark = saved ? (saved === 'dark') : prefersDark;

    function applyTheme(dark) {
        document.documentElement.classList.toggle('dark', dark);
        if (metaTheme) metaTheme.setAttribute('content', dark ? '#0b0b0b' : '#ffffff');
        localStorage.setItem(KEY, dark ? 'dark' : 'light');
    }

    // aplicar al inicio
    applyTheme(initialDark);

    // toggle al click
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.addEventListener('click', () => {
            const nowDark = !document.documentElement.classList.contains('dark');
            applyTheme(nowDark);
        });
    }
})();