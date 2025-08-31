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