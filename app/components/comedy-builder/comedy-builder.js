// Comedy Hub — Builder (Hoja en blanco) con montaje diferido (compatible type="module")
const VueGlobal = (typeof window !== 'undefined' && window.Vue) ? window.Vue : Vue;
const { createApp, reactive, ref, computed, onMounted, nextTick, watch } = VueGlobal;

console.log('[CB] comedy-builder.js cargado');

// --- Storage keys ---
const SIMPLE_STORAGE_HTML = 'comedyhub_simple_sheet_v1';
const SIMPLE_STORAGE_TITLE = 'comedyhub_simple_title_v1';
const SIMPLE_STORAGE_WPM = 'comedyhub_simple_wpm_v1';
const STORAGE_SEGMENTS = 'comedyhub_segments_v1';

// --- Helpers ---
const uid = () => Math.random().toString(36).slice(2, 9);
const randomColor = () => ['#0ea5e9', '#22c55e', '#f59e0b', '#a78bfa', '#fb923c', '#22d3ee', '#ef4444', '#94a3b8'][Math.floor(Math.random() * 8)];
function getSelectionIn(el) { const sel = window.getSelection(); if (!sel || !sel.rangeCount) return null; const r = sel.getRangeAt(0); if (!el.contains(r.commonAncestorContainer) || r.collapsed) return null; return { sel, range: r }; }

