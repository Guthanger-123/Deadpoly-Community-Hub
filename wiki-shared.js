// =========================
// FILE: wiki-shared.js
// Shared helpers for all local wiki pages
// =========================

const OFFICIAL_FILEPATH = "https://deadpoly.wiki/Special:FilePath/";

// ---------- URL + IDs ----------
function imgUrl(fileName) {
  const f = String(fileName || "").trim();
  if (!f) return "";
  // MediaWiki Special:FilePath wants the exact filename; encode for spaces etc.
  return OFFICIAL_FILEPATH + encodeURIComponent(f);
}

function slugId(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Normalize item so your pages can use either `image` or `img`
function normItem(it) {
  const item = it || {};
  const name = String(item.name || "").trim();
  const image = String((item.image ?? item.img ?? "") || "").trim();

  const tags = Array.isArray(item.tags) ? item.tags : [];
  const notes = String(item.notes || "").trim();
  const id = String(item.id || slugId(name)).trim();

  // IMPORTANT: buy/sell can be null/undefined/"" — render as "—"
  const buy = (item.buy === null || item.buy === undefined || String(item.buy).trim() === "")
    ? null
    : String(item.buy);

  const sell = (item.sell === null || item.sell === undefined || String(item.sell).trim() === "")
    ? null
    : String(item.sell);

  const kv = Array.isArray(item.kv) ? item.kv : [];
  const search = Array.isArray(item.search) ? item.search : [];

  return { ...item, name, image, tags, notes, id, buy, sell, kv, search };
}

// ---------- Nav ----------
function setActiveNav(activeHref) {
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.getAttribute("href") === activeHref) a.classList.add("active");
    else a.classList.remove("active");
  });
}

// ---------- Pills / Filters ----------
function buildPills(items, pillsEl, onChange) {
  const tags = [...new Set(items.flatMap((i) => i.tags || []))].sort();
  pillsEl.innerHTML = "";
  let active = "All";

  function make(label) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pill" + (label === active ? " active" : "");
    b.textContent = label;
    b.onclick = () => {
      active = label;
      pillsEl.querySelectorAll(".pill").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      onChange(active);
    };
    return b;
  }

  pillsEl.appendChild(make("All"));
  tags.forEach((t) => pillsEl.appendChild(make(t)));

  return () => active;
}

// ---------- Search ----------
function matchesQuery(item, q) {
  const query = String(q || "").trim().toLowerCase();
  if (!query) return true;

  // Search should match NAME even if you typed full human text,
  // and also match ID slugs, notes, tags, and any extra search tokens.
  const hay = [
    item.name || "",
    item.id || "",
    item.notes || "",
    ...(item.tags || []),
    ...(item.search || []),
  ]
    .join(" ")
    .toLowerCase();

  return hay.includes(query);
}

// ---------- Render helpers ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function moneyCell(val) {
  // unified display so null/undefined/"" become —
  if (val === null || val === undefined) return "—";
  const t = String(val).trim();
  return t ? t : "—";
}

function safeText(v) {
  const t = String(v ?? "").trim();
  return t ? t : "—";
}

function renderGrid(items, gridEl) {
  gridEl.innerHTML = "";

  items.forEach((raw) => {
    const it = normItem(raw);
    const div = document.createElement("div");
    div.className = "card";
    div.id = it.id;

    const tagsHtml = (it.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

    const imgHtml = it.image
      ? `<img alt="${escapeHtml(it.name)}" src="${imgUrl(it.image)}" onerror="this.style.display='none'">`
      : "";

    // Cost + extra kv blocks
    const kvPairs = [];
    kvPairs.push({ k: "Buy", v: moneyCell(it.buy) });
    kvPairs.push({ k: "Sell", v: moneyCell(it.sell) });
    (it.kv || []).forEach((p) => {
      if (!p) return;
      if (p.k === undefined || p.v === undefined) return;
      kvPairs.push({ k: String(p.k), v: String(p.v) });
    });

    const kvHtml = kvPairs.length
      ? `
        <div class="kv">
          ${kvPairs
            .map(
              (p) =>
                `<div><b>${escapeHtml(p.k)}</b><br>${escapeHtml(String(p.v))}</div>`
            )
            .join("")}
        </div>`
      : "";

    div.innerHTML = `
      <div class="row">
        <div class="thumb">
          ${imgHtml || `<div class="small">no img</div>`}
        </div>
        <div style="min-width:0">
          <h3>${escapeHtml(it.name)}</h3>
          ${
            it.notes
              ? `<div class="small">${escapeHtml(it.notes)}</div>`
              : `<div class="small muted">—</div>`
          }
          ${tagsHtml ? `<div class="meta">${tagsHtml}</div>` : ""}
          ${kvHtml}
        </div>
      </div>
    `;

    gridEl.appendChild(div);
  });
}

function renderTable(items, tableHeadEl, tableBodyEl, columns) {
  tableHeadEl.innerHTML = "";
  tableBodyEl.innerHTML = "";

  // header
  const trh = document.createElement("tr");
  columns.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c.label;
    trh.appendChild(th);
  });
  tableHeadEl.appendChild(trh);

  // rows
  items.forEach((raw) => {
    const it = normItem(raw);
    const tr = document.createElement("tr");
    tr.id = it.id;

    columns.forEach((c) => {
      const td = document.createElement("td");

      if (c.key === "img" || c.key === "image") {
        td.innerHTML = it.image
          ? `<div class="timg"><img alt="${escapeHtml(it.name)}" src="${imgUrl(it.image)}" onerror="this.style.display='none'"></div>`
          : `<div class="timg"></div>`;
      } else if (c.key === "name") {
        td.innerHTML = `<b>${escapeHtml(it.name)}</b>`;
      } else if (c.key === "buy") {
        td.textContent = moneyCell(it.buy);
      } else if (c.key === "sell") {
        td.textContent = moneyCell(it.sell);
      } else {
        const val = it[c.key];
        td.textContent = safeText(val);
      }

      tr.appendChild(td);
    });

    tableBodyEl.appendChild(tr);
  });
}

// ---------- Page wiring ----------
function wirePage(opts) {
  // opts: { title, items, columns, activeHref, placeholderText, defaultMode }
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

  const all = (opts.items || []).map(normItem);

  let mode = (opts.defaultMode || "grid").toLowerCase() === "table" ? "table" : "grid";

  function setMode(m) {
    mode = m;
    if (mode === "grid") {
      gridEl.style.display = "";
      tableWrap.style.display = "none";
    } else {
      gridEl.style.display = "none";
      tableWrap.style.display = "";
    }
    render();
  }

  if (gridBtn) gridBtn.onclick = () => setMode("grid");
  if (tableBtn) tableBtn.onclick = () => setMode("table");

  const getActive = buildPills(all, pillsEl, () => render());

  function render() {
    const q = String(qEl?.value || "").trim();
    const tag = getActive();

    const filtered = all
      .filter((it) => (tag === "All" ? true : (it.tags || []).includes(tag)))
      .filter((it) => matchesQuery(it, q));

    if (countBadge) countBadge.textContent = `${filtered.length} items`;

    if (mode === "grid") {
      renderGrid(filtered, gridEl);
    } else {
      renderTable(filtered, thead, tbody, opts.columns || []);
    }
  }

  if (qEl) {
    qEl.placeholder = opts.placeholderText || "Search...";
    qEl.addEventListener("input", render);
  }

  // initial
  setMode(mode);
}

