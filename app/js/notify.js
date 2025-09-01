// app/js/notify.js
(() => {
    // defaults globales
    const base = {
        position: 'topRight',
        timeout: 2600,
        transitionIn: 'fadeInDown',
        transitionOut: 'fadeOutUp',
        closeOnClick: true,
        pauseOnHover: true,
        drag: false,
    };

    // colores adaptados a tu tema (usa CSS variables si quieres)
    const palette = {
        success: { backgroundColor: 'rgba(34,197,94,.12)', messageColor: '#dcfce7', progressBarColor: '#22c55e', iconColor: '#22c55e' },
        info: { backgroundColor: 'rgba(14,165,233,.12)', messageColor: '#dbeafe', progressBarColor: '#0ea5e9', iconColor: '#0ea5e9' },
        warning: { backgroundColor: 'rgba(245,158,11,.12)', messageColor: '#fef3c7', progressBarColor: '#f59e0b', iconColor: '#f59e0b' },
        error: { backgroundColor: 'rgba(239,68,68,.12)', messageColor: '#fee2e2', progressBarColor: '#ef4444', iconColor: '#ef4444' },
    };

    function styleOf(kind) {
        const p = palette[kind] || {};
        return {
            ...base,
            layout: 2,               // mensaje + icono (compacto)
            messageColor: p.messageColor,
            progressBarColor: p.progressBarColor,
            backgroundColor: p.backgroundColor,
            iconColor: p.iconColor,
            theme: 'dark',           // forzamos dark; puedes cambiar según data-theme
        };
    }

    const toast = {
        success(msg, cfg = {}) { iziToast.show({ ...styleOf('success'), icon: 'ico-success', message: msg, ...cfg }); },
        info(msg, cfg = {}) { iziToast.show({ ...styleOf('info'), icon: 'ico-info', message: msg, ...cfg }); },
        warning(msg, cfg = {}) { iziToast.show({ ...styleOf('warning'), icon: 'ico-warning', message: msg, ...cfg }); },
        error(msg, cfg = {}) { iziToast.show({ ...styleOf('error'), icon: 'ico-error', message: msg, ...cfg }); },

        // confirmación con botones personalizados
        confirm({ message = '¿Confirmar?', okText = 'Confirmar', cancelText = 'Cancelar', onOk, onCancel } = {}) {
            iziToast.question({
                ...base,
                timeout: false,
                overlay: true,
                close: false,
                drag: false,
                message,
                buttons: [
                    ['<button>' + okText + '</button>', (instance, toastEl) => {
                        instance.hide({}, toastEl);
                        try { onOk?.(); } catch { }
                    }, true],
                    ['<button class="iziToast-cancel">' + cancelText + '</button>', (instance, toastEl) => {
                        instance.hide({}, toastEl);
                        try { onCancel?.(); } catch { }
                    }]
                ]
            });
        }
    };

    // Exponer global
    window.toast = toast;

    // Ajuste “tema claro/oscuro” si usas data-theme:
    const applyTheme = () => {
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        document.documentElement.style.setProperty('--toast-bg', theme === 'light' ? '#fff' : '#0f0f10');
        document.documentElement.style.setProperty('--toast-fg', theme === 'light' ? '#0b0b0c' : '#e7e7ea');
    };
    applyTheme();
    window.addEventListener('storage', (e) => { if (e.key === 'theme') applyTheme(); });
})();
