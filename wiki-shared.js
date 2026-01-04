// Shared helpers for all wiki pages

function dpFileUrl(fileName){
  // Pull images from OFFICIAL wiki via Special:FilePath
  // Works well for hotlinking without downloading assets.
  return "https://deadpoly.wiki/Special:FilePath/" + encodeURIComponent(fileName);
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function buildPills(pillsEl, tags, onPick){
  pillsEl.innerHTML = "";
  const all = ["All", ...tags];
  all.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill" + (i === 0 ? " active" : "");
    b.textContent = t;
    b.onclick = () => {
      [...pillsEl.children].forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      onPick(t);
    };
    pillsEl.appendChild(b);
  });
}

function renderPage({
  title,
  data,
  columns,
  defaultView = "cards",
  countBadgeId = "countBadge",
  qId = "q",
  pillsId = "pills",
  gridId = "grid",
  tableId = "table",
  theadId = "thead",
  tbodyId = "tbody",
  gridBtnId = "gridBtn",
  tableBtnId = "tableBtn",
}){
  const countBadge = document.getElementById(countBadgeId);
  const qEl = document.getElementById(qId);
  const pillsEl = document.getElementById(pillsId);
  const gridEl = document.getElementById(gridId);
  const tableWrap = document.getElementById(tableId);
  const theadEl = document.getElementById(theadId);
  const tbodyEl = document.getElementById(tbodyId);
  const gridBtn = document.getElementById(gridBtnId);
  const tableBtn = document.getElementById(tableBtnId);

  let activeTag = "All";
  let view = defaultView;

  const allTags = [...new Set(data.flatMap(x => x.tags || []))].sort();
  buildPills(pillsEl, allTags, (t) => { activeTag = t; draw(); });

  function matches(item, q){
    if(!q) return true;
    const hay = (item.name + " " + (item.notes||"") + " " + (item.tags||[]).join(" ") + " " + Object.values(item).join(" "))
      .toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function filtered(){
    const q = qEl.value.trim();
    return data
      .filter(x => activeTag === "All" ? true : (x.tags || []).includes(activeTag))
      .filter(x => matches(x, q));
  }

  function drawCards(rows){
    gridEl.innerHTML = "";
    rows.forEach(x => {
      const div = document.createElement("div");
      div.className = "card";

      const imgHtml = x.image
        ? `<img referrerpolicy="no-referrer" loading="lazy" src="${dpFileUrl(x.image)}" alt="${escapeHtml(x.name)}">`
        : `<div class="muted small">no image</div>`;

      div.innerHTML = `
        <div class="thumb">${imgHtml}</div>
        <div style="min-width:0">
          <h3>${escapeHtml(x.name)}</h3>
          ${x.sub ? `<div class="meta">${escapeHtml(x.sub)}</div>` : ""}
          ${x.notes ? `<div class="meta">${escapeHtml(x.notes)}</div>` : ""}
          ${(x.tags && x.tags.length) ? `<div class="tags">${x.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        </div>
      `;
      gridEl.appendChild(div);
    });
  }

  function drawTable(rows){
    theadEl.innerHTML = `<tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr>`;
    tbodyEl.innerHTML = rows.map(x => {
      return `<tr>${
        columns.map(c => {
          if(c.key === "image"){
            return `<td style="width:92px">
              ${x.image ? `<img referrerpolicy="no-referrer" loading="lazy" src="${dpFileUrl(x.image)}" style="width:72px;height:72px;object-fit:contain;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25)">` : `<span class="muted small">—</span>`}
            </td>`;
          }
          return `<td>${escapeHtml(x[c.key] ?? "—")}</td>`;
        }).join("")
      }</tr>`;
    }).join("");
  }

  function setView(next){
    view = next;
    if(view === "cards"){
      tableWrap.style.display = "none";
      gridEl.style.display = "grid";
      gridBtn.classList.add("active");
      tableBtn.classList.remove("active");
    }else{
      gridEl.style.display = "none";
      tableWrap.style.display = "block";
      tableBtn.classList.add("active");
      gridBtn.classList.remove("active");
    }
    draw();
  }

  function draw(){
    const rows = filtered();
    countBadge.textContent = `${rows.length} items`;

    if(view === "cards"){
      drawCards(rows);
    }else{
      drawTable(rows);
    }
  }

  // wire controls
  qEl.addEventListener("input", draw);
  gridBtn.onclick = () => setView("cards");
  tableBtn.onclick = () => setView("table");

  // initial
  setView(view);
}
