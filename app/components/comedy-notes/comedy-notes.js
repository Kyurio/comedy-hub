// app/components/comedy-notes/comedy-notes.js
(() => {
  const { createApp, ref, reactive, onMounted, nextTick } = Vue;

  function makeApp(template) {
    return createApp({
      template, // <= usamos el HTML inyectado como plantilla explícita
      setup() {
        // --- estado ---
        const STORAGE = 'comedy_notes_v2';
        const colors = ['sky', 'emerald', 'amber', 'fuchsia', 'slate'];
        const notes = ref([]);
        const selected = ref(new Set());
        const zTop = ref(10);
        const boardRef = ref(null);
        let dragging = null; // {ids, startX, startY, orig:Map, maxX, maxY}

        // Toolbar
        const draft = reactive({ text: '', color: 'sky' });

        // Edición
        const editingId = ref(null);
        const editDraft = ref('');

        // Menú contextual
        const ctx = reactive({
          visible: false, type: 'board', x: 0, y: 0, boardX: 0, boardY: 0, note: null
        });

        // helpers
        const uid = () => Math.random().toString(36).slice(2, 9);
        const colorName = (c) => ({ sky: 'Azul', emerald: 'Verde', amber: 'Amarillo', fuchsia: 'Fucsia', slate: 'Gris' }[c] || c);
        const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE) || '[]'); } catch { return []; } };
        const persist = () => { localStorage.setItem(STORAGE, JSON.stringify(notes.value)); };
        const nextZ = () => Math.max(1, ...notes.value.map(n => n.z || 1)) + 1;

        const isSelected = (id) => selected.value.has(id);
        const toggleSelect = (id) => {
          if (selected.value.has(id)) selected.value.delete(id); else selected.value.add(id);
          closeCtx();
        };
        const clearSelection = () => { selected.value.clear(); closeCtx(); };

        // crear
        const addRandom = () => {
          const rect = boardRef.value?.getBoundingClientRect();
          const x = Math.round(10 + Math.random() * Math.max(10, (rect?.width ?? 800) - 240));
          const y = Math.round(10 + Math.random() * Math.max(10, (rect?.height ?? 500) - 160));
          createAt(x, y, draft.color, draft.text);
          draft.text = '';
        };
        const createAt = (x, y, color, text = '') => {
          const n = {
            id: uid(), text: (text || draft.text || '').trim() || 'Idea',
            color: color || draft.color || 'sky', x: Math.max(0, x), y: Math.max(0, y), z: nextZ()
          };
          notes.value.push(n); persist(); closeCtx();
        };

        // drag (arrastrar toda la nota)
        const onDragStart = (e, note) => {
          if (e.button !== 0) return;                     // solo botón izquierdo
          if (editingId.value === note.id) return;        // no arrastrar si editas
          const t = e.target;
          if (t && (t.closest('.cn__edit') || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName))) return;

          const ids = (selected.value.size && selected.value.has(note.id))
            ? new Set(selected.value) : new Set([note.id]);

          if (!e.shiftKey && !selected.value.has(note.id)) {
            selected.value = new Set([note.id]);
          }

          const rect = boardRef.value?.getBoundingClientRect?.();
          if (!rect) return;

          dragging = {
            ids, startX: e.clientX, startY: e.clientY, orig: new Map(),
            maxX: rect.width - 220, maxY: rect.height - 140
          };

          notes.value.forEach(n => { if (dragging.ids.has(n.id)) dragging.orig.set(n.id, { x: n.x, y: n.y }); });

          bringFront(note);
          document.body.style.cursor = 'grabbing';
          window.addEventListener('pointermove', onDragMove);
          window.addEventListener('pointerup', onDragEnd, { once: true });
        };

        const onDragMove = (e) => {
          if (!dragging) return;
          const dx = e.clientX - dragging.startX;
          const dy = e.clientY - dragging.startY;
          notes.value = notes.value.map(n => {
            if (!dragging.ids.has(n.id)) return n;
            const o = dragging.orig.get(n.id);
            let nx = o.x + dx, ny = o.y + dy;
            nx = Math.max(0, Math.min(nx, dragging.maxX));
            ny = Math.max(0, Math.min(ny, dragging.maxY));
            return { ...n, x: nx, y: ny };
          });
        };

        const onDragEnd = () => {
          if (!dragging) return;
          dragging = null; persist();
          document.body.style.cursor = '';
          window.removeEventListener('pointermove', onDragMove);
        };

        // acciones
        const bringFront = (n) => { n.z = nextZ(); persist(); };
        const removeNote = (id) => {
          notes.value = notes.value.filter(n => n.id !== id);
          selected.value.delete(id);
          if (editingId.value === id) cancelEdit();
          persist(); closeCtx();
        };
        const duplicate = (n) => { createAt(n.x + 16, n.y + 12, n.color, n.text); };
        const recolor = (n, color) => { n.color = color; persist(); closeCtx(); };

        // edición inline
        const startEdit = (n) => {
          editingId.value = n.id; editDraft.value = n.text || ''; bringFront(n);
          nextTick(() => {
            const root = document.getElementById('comedy-notes-app');
            const ta = root?.querySelector('.cn__edit');
            if (ta) { ta.focus(); if (typeof ta.selectionStart === 'number') ta.selectionStart = ta.selectionEnd = ta.value.length; }
          });
        };
        const commitEdit = () => {
          if (!editingId.value) return;
          const i = notes.value.findIndex(n => n.id === editingId.value);
          if (i >= 0) { notes.value[i] = { ...notes.value[i], text: (editDraft.value || '').trim() }; persist(); }
          editingId.value = null; editDraft.value = '';
        };
        const cancelEdit = () => { editingId.value = null; editDraft.value = ''; };

        // selección
        const onNoteClick = (e, n) => {
          if (editingId.value === n.id) return;
          if (e.shiftKey) toggleSelect(n.id); else selected.value = new Set([n.id]); closeCtx();
        };

        // menú contextual (coords relativas + clamp)
        const openCtxOnBoard = (e) => {
          const rect = boardRef.value?.getBoundingClientRect?.(); if (!rect) return;
          ctx.visible = true; ctx.type = 'board';
          ctx.boardX = Math.round(e.clientX - rect.left);
          ctx.boardY = Math.round(e.clientY - rect.top);
          ctx.x = ctx.boardX; ctx.y = ctx.boardY; ctx.note = null;
          nextTick(() => clampCtx(rect));
        };
        const openCtxOnNote = (e, n) => {
          const rect = boardRef.value?.getBoundingClientRect?.(); if (!rect) return;
          ctx.visible = true; ctx.type = 'note'; ctx.note = n;
          ctx.x = Math.round(e.clientX - rect.left);
          ctx.y = Math.round(e.clientY - rect.top);
          nextTick(() => clampCtx(rect));
        };
        const clampCtx = (rect) => {
          const menu = document.querySelector('.cn__ctx'); if (!menu) return;
          const mw = menu.offsetWidth || 180, mh = menu.offsetHeight || 120, pad = 8;
          ctx.x = Math.max(pad, Math.min(ctx.x, rect.width - mw - pad));
          ctx.y = Math.max(pad, Math.min(ctx.y, rect.height - mh - pad));
        };
        const closeCtx = () => { ctx.visible = false; };

        // cerrar menú si clic fuera
        const onDocMouseDown = (ev) => {
          const menu = document.querySelector('.cn__ctx');
          if (menu && menu.contains(ev.target)) return;
          ctx.visible = false;
        };

        // atajos
        const onKey = (e) => {
          if (e.key === 'Escape') { if (editingId.value) return cancelEdit(); clearSelection(); }
          if (e.key === 'Delete' || e.key === 'Backspace') {
            if (editingId.value) return;
            if (selected.value.size) {
              if (!confirm(`Eliminar ${selected.value.size} nota(s)?`)) return;
              notes.value = notes.value.filter(n => !selected.value.has(n.id));
              selected.value.clear(); persist();
            }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && editingId.value) { e.preventDefault(); commitEdit(); }
        };

        // ciclo
        onMounted(() => {
          notes.value = load();
          zTop.value = Math.max(10, ...notes.value.map(n => n.z || 10));
          nextTick(() => { boardRef.value?.addEventListener('contextmenu', (e) => e.preventDefault()); });
          document.addEventListener('mousedown', onDocMouseDown);
          window.addEventListener('keydown', onKey);
          if (window.lucide?.createIcons) setTimeout(() => window.lucide.createIcons(), 0);
        });

        return {
          colors, notes, draft, ctx, boardRef,
          editingId, editDraft, startEdit, commitEdit, cancelEdit,
          colorName, isSelected,
          addRandom, createAt,
          onDragStart, onDragMove, onDragEnd,
          bringFront, removeNote, duplicate, recolor,
          onNoteClick, toggleSelect, clearSelection,
          openCtxOnBoard, openCtxOnNote, closeCtx
        };
      }
    });
  }

  // Montaje diferido con plantilla explícita
  let appInstance = null, mounted = false;

  function tryMount() {
    if (mounted) return true;
    const el = document.getElementById('comedy-notes-app');
    if (!el) return false;

    // Tomamos el HTML ya inyectado como template y limpiamos el contenedor
    const tpl = el.innerHTML;
    el.innerHTML = '';

    appInstance = makeApp(tpl);
    appInstance.mount(el);
    mounted = true;
    window.__ComedyNotesApp__ = appInstance;
    return true;
  }

  if (!tryMount()) {
    const obs = new MutationObserver(() => { if (tryMount()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  window.ComedyNotesVueMount = tryMount;
})();
