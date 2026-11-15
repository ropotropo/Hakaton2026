import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './rocket-workshop.css';

// Educational, fictional components. No catalog values represent real hardware.
const G0 = 9.80665;
const STORAGE_KEY = 'kineti-core.rocket-workshop.v1';
const FORMAT = 'kineti-core-rocket';
const LIMIT = 100;
const TYPES = Object.freeze({
  capsule: { label: 'Capsule', radius: 1, length: 2, density: 320 },
  tank: { label: 'Fuel tank', radius: 1, length: 4, density: 55 },
  engine: { label: 'Engine', radius: .65, length: 1.3, density: 380, isp: 310, thrust: 450000 },
  booster: { label: 'Booster', radius: .5, length: 4, density: 90, isp: 260, thrust: 180000 },
  fairing: { label: 'Fairing', radius: 1.1, length: 2.5, density: 35 },
  solar: { label: 'Solar panel', radius: .8, length: 2.5, density: 18 },
  legs: { label: 'Landing leg', radius: .35, length: 2, density: 140 },
  separator: { label: 'Separator', radius: 1, length: .25, density: 190 },
});
const axial = type => ['capsule', 'tank', 'fairing', 'separator'].includes(type);

function validateDesign(value) {
  if (!value || value.format !== FORMAT || value.version !== 1 || !Array.isArray(value.parts)) {
    throw new Error('Expected a Kinetic Core rocket design, version 1.');
  }
  if (value.parts.length > LIMIT) throw new Error('A design can contain at most 100 parts.');
  const parts = value.parts.map(part => {
    if (!part || !Object.hasOwn(TYPES, part.type)) throw new Error('Unknown component type.');
    if (!Number.isFinite(part.radius) || part.radius < .1 || part.radius > 5 ||
        !Number.isFinite(part.length) || part.length < .1 || part.length > 20) {
      throw new Error('Invalid dimensions: radius must be 0.1–5 m; length 0.1–20 m.');
    }
    // Reconstruct trusted fields only; never accept imported mass, thrust or IDs.
    return { type: part.type, radius: part.radius, length: part.length };
  });
  return parts;
}

function estimate(parts) {
  let dry = 0, fuel = 0, thrust = 0, exhaustFlow = 0;
  for (const p of parts) {
    const spec = TYPES[p.type];
    const volume = Math.PI * p.radius ** 2 * p.length;
    dry += volume * spec.density;
    if (p.type === 'tank' || p.type === 'booster') fuel += volume * .85 * 800;
    if (spec.thrust) {
      const force = spec.thrust * (p.radius / spec.radius) ** 2;
      thrust += force;
      exhaustFlow += force / (spec.isp * G0);
    }
  }
  const wet = dry + fuel;
  return { dry, fuel, wet, thrust, twr: wet ? thrust / (wet * G0) : 0,
    deltaV: dry && fuel && exhaustFlow ? thrust / exhaustFlow * Math.log(wet / dry) : 0 };
}

/** Independent editor. onOpen must pause flight and clear held flight inputs.
 * onClose should return to paused flight, never automatically resume it.
 * No custom design is passed to the simulation or mapped to a flight preset.
 */
