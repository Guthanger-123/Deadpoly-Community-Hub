import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { SkeletonUtils } from "three/addons/utils/SkeletonUtils.js";

const $ = (id) => document.getElementById(id);

const statusBadge = $("statusBadge");
const viewerEl = $("viewer");
const dropHint = $("dropHint");

const basePathEl = $("basePath");
const loadBaseBtn = $("loadBaseBtn");
const resetBtn = $("resetBtn");
const screenshotBtn = $("screenshotBtn");

const fileInput = $("fileInput");
const localSlotSel = $("localSlotSel");

const slotSelects = {
  shirt: $("shirtSel"),
  pants: $("pantsSel"),
  shoes: $("shoesSel"),
  helmet: $("helmetSel"),
  mask: $("maskSel"),
  backpack: $("backpackSel"),
};

// ====== Configure your modular lists here ======
// Use local paths OR signed URLs (recommended for private storage).
// Each entry: { label, url }
// Put your FBX parts in /models/parts/... or use remote signed URLs.
const PARTS = {
  shirt: [
    { label: "— None —", url: "" },
    // { label:"Basic Shirt", url:"models/parts/shirts/Shirt_Basic.fbx" },
  ],
  pants: [
    { label: "— None —", url: "" },
  ],
  shoes: [
    { label: "— None —", url: "" },
  ],
  helmet: [
    { label: "— None —", url: "" },
    // { label:"Mk V Spartan Helmet (Blue)", url:"models/parts/helmets/TM_HaloMK5_Blue.fbx" },
  ],
  mask: [
    { label: "— None —", url: "" },
  ],
  backpack: [
    { label: "— None —", url: "" },
  ],
};

// Optional: fetch a manifest at runtime (great for signed URLs)
// If you build a private endpoint that returns JSON like PARTS, set this:
const REMOTE_MANIFEST_URL = ""; // e.g. "https://your-worker.yourdomain.com/manifest"

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

viewerEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0b0f);

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);
camera.position.set(1.6, 1.4, 2.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.1, 0);
controls.update();

const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.0);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(3, 6, 4);
scene.add(dir);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0x0f0f16, roughness: 1, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// Character root
const characterRoot = new THREE.Group();
scene.add(characterRoot);

// Slots hold groups, each slot gets replaced when swapped
const slots = {
  shirt: new THREE.Group(),
  pants: new THREE.Group(),
  shoes: new THREE.Group(),
  helmet: new THREE.Group(),
  mask: new THREE.Group(),
  backpack: new THREE.Group(),
};
Object.values(slots).forEach(g => characterRoot.add(g));

let baseModel = null;
let baseSkeleton = null;
let baseBoneMap = null;

const loader = new FBXLoader();

function setStatus(text) {
  statusBadge.textContent = text;
}

