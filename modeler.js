import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { SkeletonUtils } from "three/addons/utils/SkeletonUtils.js";

const $ = (id) => document.getElementById(id);

const statusBadge = $("statusBadge");
const viewerEl = $("viewer");
const overlay = $("overlay");
const overlayText = $("overlayText");
const errorBox = $("errorBox");
const errorText = $("errorText");

const resetBtn = $("resetBtn");
const screenshotBtn = $("screenshotBtn");

const inventoryBar = $("inventoryBar");
const slotsGrid = $("slotsGrid");

const modal = $("modal");
const modalTitle = $("modalTitle");
const modalSub = $("modalSub");
const modalClose = $("modalClose");
const modalGrid = $("modalGrid");
const modalSearch = $("modalSearch");
const modalClear = $("modalClear");

// ====== BASE MODEL (auto-loaded, no UI needed) ======
const BASE_MODEL_URL = "assets/models/SK_BaseModel.fbx";

// ====== SLOT DEFINITIONS (you asked for these) ======
const SLOT_DEFS = [
  { key:"primary1", label:"Primary 1" },
  { key:"primary2", label:"Primary 2" },
  { key:"primary3", label:"Primary 3" },
  { key:"pistol",   label:"Pistol" },

  { key:"helmet",   label:"Helmet" },
  { key:"glasses",  label:"Glasses" },
  { key:"earphones",label:"Earphones" },

  { key:"vest",     label:"Vest" },
  { key:"shirt",    label:"Shirt" },
  { key:"pants",    label:"Pants" },
  { key:"shoes",    label:"Shoes" },
  { key:"backpack", label:"Backpack" },

  { key:"acc1", label:"Accessory 1" },
  { key:"acc2", label:"Accessory 2" },
  { key:"acc3", label:"Accessory 3" },
  { key:"acc4", label:"Accessory 4" },
  { key:"acc5", label:"Accessory 5" },
  { key:"acc6", label:"Accessory 6" },
  { key:"acc7", label:"Accessory 7" },
];

// ====== ITEM CATALOG ======
// Put your real modular FBX parts here.
// Each item can optionally include a thumbnail image (png/jpg) you host in your repo.
// url can be local (recommended): "assets/models/parts/helmet_x.fbx"
const CATALOG = {
  helmet: [
    { name:"— None —", url:"", thumb:"", note:"" },
    // { name:"MK5 Helmet", url:"assets/models/parts/helmets/MK5.fbx", thumb:"assets/thumbs/MK5.png", note:"Blue" },
  ],
  glasses: [
    { name:"— None —", url:"", thumb:"", note:"" },
  ],
  earphones: [
    { name:"— None —", url:"", thumb:"", note:"" },
  ],
  vest: [
    { name:"— None —", url:"", thumb:"", note:"" },
  ],
  shirt: [
    { name:"— None —", url:"", thumb:"", note:"" },
  ],
  pants: [
    { name:"— None —", url:"", thumb:"", note:"" },
  ],
  shoes: [
    { name:"— None —", url:"", thumb:"", note:"" },
  ],
  backpack: [
    { name:"— None —", url:"", thumb:"", note:"" },
  ],

  // weapons / accessories (same system)
  primary1: [{ name:"— None —", url:"", thumb:"", note:"" }],
  primary2: [{ name:"— None —", url:"", thumb:"", note:"" }],
  primary3: [{ name:"— None —", url:"", thumb:"", note:"" }],
  pistol:   [{ name:"— None —", url:"", thumb:"", note:"" }],

  acc1: [{ name:"— None —", url:"", thumb:"", note:"" }],
  acc2: [{ name:"— None —", url:"", thumb:"", note:"" }],
  acc3: [{ name:"— None —", url:"", thumb:"", note:"" }],
  acc4: [{ name:"— None —", url:"", thumb:"", note:"" }],
  acc5: [{ name:"— None —", url:"", thumb:"", note:"" }],
  acc6: [{ name:"— None —", url:"", thumb:"", note:"" }],
  acc7: [{ name:"— None —", url:"", thumb:"", note:"" }],
};

