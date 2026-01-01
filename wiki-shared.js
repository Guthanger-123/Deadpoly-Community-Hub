function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function cleanCell(s){
  if (!s) return "";
  return String(s)
    .replace(/\[\[File:[^\]]+\]\]/gi, "")       // remove file blocks inside cell
    .replace(/\[\[file:[^\]]+\]\]/gi, "")
    .replace(/\[\[|\]\]/g, "")
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")                   // remove html tags like <b>
    .replace(/\s+/g, " ")
    .replace(/\|\|+/g, "|")
    .trim();
}
function parseFirstWikiLink(cell){
  // returns {page, label} from a cell containing [[Page|Label]] or [[Page]]
  const m = String(cell).match(/\[\[([^\]]+)\]\]/);
  if (!m) return { page:"", label: cleanCell(cell) };
  const inner = m[1];
  const parts = inner.split("|").map(x => x.trim()).filter(Boolean);
  const page = parts[0] ?? "";
  const label = parts[1] ?? parts[0] ?? "";
  return { page: page.replace(/^:/,""), label };
}
function parseFirstFileName(cell){
  // handles [[File:Name.png]] or [[file:name.png | 250px]]
  const m = String(cell).match(/\[\[\s*(?:File|file)\s*:\s*([^|\]]+)/);
  return m ? m[1].trim() : "";
}
function officialFileUrl(fileName){
  if (!fileName) return "";
  return "https://deadpoly.wiki/wiki/Special:Redirect/file/" + encodeURIComponent(fileName.trim());
}
function officialPageUrl(page){
  if (!page) return "https://deadpoly.wiki/Main_Page";
  // deadpoly.wiki uses pretty paths like /Helmets not /wiki/Helmets
  const slug = page.trim().replace(/\s+/g, "_");
  return "https://deadpoly.wiki/" + encodeURIComponent(slug);
}
function parseWikitableRows(raw){
  // returns array of row arrays (cells), ignoring headers and captions
  const lines = String(raw).split(/\r?\n/).map(l => l.trim());
  const rows = [];
  for (const line of lines){
    if (!line) continue;
    if (line.startsWith("{|") || line.startsWith("|}") || line.startsWith("!")) continue;
    if (line.startsWith("|+")) continue;
    if (line === "|-" ) continue;
    if (line.startsWith("|-")) continue;
    if (!line.startsWith("|")) continue;

    // Remove leading "|"
    const body = line.replace(/^\|\s*/,"");

    // rows are generally "cell || cell || cell"
    const parts = body.split("||").map(p => p.trim()).filter(p => p.length>0 || body.includes("||"));
    if (parts.length >= 2) rows.push(parts);
  }
  return rows;
}
function makePills(container, values, onPick){
  container.innerHTML = "";
  const buttons = [];
  for (const v of values){
    const b = document.createElement("button");
    b.className = "pill" + (v.selected ? " active" : "");
    b.type = "button";
    b.textContent = v.label;
    b.addEventListener("click", () => {
      buttons.forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      onPick(v.value);
    });
    container.appendChild(b);
    buttons.push(b);
  }
}