// --- App factory ---
function makeApp() {
    return createApp({
        setup() {
            // Sidebar
            const segs = ref([]);               // [{id,title,color}]
            const currentSegId = ref(null);     // activo
            const meta = reactive({ title: '' });

            function loadSegments() {
                try {
                    const saved = JSON.parse(localStorage.getItem(STORAGE_SEGMENTS) || 'null');
                    if (saved?.segs?.length) { segs.value = saved.segs; currentSegId.value = segs.value[0].id; }
                    else {
                        const first = { id: uid(), title: 'Apertura', color: randomColor() };
                        segs.value = [first]; currentSegId.value = first.id; persistSegments();
                    }
                } catch {
                    const first = { id: uid(), title: 'Apertura', color: randomColor() };
                    segs.value = [first]; currentSegId.value = first.id; persistSegments();
                }
            }
            const persistSegments = () => localStorage.setItem(STORAGE_SEGMENTS, JSON.stringify({ segs: segs.value }));
            function addSegment() {
                const s = { id: uid(), title: 'Nuevo segmento', color: randomColor() };
                segs.value.push(s); currentSegId.value = s.id; persistSegments();
                nextTick(() => { document.querySelector('.gw__segList .gw__segItem:last-child .ghost')?.focus(); });
            }
            const segDuration = () => timeLabelSimple.value;
            watch(segs, persistSegments, { deep: true });

            // ==== Vincular selección a segmento & navegación ====
            function rgba(hex, alpha = .25) { const h = (hex || '#999999').replace('#', ''); const r = parseInt(h.slice(0, 2), 16) || 153, g = parseInt(h.slice(2, 4), 16) || 153, b = parseInt(h.slice(4, 6), 16) || 153; return `rgba(${r},${g},${b},${alpha})`; }
            function unassignSeg(segId) {
                const old = document.getElementById('seg-' + segId);
                if (!old) return; const p = old.parentNode;
                while (old.firstChild) p.insertBefore(old.firstChild, old);
                p.removeChild(old);
            }
            function wrapSelectionWithSeg(range, seg) {
                const frag = range.cloneContents();
                const span = document.createElement('span');
                span.className = 'seg-chunk';
                span.id = 'seg-' + seg.id;
                span.dataset.segId = seg.id;
                span.style.background = `linear-gradient(transparent 65%, ${rgba(seg.color, .35)} 0)`;
                span.style.borderBottom = `2px solid ${seg.color}`;
                span.appendChild(frag);
                range.deleteContents(); range.insertNode(span);
                return span;
            }
            function assignSelectionToCurrentSeg() {
                const sheet = document.getElementById('simpleSheet');
                const sel = getSelectionIn(sheet); if (!sel) return;
                const seg = segs.value.find(s => s.id === currentSegId.value); if (!seg) return;
                unassignSeg(seg.id);
                const node = wrapSelectionWithSeg(sel.range, seg);
                recomputeSimple();
                node.classList.add('pulse'); setTimeout(() => node.classList.remove('pulse'), 900);
            }
            function scrollToSeg(segId) {
                const el = document.getElementById('seg-' + segId); if (!el) return;
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 900);
            }

            // Scroll-spy: seleccionar segmento según el trozo visible y auto-scroll del sidebar
            let spy;
            function initScrollSpy() {
                const sheet = document.getElementById('simpleSheet');
                if (spy) spy.disconnect();
                spy = new IntersectionObserver((entries) => {
                    // Prioriza el que más intersección tenga
                    const vis = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                    if (!vis) return;
                    const segId = vis.target.dataset.segId;
                    if (segId && segId !== currentSegId.value) {
                        currentSegId.value = segId;
                        // Mantener visible el item en el panel
                        const btn = document.querySelector(`.gw__segItem[data-id="${segId}"]`);
                        btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, { root: sheet.parentElement, threshold: [0.05, 0.25, 0.5, 0.75] });

                document.querySelectorAll('.seg-chunk').forEach(n => spy.observe(n));
            }
            const observeNewSeg = () => nextTick(() => initScrollSpy());

            // Editor simple
            const wpmSimple = ref(Number(localStorage.getItem(SIMPLE_STORAGE_WPM)) || 140);
            const totalWordsSimple = ref(0);
            const paragraphsSimple = ref(0);
            const ctx = reactive({ visible: false, x: 0, y: 0 });
            const minutesSimple = computed(() => totalWordsSimple.value && wpmSimple.value ? totalWordsSimple.value / wpmSimple.value : 0);
            const timeLabelSimple = computed(() => { const t = minutesSimple.value; if (!t) return '0:00'; const m = Math.floor(t), s = Math.round((t - m) * 60); return `${m}:${String(s).padStart(2, '0')}`; });

            function recomputeSimple() {
                const el = document.getElementById('simpleSheet');
                const txt = (el?.innerText || '').replace(/\s+/g, ' ').trim();
                totalWordsSimple.value = txt ? (txt.match(/\b[\p{L}\p{N}’'-]+\b/gu) || []).length : 0;
                paragraphsSimple.value = (el?.innerText || '').split(/\n{2,}/).filter(x => x.trim().length > 0).length || (txt ? 1 : 0);
                localStorage.setItem(SIMPLE_STORAGE_WPM, wpmSimple.value);
                if (el) localStorage.setItem(SIMPLE_STORAGE_HTML, el.innerHTML);
                observeNewSeg();
            }
            function restoreSimple() {
                const titleNode = document.querySelector('.gw__title [contenteditable]') || document.getElementById('titulo');
                const savedTitle = localStorage.getItem(SIMPLE_STORAGE_TITLE) || '';
                if (titleNode && savedTitle) { titleNode.innerText = savedTitle; meta.title = savedTitle; }
                const el = document.getElementById('simpleSheet');
                const html = localStorage.getItem(SIMPLE_STORAGE_HTML) || '';
                if (el) el.innerHTML = html;
                recomputeSimple();
            }

            // Context menu (solo vincular sección)
            function openCtx(e) {
                const el = document.getElementById('simpleSheet'); if (!el?.contains(e.target)) return; e.preventDefault();
                const sel = getSelectionIn(el); if (!sel) return;
                const rect = sel.range.getBoundingClientRect(); const host = el.getBoundingClientRect();
                ctx.visible = true; ctx.x = Math.round(rect.left - host.left); ctx.y = Math.round(rect.bottom - host.top) + 6;
            }
            const openCtxEditor = (e) => openCtx(e);
            const closeCtx = () => { ctx.visible = false; };

            // Export / Copy
            function toPlainSimple() {
                const el = document.getElementById('simpleSheet'); const clone = el.cloneNode(true);
                return clone.textContent || '';
            }
            function toMarkdownSimple() {
                const el = document.getElementById('simpleSheet'); const copy = el.cloneNode(true);
                copy.querySelectorAll('br').forEach(br => br.outerHTML = '\n');
                copy.querySelectorAll('div,p').forEach(n => { if (!n.textContent?.endsWith('\n')) n.insertAdjacentText('beforeend', '\n'); });
                return copy.textContent || '';
            }
            function downloadSimple(ext) {
                const content = ext === 'md' ? toMarkdownSimple() : toPlainSimple();
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob); const a = document.createElement('a');
                const titleNode = document.querySelector('.gw__title [contenteditable]') || document.getElementById('titulo');
                const title = (titleNode?.innerText || 'guion').trim();
                a.href = url; a.download = `${title || 'guion'}.${ext}`; document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
            }
            const copyAllSimple = () => navigator.clipboard.writeText(toPlainSimple()).catch(() => { });

            onMounted(() => {
                console.log('[CB] Vue montado');
                loadSegments();
                const titleNode = document.querySelector('.gw__title [contenteditable]') || document.getElementById('titulo');
                if (titleNode) { titleNode.addEventListener('input', () => { const v = titleNode.innerText.trim(); meta.title = v; localStorage.setItem(SIMPLE_STORAGE_TITLE, v); }); }
                restoreSimple();

                const sheet = document.getElementById('simpleSheet');
                sheet.addEventListener('input', recomputeSimple);
                sheet.addEventListener('paste', (e) => { e.preventDefault(); const text = (e.clipboardData || window.clipboardData).getData('text'); document.execCommand('insertText', false, text); });
                sheet.addEventListener('contextmenu', openCtx);
                document.addEventListener('click', (ev) => { const m = document.querySelector('.gw__ctx'); if (m && m.contains(ev.target)) return; closeCtx(); });

                window.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (e.shiftKey) downloadSimple('md'); else downloadSimple('txt'); }
                    // Ctrl/Cmd + G → asignar selección al segmento activo
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') { e.preventDefault(); assignSelectionToCurrentSeg(); }
                    // Ctrl/Cmd + J → saltar al segmento activo
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); scrollToSeg(currentSegId.value); }
                });

                // inicia scroll-spy de lo que ya exista
                initScrollSpy();
            });

            return {
                // Sidebar
                segs, currentSegId, meta, addSegment, segDuration,
                // Editor
                ctx, openCtx, openCtxEditor,
                wpmSimple, totalWordsSimple, paragraphsSimple, timeLabelSimple,
                copyAllSimple, downloadSimple,
                // API nueva
                assignSelectionToCurrentSeg, scrollToSeg
            };
        }
    });
}

// --- Montaje diferido en off-canvas ---
let mounted = false, app;
function tryMount() {
    if (mounted) return true;
    const el = document.getElementById('comedy-builder-app');
    if (!el) return false;
    app = makeApp(); app.mount('#comedy-builder-app'); mounted = true;
    console.log('[CB] app montada'); return true;
}
tryMount();
const obs = new MutationObserver(() => { if (tryMount()) obs.disconnect(); });
obs.observe(document.body, { childList: true, subtree: true });
window.ComedyBuilderMount = tryMount;
