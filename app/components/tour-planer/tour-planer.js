// app/components/tour-planer/tour-planer.js
// Seguro: no toca el DOM al importar. Llama TourPlanerInit() después de inyectar el HTML.
(() => {
  const STORAGE = "tour_planer_v1";
  const fmtMonth = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" });
  const fmtFull  = new Intl.DateTimeFormat("es-CL", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
  const WEEK = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  const TYPE_LABEL = { ok:"Confirmado", tent:"Tentativo", rehe:"Ensayo" };
  const TYPE_DOT_CLASS = { ok:"bg-emerald-500", tent:"bg-amber-500", rehe:"bg-sky-500", cancel:"bg-rose-500" };

  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const loadState = () => { try { return JSON.parse(localStorage.getItem(STORAGE) || "{}"); } catch { return {}; } };
  const saveState = (s) => localStorage.setItem(STORAGE, JSON.stringify(s));

  // === Poster como IMAGEN (PNG) ===
  const TYPE_COLOR = { ok:"#22c55e", tent:"#f59e0b", rehe:"#a78bfa" };
  const WD  = ["DOM","LUN","MAR","MIÉ","JUE","VIE","SÁB"];
  const MON = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
  const trunc   = (s='',n=64)=> s.length<=n ? s : s.slice(0,n-1)+'…';
  const hasLink = (s='') => /https?:\/\/[^\s)]+/i.test(s);

  function buildExportArrayFromState(state) {
    return Object.entries(state)
      .map(([iso, d]) => ({ iso, ...d, date: new Date(iso + "T00:00:00") }))
      .sort((a, b) => b.date - a.date); // mayor → menor
  }

  function buildPosterSVG(items, { title="GIRA", w=1080, pad=64 } = {}) {
    const headerH = 180, itemH = 80, footerH = 80;
    const h = headerH + items.length * itemH + footerH;
    const titleUpper = title.toUpperCase();

    const rows = items.map((it,i)=>{
      const y = headerH + i*itemH;
      const d = it.date;
      const wd = WD[d.getDay()];
      const day = String(d.getDate()).padStart(2,'0');
      const mon = MON[d.getMonth()];
      const hour = it.time ? ` · ${it.time}` : '';
      const line2 = `${wd} ${day} ${mon}${hour}` + (it.venue ? ` · ${trunc(it.venue,28)}` : '');
      const dot = TYPE_COLOR[it.type] || '#6b7280';
      const linkMark = hasLink(it.notes) ? ' 🔗' : '';

      return `
        <g>
          <circle cx="${w-pad}" cy="${y-12}" r="6" fill="${dot}" />
          <text x="${pad}" y="${y}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
                font-size="32" font-weight="700" fill="#e5e7eb" letter-spacing=".5">
            ${(it.city||'—').toUpperCase()}${linkMark}
          </text>
          <text x="${pad}" y="${y+26}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
                font-size="18" fill="#a3a3a3">
            ${line2}
          </text>
        </g>`;
    }).join("");

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="#0b0b0c"/>
            <stop offset="100%" stop-color="#111827"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)"/>
        <text x="${pad}" y="96"
          font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          font-size="56" font-weight="800" fill="#f4f4f5" letter-spacing="1.5">
          ${titleUpper}
        </text>
        <text x="${pad}" y="132"
          font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          font-size="20" fill="#9ca3af">
          ${new Date().getFullYear()}
        </text>
        ${rows}
        <text x="${pad}" y="${h-32}"
          font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          font-size="16" fill="#6b7280">
          Generado con Comedy Hub — Tour Planner
        </text>
      </svg>`;
    return { svg, w, h };
  }

  function downloadPNGFromSVG({ svg, w, h }, filename="gira.png") {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(png);
        a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
      }, "image/png");
    };
    img.src = url;
  }

  function makeInit() {
    let current = new Date();
    let state = loadState();
    let selectedISO = null;

    function renderWeekHeader(root){
      const weekEl = root.querySelector("#tpWeek");
      if (!weekEl) return;
      weekEl.innerHTML = WEEK.map(w => `<div>${w}</div>`).join("");
    }

    function renderMonth(root) {
      const monthEl = root.querySelector("#tpMonth");
      const calEl   = root.querySelector("#tpCalendar");
      const detailEl= root.querySelector("#tpDetail");
      if (!monthEl || !calEl || !detailEl) return;

      monthEl.textContent = fmtMonth.format(current);

      const y = current.getFullYear();
      const m = current.getMonth();
      const first = new Date(y, m, 1);
      const last  = new Date(y, m + 1, 0);
      const startWeekDay = (first.getDay() + 6) % 7; // Lunes=0
      const days = last.getDate();

      const cells = [];
      for (let i = 0; i < startWeekDay; i++)
        cells.push(`<div class="tp__cell tp__cell--muted"></div>`);

      for (let d = 1; d <= days; d++) {
        const iso = `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const datum = state[iso];
        const dotCls = TYPE_DOT_CLASS[datum?.type] || "";
        cells.push(
          `<button type="button" class="tp__cell tp-day" data-date="${iso}">
             <div class="tp__day">${d}</div>
             ${datum ? `
               <div class="tp__badges">
                 <span class="badge ${datum.type==='ok'?'badge--ok':datum.type==='tent'?'badge--tent':'badge--rehe'}">
                   ${TYPE_LABEL[datum.type] || ''}
                 </span>
               </div>
               <span class="absolute w-2 h-2 rounded-full ${dotCls}" style="position:absolute;top:.5rem;right:.5rem"></span>
             ` : ``}
           </button>`
        );
      }
      calEl.innerHTML = cells.join("");

      markSelection(calEl, selectedISO);
      calEl.querySelectorAll(".tp-day").forEach(btn => {
        btn.addEventListener("click", () => {
          selectedISO = btn.getAttribute("data-date");
          markSelection(calEl, selectedISO);
          hydrateDetail(root, selectedISO, state[selectedISO] || null);
        });
      });

      const today = toISO(new Date());
      (calEl.querySelector(`[data-date="${selectedISO}"]`)
        || calEl.querySelector(`[data-date="${today}"]`)
        || calEl.querySelector(".tp-day"))?.click();
    }

    function markSelection(calEl, iso) {
      calEl.querySelectorAll(".tp-day").forEach(b => b.classList.remove("ring-1","ring-sky-500"));
      if (!iso) return;
      calEl.querySelector(`[data-date="${iso}"]`)?.classList.add("ring-1","ring-sky-500");
    }

    function hydrateDetail(root, iso, data) {
      const dateEl = root.querySelector("#tpDate");
      if (dateEl) dateEl.textContent = iso || "—";
      root.querySelector("#tpCity").value  = data?.city  || "";
      root.querySelector("#tpVenue").value = data?.venue || "";
      root.querySelector("#tpTime").value  = data?.time  || "";
      root.querySelector("#tpType").value  = data?.type  || "ok";
      root.querySelector("#tpNotes").value = data?.notes || "";
    }

    return function TourPlanerInit() {
      const root = document.getElementById("tour-planer-app") || document.querySelector("[data-tp-root]");
      if (!root) { console.warn("[TourPlaner] root no encontrado"); return; }

      // Navegación mes
      root.querySelector("#tpPrev")?.addEventListener("click", () => { current.setMonth(current.getMonth() - 1); renderMonth(root); });
      root.querySelector("#tpNext")?.addEventListener("click", () => { current.setMonth(current.getMonth() + 1); renderMonth(root); });

      // Guardar / Limpiar
      root.querySelector("#tpSave")?.addEventListener("click", () => {
        if (!selectedISO) return;
        state[selectedISO] = {
          city:  root.querySelector("#tpCity").value.trim(),
          venue: root.querySelector("#tpVenue").value.trim(),
          time:  root.querySelector("#tpTime").value.trim(),
          type:  root.querySelector("#tpType").value,
          notes: root.querySelector("#tpNotes").value.trim(),
        };
        saveState(state);
        renderMonth(root);
      });

      root.querySelector("#tpClear")?.addEventListener("click", () => {
        if (!selectedISO) return;
        delete state[selectedISO];
        saveState(state);
        hydrateDetail(root, selectedISO, null);
        renderMonth(root);
      });

      // Exportar imagen / Copiar listado
      root.querySelector("#tpExportIMG")?.addEventListener("click", (e) => {
        e.preventDefault();
        const items = buildExportArrayFromState(state);
        const poster = buildPosterSVG(items, { title: "Gira" });
        downloadPNGFromSVG(poster, "gira.png");
      });

      root.querySelector("#tpExportCopy")?.addEventListener("click", async (e) => {
        e.preventDefault();
        const items = buildExportArrayFromState(state);
        const lines = items.map(it => {
          const d = it.date;
          const wd = WD[d.getDay()], day = String(d.getDate()).padStart(2,'0'), mon = MON[d.getMonth()];
          const hr = it.time ? ` · ${it.time}` : '';
          const tail = [it.venue].filter(Boolean).join(' · ');
          return `${wd} ${day} ${mon}${hr} — ${it.city || ''}${tail ? ' · ' + tail : ''}`;
        });
        await navigator.clipboard.writeText(lines.join("\n"));
        e.currentTarget.textContent = "¡Copiado!"; setTimeout(()=> e.currentTarget.textContent="Copiar", 1200);
      });

      // Botón "Cerrar" del bloque export (como está en el panel, simplemente limpia la selección)
      root.querySelector("#tpExportClose")?.addEventListener("click", (e) => {
        e.preventDefault();
        selectedISO = null;
        hydrateDetail(root, null, null);
        root.querySelectorAll(".tp-day").forEach(b => b.classList.remove("ring-1","ring-sky-500"));
      });

      // Primer render
      renderWeekHeader(root);
      renderMonth(root);
    };
  }

  window.TourPlanerInit = window.TourPlanerInit || makeInit();
})();