export function createRocketWorkshop({ onOpen = () => {}, onClose = () => {} } = {}) {
  if (typeof onOpen !== 'function' || typeof onClose !== 'function') throw new TypeError('Workshop callbacks must be functions.');
  const panel = document.createElement('dialog');
  panel.className = 'rocket-workshop';
  panel.setAttribute('aria-label', 'Rocket engineering workshop');
  panel.innerHTML = `
    <header class="rw-header"><div><span>Kinetic Core · Engineering</span><h1>Rocket workshop</h1></div><button type="button" data-action="close">Back to game</button></header>
    <p class="rw-boundary"><strong>Independent engineering sandbox.</strong> The current flight simulation does not yet consume your custom design. No custom launch is available here.</p>
    <div class="rw-layout">
      <aside class="rw-palette" aria-label="Component palette"><h2>Add hardware</h2><p>Click to append, or drag into the scene. Every component is independent.</p><div class="rw-palette-grid">${Object.entries(TYPES).map(([type, spec]) => `<button type="button" draggable="true" data-part="${type}"><span class="rw-icon rw-icon-${type}" aria-hidden="true"></span>${spec.label}<small>Add component +</small></button>`).join('')}</div></aside>
      <section class="rw-scene" aria-label="Vehicle inspection"><canvas tabindex="0" aria-label="3D rocket. Drag to orbit, right-drag to pan, scroll to zoom. Click a component to select it."></canvas><div class="rw-scene-top"><span data-count>0 / 100 components</span><button type="button" data-action="frame">Frame design</button></div><p class="rw-empty">Start with any component.<br>Build your own sequence.</p><p class="rw-scene-help">Drag to orbit · Right-drag to pan · Scroll to zoom<br>Click hardware to select · Dimensions in metres</p><p class="rw-webgl" hidden>3D preview is unavailable. Component editing and local saves still work.</p></section>
      <aside class="rw-inspector" aria-label="Assembly and instruments"><h2>Assembly sequence</h2><p>Top to bottom. Engines and side hardware attach to the preceding core part; matching hardware shares a ring. Without a core, they share an origin.</p><ol class="rw-parts" aria-label="Installed components"></ol>
      <fieldset class="rw-dimensions" disabled><legend data-selected>No component selected</legend><label>Radius / half-width (m)<input data-dimension="radius" type="number" min="0.1" max="5" step="0.05" value="1"></label><label>Length (m)<input data-dimension="length" type="number" min="0.1" max="20" step="0.05" value="1"></label><button type="button" data-action="duplicate">Duplicate selected</button><button type="button" data-action="delete">Delete selected</button></fieldset>
      <h2>Engineering estimate</h2><dl class="rw-stats"></dl><details class="rw-assumptions"><summary>Fictional model & assumptions</summary><p>All hardware values are invented for this sandbox. Reference volume V = πr²L, including accessories. Dry mass = V × type density (kg/m³): capsule 320, tank 55, engine 380, booster 90, fairing 35, solar 18, leg 140, separator 190. Tank and booster fuel = V × 0.85 × 800 kg/m³.</p><p>Engine: 450 kN at radius 0.65 m, Isp 310 s. Booster: 180 kN at radius 0.5 m, Isp 260 s. Thrust scales with radius². TWR uses total initial mass and Earth g₀ = 9.80665 m/s².</p><p>Ideal Δv = effective exhaust velocity × ln(wet/dry). Effective exhaust velocity = total thrust / total mass flow; all fuel is treated as shared and all engines fire together. No staging, burn sequencing, drag, gravity loss, structural checks, solar power or landing stability is simulated. Separators are visual mass only. An estimate is not launch validation.</p></details></aside>
    </div>
    <footer class="rw-footer"><div class="rw-file-actions"><button type="button" class="rw-primary" data-action="save">Save locally</button><button type="button" data-action="load">Load local save</button><button type="button" data-action="export">Export JSON</button><button type="button" data-action="import">Import JSON</button><input type="file" accept=".json,application/json" hidden data-import></div><p role="status" aria-live="polite" data-status>Unsaved workspace · 100 component limit</p><small>Editor shortcuts: Ctrl/⌘ S save · D duplicate · Delete remove · F frame · Esc close. Flight controls are blocked.</small></footer>`;
  document.body.append(panel);
  const $ = selector => panel.querySelector(selector);
  const canvas = $('canvas'), viewport = $('.rw-scene'), list = $('.rw-parts');
  let parts = [], selected = -1, active = false, destroyed = false;
  let previousFocus, previousOverflow, animation, renderer, controls, scene, camera, root;
  let fileRevision = 0, pointerStart, lastWidth = 0, lastHeight = 0;
  const listeners = new AbortController();
  const listen = (target, event, handler, options = {}) => target.addEventListener(event, handler, { ...options, signal: listeners.signal });
  const status = message => { $('[data-status]').textContent = message; };
  const documentValue = () => ({ format: FORMAT, version: 1, parts: parts.map(p => ({ ...p })) });

  function initScene() {
    if (renderer || scene) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      camera = new THREE.PerspectiveCamera(42, 1, .05, 20000);
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = false;
      controls.minDistance = .5;
      controls.maxDistance = 10000;
      const key = new THREE.DirectionalLight(0xfff5e7, 3.5);
      key.position.set(12, 22, 18);
      const rim = new THREE.DirectionalLight(0x9bcaff, 2);
      rim.position.set(-15, 10, -10);
      scene.add(key, rim, new THREE.HemisphereLight(0xb5c2d7, 0x262626, 1.5));
      root = new THREE.Group();
      scene.add(root);
    } catch {
      renderer?.dispose();
      renderer = null;
      $('.rw-webgl').hidden = false;
      status('3D is unavailable on this device. You can still edit and save.');
    }
  }

  function clearMeshes() {
    root?.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    root?.clear();
  }

  function rebuild() {
    if (!root) return;
    clearMeshes();
    const corePositions = new Map();
    let height = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (axial(parts[i].type)) {
        corePositions.set(i, height + parts[i].length / 2);
        height += parts[i].length;
      }
    }
    const attachments = parts.map((p, i) => {
      let anchor = i - 1;
      while (anchor >= 0 && !axial(parts[anchor].type)) anchor--;
      return anchor;
    });
    parts.forEach((p, index) => {
      const group = new THREE.Group();
      group.userData.partIndex = index;
      const r = p.radius, l = p.length;
      const selectedColor = index === selected ? 0xe7f1ff : 0xbfc3c9;
      const metal = (color = selectedColor) => new THREE.MeshStandardMaterial({ color, metalness: .65, roughness: .34, emissive: index === selected ? 0x14283d : 0, emissiveIntensity: .28 });
      const mesh = (geometry, color, x = 0, y = 0, z = 0) => {
        const object = new THREE.Mesh(geometry, metal(color));
        object.position.set(x, y, z);
        group.add(object);
        return object;
      };
      if (p.type === 'capsule' || p.type === 'fairing') {
        mesh(new THREE.CylinderGeometry(p.type === 'capsule' ? r * .35 : .02, r, l, 36));
        if (p.type === 'capsule') mesh(new THREE.BoxGeometry(r * .42, l * .22, .08), 0x182c41, 0, .1 * l, r * .77);
      } else if (p.type === 'tank' || p.type === 'separator' || p.type === 'booster') {
        mesh(new THREE.CylinderGeometry(r, r, l, 36), p.type === 'separator' ? 0x55565b : selectedColor);
        for (const y of [-l * .4, l * .4]) mesh(new THREE.CylinderGeometry(r * 1.025, r * 1.025, Math.min(.09, l * .08), 36), 0x4d5056, 0, y);
        if (p.type === 'booster') {
          mesh(new THREE.ConeGeometry(r, l * .18, 32), undefined, 0, l * .59);
          mesh(new THREE.CylinderGeometry(r * .35, r * .65, l * .14, 24, 1, true), 0x505156, 0, -l * .57);
        }
      } else if (p.type === 'engine') {
        mesh(new THREE.CylinderGeometry(r * .45, r * .45, l * .38, 24), undefined, 0, l * .31);
        mesh(new THREE.CylinderGeometry(r * .28, r, l * .65, 36, 1, true), 0x656971, 0, -l * .175);
        mesh(new THREE.CylinderGeometry(r * .85, r * .85, .035, 32), 0x151519, 0, -l * .48);
      } else if (p.type === 'solar') {
        mesh(new THREE.BoxGeometry(r * 2, l, .07), 0x25476c);
        for (let y = -3; y <= 3; y++) mesh(new THREE.BoxGeometry(r * 2, .018, .085), 0x9babbc, 0, y * l / 7);
      } else {
        const leg = mesh(new THREE.CylinderGeometry(r * .18, r * .12, l, 12));
        leg.rotation.z = -.45;
        mesh(new THREE.BoxGeometry(r * 2, .1, r * 1.5), 0x656971, l * .22, -l * .45);
      }
      if (axial(p.type)) group.position.y = corePositions.get(index) - height / 2;
      else {
        const anchor = attachments[index];
        const core = parts[anchor];
        const peers = parts.map((part, i) => part.type === p.type && attachments[i] === anchor ? i : -1).filter(i => i >= 0);
        const angle = peers.indexOf(index) / peers.length * Math.PI * 2;
        const anchorY = anchor >= 0 ? corePositions.get(anchor) - height / 2 : 0;
        const distance = p.type === 'engine' ? (peers.length === 1 ? 0 : r * peers.length / Math.PI) : (core?.radius || 1) + r + .15;
        group.position.set(Math.cos(angle) * distance, anchorY, Math.sin(angle) * distance);
        if (p.type === 'engine') group.position.y -= (core?.length || 0) / 2 + l / 2;
        if (p.type === 'legs') group.position.y -= (core?.length || 0) / 2;
        if (p.type === 'solar') group.rotation.y = -angle;
      }
      root.add(group);
    });
  }

  function frameDesign() {
    if (!root || !camera) return;
    const box = new THREE.Box3().setFromObject(root);
    const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
    const size = box.isEmpty() ? new THREE.Vector3(4, 6, 4) : box.getSize(new THREE.Vector3());
    const distance = Math.max(size.length(), 3) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.min(camera.aspect || 1, 1) * 1.2;
    controls.target.copy(center);
    camera.position.copy(center).add(new THREE.Vector3(.7, .25, 1).normalize().multiplyScalar(distance));
    controls.update();
  }

  function renderUI() {
    list.replaceChildren();
    parts.forEach((p, i) => {
      const row = document.createElement('li');
      row.classList.toggle('rw-selected', selected === i);
      const choose = document.createElement('button');
      choose.type = 'button';
      choose.textContent = `${i + 1}. ${TYPES[p.type].label}`;
      choose.setAttribute('aria-pressed', String(selected === i));
      choose.onclick = () => {
        selected = i; renderUI();
        list.children[i]?.querySelector('button').focus({ preventScroll: true });
      };
      row.append(choose);
      for (const [text, label, change] of [['↑', 'Move up', -1], ['↓', 'Move down', 1], ['×', 'Delete', 0]]) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = text;
        button.setAttribute('aria-label', `${label} ${TYPES[p.type].label} ${i + 1}`);
        button.disabled = change === -1 ? i === 0 : change === 1 ? i === parts.length - 1 : false;
        button.onclick = () => {
          if (change) { [parts[i], parts[i + change]] = [parts[i + change], parts[i]]; selected = i + change; }
          else { parts.splice(i, 1); selected = Math.min(i, parts.length - 1); }
          changed();
          list.children[Math.max(selected, 0)]?.querySelector('button').focus({ preventScroll: true });
        };
        row.append(button);
      }
      list.append(row);
    });
    const p = parts[selected];
    $('.rw-dimensions').disabled = !p;
    $('[data-selected]').textContent = p ? `${selected + 1}. ${TYPES[p.type].label}` : 'No component selected';
    for (const input of panel.querySelectorAll('[data-dimension]')) {
      input.setCustomValidity('');
      if (p) input.value = p[input.dataset.dimension];
    }
    $('[data-action="duplicate"]').disabled = !p || parts.length >= LIMIT;
    for (const button of panel.querySelectorAll('[data-part]')) button.disabled = parts.length >= LIMIT;
    $('[data-count]').textContent = `${parts.length} / ${LIMIT} components`;
    $('.rw-empty').hidden = parts.length > 0;
    const e = estimate(parts);
    const f = (n, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits });
    $('.rw-stats').innerHTML = [['Dry mass', `${f(e.dry)} kg`], ['Fuel mass', `${f(e.fuel)} kg`], ['Initial mass', `${f(e.wet)} kg`], ['Total thrust', `${f(e.thrust / 1000, 1)} kN`], ['Earth initial TWR', f(e.twr, 2)], ['Ideal Δv', `${f(e.deltaV)} m/s`]].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    rebuild();
  }

  function changed() { fileRevision++; renderUI(); status('Unsaved changes · fictional engineering estimate updated.'); }
  function addPart(type) {
    if (!Object.hasOwn(TYPES, type)) return;
    if (parts.length >= LIMIT) { status('100 component limit reached. Delete a component first.'); return; }
    const { radius, length } = TYPES[type];
    parts.push({ type, radius, length }); selected = parts.length - 1;
    changed(); frameDesign();
  }
  function duplicate() {
    if (!parts[selected] || parts.length >= LIMIT) return;
    parts.splice(selected + 1, 0, { ...parts[selected] }); selected++; changed(); frameDesign();
  }
  function remove() {
    if (!parts[selected]) return;
    parts.splice(selected, 1); selected = Math.min(selected, parts.length - 1); changed();
  }
  function replaceDesign(value) {
    const validated = validateDesign(value);
    parts = validated; selected = parts.length ? 0 : -1;
    fileRevision++; renderUI(); frameDesign();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(documentValue())); status('Design saved on this browser. Export JSON for a portable copy.'); }
    catch { status('Local storage is unavailable or full. Use Export JSON.'); }
  }
  function load() {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (json === null) { status('No local design saved yet.'); return; }
      replaceDesign(JSON.parse(json)); status('Local design loaded.');
    } catch (error) { status(`Could not load design: ${error.message}`); }
  }
  function exportJSON() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(documentValue(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'kineti-core-rocket-v1.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('JSON exported. This file is an editor design, not a flight checkpoint.');
  }

  for (const button of panel.querySelectorAll('[data-part]')) {
    listen(button, 'click', () => addPart(button.dataset.part));
    listen(button, 'dragstart', event => {
      event.dataTransfer.setData('application/x-kineti-rocket-part', button.dataset.part);
      event.dataTransfer.effectAllowed = 'copy';
    });
  }
  listen(viewport, 'dragover', event => {
    if (!Array.from(event.dataTransfer.types).includes('application/x-kineti-rocket-part')) return;
    event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; viewport.classList.add('rw-drop');
  });
  listen(viewport, 'dragleave', () => viewport.classList.remove('rw-drop'));
  listen(viewport, 'drop', event => {
    event.preventDefault(); viewport.classList.remove('rw-drop');
    addPart(event.dataTransfer.getData('application/x-kineti-rocket-part'));
  });
  listen(panel, 'dragend', () => viewport.classList.remove('rw-drop'));
  for (const input of panel.querySelectorAll('[data-dimension]')) listen(input, 'change', () => {
    if (!parts[selected]) return;
    const value = input.valueAsNumber;
    if (!Number.isFinite(value) || value < Number(input.min) || value > Number(input.max)) {
      input.setCustomValidity(`Enter a value from ${input.min} to ${input.max} metres.`);
      input.reportValidity(); return;
    }
    parts[selected][input.dataset.dimension] = value; changed();
  });
  for (const input of panel.querySelectorAll('[data-dimension]')) listen(input, 'input', () => input.setCustomValidity(''));
  listen($('[data-import]'), 'change', async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 128 * 1024) { status('Import rejected: maximum file size is 128 KiB.'); return; }
    const revision = fileRevision;
    try {
      const value = JSON.parse(await file.text());
      if (destroyed || !active || revision !== fileRevision) { status('Import canceled because the workspace changed. Try again.'); return; }
      replaceDesign(value); status('JSON design imported. Save locally to keep this version.');
    } catch (error) { status(`Import rejected: ${error.message}`); }
  });
  const actions = { close, frame: frameDesign, duplicate, delete: remove, save, load,
    export: exportJSON, import: () => $('[data-import]').click() };
  for (const button of panel.querySelectorAll('[data-action]')) listen(button, 'click', () => actions[button.dataset.action]());
  listen(canvas, 'pointerdown', event => { pointerStart = { x: event.clientX, y: event.clientY, button: event.button }; });
  listen(canvas, 'pointerup', event => {
    if (!root || !pointerStart || pointerStart.button !== 0 || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = ray.intersectObjects(root.children, true)[0];
    if (!hit) return;
    let object = hit.object;
    while (object.parent !== root) object = object.parent;
    selected = object.userData.partIndex; renderUI();
    list.children[selected]?.scrollIntoView({ block: 'nearest' });
  });
  listen(canvas, 'webglcontextlost', event => { event.preventDefault(); $('.rw-webgl').hidden = false; });
  listen(canvas, 'webglcontextrestored', () => { $('.rw-webgl').hidden = true; });

  // Capture editor key events before the host's flight listeners can consume them.
  listen(window, 'keydown', event => {
    if (!active) return;
    event.stopImmediatePropagation();
    const editing = event.target instanceof Element && !!event.target.closest('input, textarea, select, [contenteditable="true"]');
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
    else if (!editing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'delete' || key === 'backspace') { event.preventDefault(); remove(); }
      else if (key === 'd' && !event.repeat) { event.preventDefault(); duplicate(); }
      else if (key === 'f') { event.preventDefault(); frameDesign(); }
    }
  }, { capture: true });
  for (const type of ['keyup', 'keypress']) listen(window, type, event => { if (active) event.stopImmediatePropagation(); }, { capture: true });
  listen(panel, 'cancel', event => { event.preventDefault(); close(); });
  listen(panel, 'close', () => { if (active) close(); });

  function tick() {
    if (!active) return;
    if (renderer) {
      const width = Math.max(canvas.clientWidth, 1), height = Math.max(canvas.clientHeight, 1);
      if (width !== lastWidth || height !== lastHeight) {
        lastWidth = width; lastHeight = height;
        renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
      }
      controls.update(); renderer.render(scene, camera);
    }
    animation = requestAnimationFrame(tick);
  }
  function open() {
    if (active || destroyed) return;
    previousFocus = document.activeElement;
    onOpen();
    try { panel.showModal(); }
    catch (error) { onClose(); throw error; }
    active = true;
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    initScene(); renderUI(); tick(); frameDesign();
    $('[data-action="close"]').focus();
  }
  function close() {
    if (!active) return;
    active = false; fileRevision++;
    cancelAnimationFrame(animation);
    if (panel.open) panel.close();
    document.documentElement.style.overflow = previousOverflow;
    try { onClose(); } finally { if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); }
  }
  function destroy() {
    close(); destroyed = true; listeners.abort(); clearMeshes(); controls?.dispose(); renderer?.dispose(); panel.remove();
  }
  renderUI();
  return { open, close, destroy };
}