function sizeRenderer() {
  const w = viewerEl.clientWidth;
  const h = viewerEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", sizeRenderer);
sizeRenderer();

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

// ========== Skeleton helpers ==========
function findFirstSkeleton(root) {
  let skel = null;
  root.traverse((o) => {
    if (skel) return;
    if (o.isSkinnedMesh && o.skeleton) skel = o.skeleton;
  });
  return skel;
}

function buildBoneMap(skeleton) {
  const map = new Map();
  skeleton.bones.forEach(b => map.set(b.name, b));
  return map;
}

/**
 * Rebind all skinned meshes in `partRoot` to the base skeleton bones by bone name.
 * This is what makes modular armor/clothes follow the base rig.
 */
function rebindToBaseSkeleton(partRoot, baseSkel, baseMap) {
  const baseBones = baseSkel.bones;

  partRoot.traverse((o) => {
    if (!o.isSkinnedMesh || !o.skeleton) return;

    // Remap part bones -> base bones by name
    const remappedBones = o.skeleton.bones.map(b => baseMap.get(b.name)).filter(Boolean);

    if (remappedBones.length !== o.skeleton.bones.length) {
      // Bone name mismatch (part not rigged to same skeleton)
      console.warn("Bone mismatch on part:", o.name);
    }

    // Create a new skeleton referencing the base bones (same order as part skeleton)
    const newSkeleton = new THREE.Skeleton(remappedBones, o.skeleton.boneInverses);

    // Bind the skinned mesh to the new skeleton
    o.bind(newSkeleton, o.bindMatrix);

    // Ensure correct skinning settings
    o.frustumCulled = false;
    if (o.material) {
      o.material.skinning = true;
      o.material.needsUpdate = true;
    }
  });

  // Keep transforms sane
  partRoot.position.set(0, 0, 0);
  partRoot.rotation.set(0, 0, 0);
  partRoot.scale.set(1, 1, 1);
}

// ========== Loading ==========
async function loadFBX(urlOrObjectUrl) {
  return await new Promise((resolve, reject) => {
    loader.load(
      urlOrObjectUrl,
      (obj) => resolve(obj),
      undefined,
      (err) => reject(err)
    );
  });
}

function clearSlot(slotName) {
  const g = slots[slotName];
  while (g.children.length) g.remove(g.children[0]);
}

async function setSlotFromUrl(slotName, url) {
  clearSlot(slotName);
  if (!url) return;

  if (!baseSkeleton || !baseBoneMap) {
    alert("Load the base model first.");
    return;
  }

  setStatus(`Loading ${slotName}…`);

  try {
    // Clone to avoid skeleton/shared state issues
    const raw = await loadFBX(url);
    const part = SkeletonUtils.clone(raw);

    // Normalize part scale; FBX often comes in huge.
    // If your exports are consistent, set to 1.
    part.scale.set(0.01, 0.01, 0.01);

    rebindToBaseSkeleton(part, baseSkeleton, baseBoneMap);
    slots[slotName].add(part);

    setStatus("Ready");
  } catch (e) {
    console.error(e);
    setStatus("Load failed");
    alert(`Failed to load ${slotName} FBX.\nCheck URL / CORS / file path.\n\n${String(e)}`);
  }
}

async function loadBase() {
  const url = (basePathEl.value || "").trim();
  if (!url) return;

  setStatus("Loading base…");
  try {
    if (baseModel) {
      characterRoot.remove(baseModel);
      baseModel = null;
      baseSkeleton = null;
      baseBoneMap = null;
    }

    Object.keys(slots).forEach(clearSlot);

    const raw = await loadFBX(url);
    baseModel = SkeletonUtils.clone(raw);

    // Typical FBX import scale
    baseModel.scale.set(0.01, 0.01, 0.01);
    baseModel.position.set(0, 0, 0);
    baseModel.rotation.set(0, 0, 0);

    characterRoot.add(baseModel);

    baseSkeleton = findFirstSkeleton(baseModel);
    if (!baseSkeleton) {
      throw new Error("Base model has no SkinnedMesh/Skeleton. Export SK_BaseModel with skin/armature.");
    }
    baseBoneMap = buildBoneMap(baseSkeleton);

    // Auto-frame camera
    frameCharacter();

    setStatus("Ready");
  } catch (e) {
    console.error(e);
    setStatus("Base failed");
    alert(`Failed to load base FBX.\n${String(e)}`);
  }
}

function frameCharacter() {
  const box = new THREE.Box3().setFromObject(characterRoot);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 1.3;

  controls.target.copy(center);
  camera.position.set(center.x + dist * 0.6, center.y + dist * 0.5, center.z + dist);
  controls.update();
}

// ========== UI wiring ==========
function fillSelect(selectEl, list) {
  selectEl.innerHTML = "";
  list.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.url;
    opt.textContent = item.label;
    selectEl.appendChild(opt);
  });
}

async function initParts() {
  // Load from remote manifest if set; otherwise use PARTS constants.
  if (REMOTE_MANIFEST_URL) {
    setStatus("Loading manifest…");
    try {
      const res = await fetch(REMOTE_MANIFEST_URL, { cache: "no-store" });
      const json = await res.json();
      Object.keys(PARTS).forEach(k => (PARTS[k] = json[k] || PARTS[k]));
    } catch (e) {
      console.warn("Manifest fetch failed; using local PARTS.", e);
    }
    setStatus("Ready");
  }

  Object.keys(slotSelects).forEach((slot) => fillSelect(slotSelects[slot], PARTS[slot]));

  Object.keys(slotSelects).forEach((slot) => {
    slotSelects[slot].addEventListener("change", async () => {
      await setSlotFromUrl(slot, slotSelects[slot].value);
    });
  });

  document.querySelectorAll("[data-clear]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slot = btn.getAttribute("data-clear");
      clearSlot(slot);
      slotSelects[slot].value = "";
    });
  });
}

loadBaseBtn.addEventListener("click", loadBase);
resetBtn.addEventListener("click", async () => {
  await loadBase();
});

screenshotBtn.addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "character.png";
  a.href = renderer.domElement.toDataURL("image/png");
  a.click();
});

fileInput.addEventListener("change", async () => {
  const f = fileInput.files && fileInput.files[0];
  if (!f) return;

  const slot = localSlotSel.value;
  const objUrl = URL.createObjectURL(f);
  await setSlotFromUrl(slot, objUrl);

  // release after a bit (don’t revoke immediately while loader uses it)
  setTimeout(() => URL.revokeObjectURL(objUrl), 8000);
});

// Drag & drop into viewer
viewerEl.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dropHint.style.display = "block";
});
viewerEl.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropHint.style.display = "block";
});
viewerEl.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropHint.style.display = "none";
});
viewerEl.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropHint.style.display = "none";

  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!f) return;

  if (!String(f.name).toLowerCase().endsWith(".fbx")) {
    alert("Drop an .fbx file.");
    return;
  }

  const slot = localSlotSel.value;
  const objUrl = URL.createObjectURL(f);
  await setSlotFromUrl(slot, objUrl);
  setTimeout(() => URL.revokeObjectURL(objUrl), 8000);
});

await initParts();
await loadBase();
