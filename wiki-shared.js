// Shared helpers for all local wiki pages

const OFFICIAL_FILEPATH = "https://deadpoly.wiki/Special:FilePath/";

function imgUrl(fileName){
  if(!fileName) return "";
  // MediaWiki Special:FilePath expects exact file name
  return OFFICIAL_FILEPATH + encodeURIComponent(fileName);
}

function slugId(s){
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

function setActiveNav(activeHref){
  document.querySelectorAll(".nav a").forEach(a=>{
    if(a.getAttribute("href") === activeHref) a.classList.add("active");
    else a.classList.remove("active");
  });
}

function buildPills(items, pillsEl, onChange){
  const tags = [...new Set(items.flatMap(i => i.tags || []))].sort();
  pillsEl.innerHTML = "";
  let active = "All";

  function make(label){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill" + (label===active ? " active" : "");
    b.textContent = label;
    b.onclick = ()=>{
      active = label;
      pillsEl.querySelectorAll(".pill").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      onChange(active);
    };
    return b;
  }

  pillsEl.appendChild(make("All"));
  tags.forEach(t=>pillsEl.appendChild(make(t)));

  return ()=>active;
}

function matchesQuery(item, q){
  if(!q) return true;
  const hay = [
    item.name,
    item.notes,
    ...(item.tags||[]),
    ...(item.search||[])
  ].join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderGrid(items, gridEl){
  gridEl.innerHTML = "";
  items.forEach(it=>{
    const id = it.id || slugId(it.name);
    const div = document.createElement("div");
    div.className = "card";
    div.id = id;

    const tagsHtml = (it.tags||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join("");
    const img = it.img ? `<img alt="" src="${imgUrl(it.img)}" onerror="this.style.display='none'">` : "";

    const kvPairs = [];
    // Cost block (optional)
    if(it.buy != null || it.sell != null){
      kvPairs.push({k:"Buy", v: it.buy ?? "—"});
      kvPairs.push({k:"Sell", v: it.sell ?? "—"});
    }
    // Any extra kv fields
    (it.kv||[]).forEach(p=>kvPairs.push(p));

    const kvHtml = kvPairs.length ? `
      <div class="kv">
        ${kvPairs.map(p=>`<div><b>${escapeHtml(p.k)}</b><br>${escapeHtml(String(p.v))}</div>`).join("")}
      </div>` : "";

    div.innerHTML = `
      <div class="row">
        <div class="thumb">${img || `<div class="small">no img</div>`}</div>
        <div style="min-width:0">
          <h3>${escapeHtml(it.name)}</h3>
          ${it.notes ? `<div class="small">${escapeHtml(it.notes)}</div>` : `<div class="small muted">—</div>`}
          ${tagsHtml ? `<div class="meta">${tagsHtml}</div>` : ""}
          ${kvHtml}
        </div>
      </div>
    `;
    gridEl.appendChild(div);
  });
}

function renderTable(items, tableHeadEl, tableBodyEl, columns){
  tableHeadEl.innerHTML = "";
  tableBodyEl.innerHTML = "";

  // header
  const trh = document.createElement("tr");
  columns.forEach(c=>{
    const th = document.createElement("th");
    th.textContent = c.label;
    trh.appendChild(th);
  });
  tableHeadEl.appendChild(trh);

  // rows
  items.forEach(it=>{
    const tr = document.createElement("tr");
    const id = it.id || slugId(it.name);
    tr.id = id;

    columns.forEach(c=>{
      const td = document.createElement("td");
      if(c.key === "img"){
        td.innerHTML = it.img
          ? `<div class="timg"><img alt="" src="${imgUrl(it.img)}" onerror="this.style.display='none'"></div>`
          : `<div class="timg"></div>`;
      } else if(c.key === "name"){
        td.innerHTML = `<b>${escapeHtml(it.name)}</b>`;
      } else {
        const val = (it[c.key] ?? "");
        td.textContent = String(val || "—");
      }
      tr.appendChild(td);
    });

    tableBodyEl.appendChild(tr);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function wirePage(opts){
  // opts: { title, items, columns, activeHref, placeholderText }
  setActiveNav(opts.activeHref);

  const qEl = document.getElementById("q");
  const pillsEl = document.getElementById("pills");
  const gridEl = document.getElementById("grid");
  const tableWrap = document.getElementById("table");
  const thead = document.getElementById("thead");
  const tbody = document.getElementById("tbody");
  const countBadge = document.getElementById("countBadge");
  const gridBtn = document.getElementById("gridBtn");
  const tableBtn = document.getElementById("tableBtn");

  let mode = "grid";
  function setMode(m){
    mode = m;
    if(mode === "grid"){
      gridEl.style.display = "";
      tableWrap.style.display = "none";
    } else {
      gridEl.style.display = "none";
      tableWrap.style.display = "";
    }
    render();
  }
  gridBtn.onclick = ()=>setMode("grid");
  tableBtn.onclick = ()=>setMode("table");

  const getActive = buildPills(opts.items, pillsEl, ()=>render());

  function render(){
    const q = (qEl.value || "").trim();
    const tag = getActive();

    const filtered = opts.items
      .filter(it => tag === "All" ? true : (it.tags||[]).includes(tag))
      .filter(it => matchesQuery(it, q));

    countBadge.textContent = `${filtered.length} items`;

    if(mode === "grid"){
      renderGrid(filtered, gridEl);
    } else {
      renderTable(filtered, thead, tbody, opts.columns);
    }
  }

  qEl.placeholder = opts.placeholderText || "Search...";
  qEl.addEventListener("input", render);

  // initial
  setMode("grid");
}