// ====== Three.js setup ======
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewerEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070b);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);
camera.position.set(1.6, 1.5, 2.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.1, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.update();

scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(3, 6, 4);
scene.add(dir);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x0f0f16, roughness: 1, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Root
const characterRoot = new THREE.Group();
scene.add(characterRoot);

// Slot groups attached to root
const slotGroups = {};
SLOT_DEFS.forEach(s => slotGroups[s.key] = new THREE.Group());
Object.values(slotGroups).forEach(g => characterRoot.add(g));

let baseModel = null;
let baseSkeleton = null;
let baseBoneMap = null;

const loader = new FBXLoader();

function setStatus(text){ statusBadge.textContent = text; }
function showOverlay(text){
  overlay.style.display = "flex";
  overlayText.textContent = text || "";
}
function hideOverlay(){ overlay.style.display = "none"; }
function showError(msg){
  errorBox.style.display = "block";
  errorText.textContent = msg;
}
function hideError(){ errorBox.style.display = "none"; errorText.textContent = ""; }

function sizeRenderer(){
  const w = viewerEl.clientWidth;
  const h = viewerEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", sizeRenderer);
sizeRenderer();

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ====== Skeleton helpers ======
function findFirstSkeleton(root){
  let skel = null;
  root.traverse(o => {
    if (skel) return;
    if (o.isSkinnedMesh && o.skeleton) skel = o.skeleton;
  });
  return skel;
}
function buildBoneMap(skeleton){
  const map = new Map();
  skeleton.bones.forEach(b => map.set(b.name, b));
  return map;
}

function rebindToBaseSkeleton(partRoot, baseSkel, baseMap){
  partRoot.traverse((o) => {
    if (!o.isSkinnedMesh || !o.skeleton) return;

    const remappedBones = o.skeleton.bones.map(b => baseMap.get(b.name)).filter(Boolean);
    const newSkeleton = new THREE.Skeleton(remappedBones, o.skeleton.boneInverses);

    o.bind(newSkeleton, o.bindMatrix);
    o.frustumCulled = false;

    if (o.material){
      o.material.skinning = true;
      o.material.needsUpdate = true;
    }
  });

  partRoot.position.set(0,0,0);
  partRoot.rotation.set(0,0,0);
  partRoot.scale.set(1,1,1);
}

async function loadFBX(url){
  return await new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function clearSlot(slotKey){
  const g = slotGroups[slotKey];
  while (g.children.length) g.remove(g.children[0]);
}

async function setSlotItem(slotKey, item){
  clearSlot(slotKey);
  if (!item || !item.url) return;

  if (!baseSkeleton || !baseBoneMap){
    showError("Base skeleton missing. Base model must be a skinned mesh with an armature.");
    return;
  }

  setStatus(`Loading ${slotKey}…`);
  showOverlay(item.url);

  try{
    const raw = await loadFBX(item.url);
    const part = SkeletonUtils.clone(raw);

    // FBX scale normalization
    part.scale.set(0.01, 0.01, 0.01);

    // If it’s skinned, rebind to base skeleton
    rebindToBaseSkeleton(part, baseSkeleton, baseBoneMap);

    slotGroups[slotKey].add(part);

    hideOverlay();
    setStatus("Ready");
    setSlotValueText(slotKey, item.name);
  }catch(e){
    hideOverlay();
    setStatus("Load failed");
    showError(
      `Slot "${slotKey}" failed.\n` +
      `URL: ${item.url}\n\n` +
      `Error: ${String(e)}`
    );
  }
}

function frameCharacter(){
  const box = new THREE.Box3().setFromObject(characterRoot);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const dist = maxDim * 1.3;

  controls.target.copy(center);
  camera.position.set(center.x + dist * 0.6, center.y + dist * 0.55, center.z + dist);
  controls.update();
}

// ====== Load base automatically ======
async function loadBase(){
  hideError();
  setStatus("Loading base…");
  showOverlay(BASE_MODEL_URL);

  try{
    if (baseModel){
      characterRoot.remove(baseModel);
      baseModel = null;
      baseSkeleton = null;
      baseBoneMap = null;
    }

    // clear all slots
    Object.keys(slotGroups).forEach(clearSlot);

    const raw = await loadFBX(BASE_MODEL_URL);
    baseModel = SkeletonUtils.clone(raw);
    baseModel.scale.set(0.01, 0.01, 0.01);
    baseModel.position.set(0,0,0);
    baseModel.rotation.set(0,0,0);

    characterRoot.add(baseModel);

    baseSkeleton = findFirstSkeleton(baseModel);
    if (!baseSkeleton){
      throw new Error("Base FBX has no SkinnedMesh/Skeleton. Export SK_BaseModel with skin + bones.");
    }
    baseBoneMap = buildBoneMap(baseSkeleton);

    hideOverlay();
    setStatus("Ready");
    frameCharacter();

    // set UI values back to none
    SLOT_DEFS.forEach(s => setSlotValueText(s.key, "None"));
  }catch(e){
    hideOverlay();
    setStatus("Base failed");
    showError(
      `Base model failed.\nURL: ${BASE_MODEL_URL}\n\n` +
      `Error: ${String(e)}`
    );
  }
}

// ====== UI: slots ======
const slotValueEls = new Map();

function setSlotValueText(slotKey, text){
  const el = slotValueEls.get(slotKey);
  if (el) el.textContent = text || "None";
}

function buildSlotsUI(){
  slotsGrid.innerHTML = "";
  SLOT_DEFS.forEach(def => {
    const card = document.createElement("div");
    card.className = "slotCard";

    const top = document.createElement("div");
    top.className = "slotTop";

    const name = document.createElement("div");
    name.className = "slotName";
    name.textContent = def.label;

    top.appendChild(name);

    const value = document.createElement("div");
    value.className = "slotValue";
    value.textContent = "None";
    slotValueEls.set(def.key, value);

    const btnRow = document.createElement("div");
    btnRow.className = "slotBtns";

    const pickBtn = document.createElement("button");
    pickBtn.className = "slotBtn";
    pickBtn.type = "button";
    pickBtn.textContent = "Pick";
    pickBtn.onclick = () => openPicker(def.key, def.label);

    const clearBtn = document.createElement("button");
    clearBtn.className = "slotBtn danger";
    clearBtn.type = "button";
    clearBtn.textContent = "Clear";
    clearBtn.onclick = () => {
      clearSlot(def.key);
      setSlotValueText(def.key, "None");
    };

    btnRow.appendChild(pickBtn);
    btnRow.appendChild(clearBtn);

    card.appendChild(top);
    card.appendChild(value);
    card.appendChild(btnRow);

    slotsGrid.appendChild(card);
  });
}

// ====== UI: modal picker ======
let currentSlotKey = null;

function openPicker(slotKey, label){
  currentSlotKey = slotKey;
  modalTitle.textContent = `Select: ${label}`;
  modalSub.textContent = `Slot key: ${slotKey}`;
  modalSearch.value = "";
  renderPicker();
  modal.setAttribute("aria-hidden", "false");
}

function closePicker(){
  modal.setAttribute("aria-hidden", "true");
  currentSlotKey = null;
}

function renderPicker(){
  const slotKey = currentSlotKey;
  if (!slotKey) return;

  const list = CATALOG[slotKey] || [{ name:"— None —", url:"", thumb:"", note:"" }];
  const q = modalSearch.value.trim().toLowerCase();

  const filtered = list.filter(it => {
    if (!q) return true;
    return (it.name || "").toLowerCase().includes(q) || (it.note || "").toLowerCase().includes(q);
  });

  modalGrid.innerHTML = "";
  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "pickCard";

    const thumb = document.createElement("div");
    thumb.className = "pickThumb";

    if (item.thumb){
      const img = document.createElement("img");
      img.src = item.thumb;
      img.alt = "";
      img.onerror = () => { thumb.innerHTML = `<div class="pickTxt">FBX</div>`; };
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = `<div class="pickTxt">FBX</div>`;
    }

    const meta = document.createElement("div");
    meta.className = "pickMeta";
    meta.innerHTML = `
      <div class="pickName">${escapeHtml(item.name || "Item")}</div>
      <div class="pickNote">${escapeHtml(item.note || "")}</div>
    `;

    card.appendChild(thumb);
    card.appendChild(meta);

    card.onclick = async () => {
      closePicker();
      await setSlotItem(slotKey, item);
    };

    modalGrid.appendChild(card);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

modalClose.onclick = closePicker;
modal.addEventListener("click", (e) => { if (e.target === modal) closePicker(); });
modalSearch.addEventListener("input", renderPicker);

modalClear.onclick = () => {
  if (!currentSlotKey) return;
  clearSlot(currentSlotKey);
  setSlotValueText(currentSlotKey, "None");
  closePicker();
};

// ====== Inventory strip (visual quick picks) ======
function buildInventoryBar(){
  // Show a mixed set of items from the catalog (first non-empty ones)
  const flat = [];
  Object.keys(CATALOG).forEach(k => {
    (CATALOG[k] || []).forEach(it => {
      if (it && it.url) flat.push({ slot:k, ...it });
    });
  });

  // If empty, show placeholders so the UI still looks like your screenshot
  inventoryBar.innerHTML = "";
  const count = 10;
  for (let i=0; i<count; i++){
    const cell = document.createElement("div");
    cell.className = "invCell";

    const it = flat[i];
    if (it && it.thumb){
      const img = document.createElement("img");
      img.src = it.thumb;
      img.alt = "";
      img.onerror = () => { cell.innerHTML = `<div class="invTxt">item</div>`; };
      cell.appendChild(img);
    } else {
      cell.innerHTML = `<div class="invTxt">${it ? "FBX" : "slot"}</div>`;
    }

    if (it){
      cell.title = `${it.name} → ${it.slot}`;
      cell.onclick = () => openPicker(it.slot, it.slot);
    }

    inventoryBar.appendChild(cell);
  }
}

// ====== Buttons ======
resetBtn.onclick = async () => { await loadBase(); };
screenshotBtn.onclick = () => {
  const a = document.createElement("a");
  a.download = "customize-character.png";
  a.href = renderer.domElement.toDataURL("image/png");
  a.click();
};

// ====== Boot ======
buildSlotsUI();
buildInventoryBar();
await loadBase();
