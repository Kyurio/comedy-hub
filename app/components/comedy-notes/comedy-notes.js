// app/components/comedy-notes/comedy-notes.js
(() => {
  const { createApp, ref, reactive, onMounted, nextTick } = Vue;

  function makeApp(template) {
    return createApp({
      template,
      setup() {
        // --- estado ---
        const STORAGE = 'comedy_notes_v2';
        const STORAGE_LINKS = 'comedy_notes_links_v1';
        const colors = ['sky', 'emerald', 'amber', 'fuchsia', 'slate'];

        const notes = ref([]);
        const links = ref([]);                 // [{id, from, to}]
        const linkSourceId = ref(null);        // origen temporal para completar conexión

        const selected = ref(new Set());
        const zTop = ref(10);
        const boardRef = ref(null);
        let dragging = null;                   // {ids, startX, startY, orig:Map, maxX, maxY}

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
        const loadNotes = () => { try { return JSON.parse(localStorage.getItem(STORAGE) || '[]'); } catch { return []; } };
        const saveNotes = () => { localStorage.setItem(STORAGE, JSON.stringify(notes.value)); };
        const loadLinks = () => { try { links.value = JSON.parse(localStorage.getItem(STORAGE_LINKS) || '[]'); } catch { links.value = []; } };
        const saveLinks = () => { localStorage.setItem(STORAGE_LINKS, JSON.stringify(links.value)); };
        const nextZ = () => Math.max(1, ...notes.value.map(n => n.z || 1)) + 1;

        const isSelected = (id) => selected.value.has(id);
        const toggleSelect = (id) => {
          if (selected.value.has(id)) selected.value.delete(id);
          else selected.value.add(id);
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
            id: uid(),
            text: (text || draft.text || '').trim() || 'Idea',
            color: color || draft.color || 'sky',
            x: Math.max(0, x), y: Math.max(0, y), z: nextZ()
          };
          notes.value.push(n); saveNotes(); closeCtx(); redrawLinks();
        };

        // drag
        const onDragStart = (e, note) => {
          if (e.button !== 0) return;
          if (editingId.value === note.id) return;
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
          requestAnimationFrame(redrawLinks);
        };

        const onDragEnd = () => {
          if (!dragging) return;
          dragging = null; saveNotes();
          document.body.style.cursor = '';
          window.removeEventListener('pointermove', onDragMove);
          redrawLinks();
        };

        // acciones
        const bringFront = (n) => { n.z = nextZ(); saveNotes(); };
        // En acciones: reemplaza removeNote por versión con confirm
        const removeNote = (id) => {
          const note = notes.value.find(n => n.id === id);
          if (!note) return;

          toast.confirm({
            message: `¿Eliminar esta nota?`,
            okText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            onOk: () => {
              // eliminar conexiones relacionadas
              const before = links.value.length;
              links.value = links.value.filter(l => l.from !== id && l.to !== id);
              if (links.value.length !== before) saveLinks();

              notes.value = notes.value.filter(n => n.id !== id);
              selected.value.delete(id);
              if (editingId.value === id) cancelEdit();
              saveNotes(); closeCtx(); redrawLinks();

              toast.success('Nota eliminada');
            }
          });
        };

        const duplicate = (n) => { createAt(n.x + 16, n.y + 12, n.color, n.text); };
        const recolor = (n, color) => { n.color = color; saveNotes(); closeCtx(); };

        // edición
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
          if (i >= 0) { notes.value[i] = { ...notes.value[i], text: (editDraft.value || '').trim() }; saveNotes(); }
          editingId.value = null; editDraft.value = '';
        };
        const cancelEdit = () => { editingId.value = null; editDraft.value = ''; };

        // selección
        const onNoteClick = (e, n) => {
          if (editingId.value === n.id) return;

          // completar conexión con simple click
          if (linkSourceId.value && linkSourceId.value !== n.id) {
            completeLinkTo(n.id);
            e.stopPropagation();
            return;
          }

          if (e.shiftKey) toggleSelect(n.id);
          else selected.value = new Set([n.id]);
          closeCtx();
        };

        // --- Conexiones ---
        const linkUid = () => 'l_' + uid();

        function startLinkFrom(noteId) {
          if (!noteId) return;
          linkSourceId.value = noteId;
          hint('Selecciona otra nota para conectar');
          closeCtx();
        }

        function completeLinkTo(targetId) {
          if (!linkSourceId.value || !targetId || linkSourceId.value === targetId) return;
          // evita duplicadas (bidireccional única)
          const exists = links.value.some(l =>
            (l.from === linkSourceId.value && l.to === targetId) ||
            (l.from === targetId && l.to === linkSourceId.value)
          );
          if (!exists) {
            links.value.push({ id: linkUid(), from: linkSourceId.value, to: targetId });
            saveLinks();
          }
          linkSourceId.value = null;
          redrawLinks();
        }

        const hasLinks = (noteId) => links.value.some(l => l.from === noteId || l.to === noteId);

        function removeLinksOf(noteId) {
          links.value = links.value.filter(l => l.from !== noteId && l.to !== noteId);
          saveLinks(); redrawLinks(); closeCtx();
        }

        function redrawLinks() {
          const svg = document.getElementById('cnLinks');
          const board = boardRef.value;
          if (!svg || !board) return;

          while (svg.firstChild) svg.removeChild(svg.firstChild);

          const boardRect = board.getBoundingClientRect();

          function centerOfCard(el) {
            const r = el.getBoundingClientRect();
            return { x: (r.left + r.right) / 2 - boardRect.left, y: (r.top + r.bottom) / 2 - boardRect.top };
          }

          function getCardById(id) {
            return board.querySelector(`.cn__note[data-id="${id}"]`) ||
              [...board.querySelectorAll('.cn__note')].find(n => n.__nid === id) ||
              null;
          }

          // aseguramos data-id en DOM (para búsqueda robusta)
          board.querySelectorAll('.cn__note').forEach((el, i) => {
            const vIdx = i; // no usamos
          });

          links.value.forEach(l => {
            const cardA = board.querySelector(`.cn__note[style*="z-index"][style*="left: ${notes.value.find(n => n.id === l.from)?.x}px"]`) ||
              board.querySelector(`.cn__note`);
            const cardB = board.querySelector(`.cn__note[style*="z-index"][style*="left: ${notes.value.find(n => n.id === l.to)?.x}px"]`) ||
              board.querySelector(`.cn__note`);

            const elA = board.querySelector(`.cn__note:is(.note--sky,.note--emerald,.note--amber,.note--fuchsia,.note--slate)[style*="left: ${notes.value.find(n => n.id === l.from)?.x}px"][style*="top: ${notes.value.find(n => n.id === l.from)?.y}px"]`);
            const elB = board.querySelector(`.cn__note:is(.note--sky,.note--emerald,.note--amber,.note--fuchsia,.note--slate)[style*="left: ${notes.value.find(n => n.id === l.to)?.x}px"][style*="top: ${notes.value.find(n => n.id === l.to)?.y}px"]`);

            const Ael = elA || cardA, Bel = elB || cardB;
            if (!Ael || !Bel) return;

            const A = centerOfCard(Ael), B = centerOfCard(Bel);
            const dx = B.x - A.x, midx = A.x + dx / 2;
            const c1 = `${midx},${A.y}`, c2 = `${midx},${B.y}`;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'cn-link');
            path.setAttribute('d', `M ${A.x},${A.y} C ${c1} ${c2} ${B.x},${B.y}`);
            svg.appendChild(path);

            const dotA = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dotA.setAttribute('class', 'cn-link-dot');
            dotA.setAttribute('r', '3.5'); dotA.setAttribute('cx', A.x); dotA.setAttribute('cy', A.y);
            svg.appendChild(dotA);

            const dotB = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dotB.setAttribute('class', 'cn-link-dot');
            dotB.setAttribute('r', '3.5'); dotB.setAttribute('cx', B.x); dotB.setAttribute('cy', B.y);
            svg.appendChild(dotB);
          });
        }

        // util: mini hint
        function hint(msg) {
          try {
            const el = document.createElement('div');
            el.textContent = msg;
            el.style.cssText =
              'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #333;padding:8px 12px;border-radius:10px;color:#ddd;font-size:12px;z-index:9999;opacity:.95';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1300);
          } catch { }
        }

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
          if (e.key === 'Escape') {
            if (linkSourceId.value) { linkSourceId.value = null; }
            if (editingId.value) return cancelEdit();
            clearSelection();
          }
          if (e.key === 'Delete' || e.key === 'Backspace') {
            if (editingId.value) return;
            if (selected.value.size) {
              if (!confirm(`Eliminar ${selected.value.size} nota(s)?`)) return;
              const delIds = new Set(selected.value);
              notes.value = notes.value.filter(n => !delIds.has(n.id));
              links.value = links.value.filter(l => !delIds.has(l.from) && !delIds.has(l.to));
              selected.value.clear(); saveNotes(); saveLinks(); redrawLinks();
            }
          }
          // Inicio rápido de conexión: Ctrl/Cmd + L con una sola nota seleccionada
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
            const ids = [...selected.value];
            if (ids.length === 1) { e.preventDefault(); startLinkFrom(ids[0]); }
          }
        };

        // ciclo
        onMounted(() => {
          notes.value = loadNotes();
          loadLinks();
          zTop.value = Math.max(10, ...notes.value.map(n => n.z || 10));
          nextTick(() => { boardRef.value?.addEventListener('contextmenu', (e) => e.preventDefault()); });
          document.addEventListener('mousedown', onDocMouseDown);
          window.addEventListener('keydown', onKey);
          window.addEventListener('resize', () => requestAnimationFrame(redrawLinks));
          if (window.lucide?.createIcons) setTimeout(() => window.lucide.createIcons(), 0);

          // debug de funciones (confirmar que existen)
          console.log('[CN] fns:',
            'startLinkFrom=', typeof startLinkFrom,
            'completeLinkTo=', typeof completeLinkTo,
            'hasLinks=', typeof hasLinks,
            'removeLinksOf=', typeof removeLinksOf
          );

          redrawLinks();
        });

        return {
          // estado/UI
          colors, notes, draft, ctx, boardRef,
          links, linkSourceId,
          editingId, editDraft, startEdit, commitEdit, cancelEdit,
          colorName, isSelected,
          // CRUD notas
          addRandom, createAt,
          onDragStart, onDragMove, onDragEnd,
          bringFront, removeNote, duplicate, recolor,
          onNoteClick, toggleSelect, clearSelection,
          // Conexiones
          startLinkFrom, completeLinkTo, hasLinks, removeLinksOf,
          // Menú
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
