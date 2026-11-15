import * as THREE from 'three';
import { createCelestials, VISUAL_PROFILES } from './celestial.js';
import { getDestination } from './destinations.js';
import { advanceBallistic, inertialToLocal, releaseBody } from './separation-motion.js';
import { createOrbitOverview } from './orbit-overview.js';
import { boxClearance } from './separation-contact.js';

// Presentation only. SI simulation stays in physics.js; camera and celestial
// background use a local origin so GPU float precision never drives the flight.
// Procedural vehicle designs are fictional and are not NASA-certified hardware.
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;

function canvasTexture(draw, width = 1024, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeTextures() {
  const hull = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#e2e5e4'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d4d8d7';
    for (let x = 0; x < w; x += 128) ctx.fillRect(x, 0, 2, h);
    for (let y = 0; y < h; y += 128) {
      ctx.fillStyle = '#b6bfbe'; ctx.fillRect(0, y, w, 2);
      ctx.fillStyle = '#f1f3f2'; ctx.fillRect(0, y + 2, w, 2);
    }
    ctx.fillStyle = '#26313a'; ctx.fillRect(0, 765, w, 65);
    ctx.fillStyle = '#d7773f'; ctx.fillRect(0, 832, w, 9);
    ctx.fillStyle = '#2c353c';
    ctx.font = '600 38px Arial'; ctx.textAlign = 'center';
    ctx.fillText('KINETI', 255, 340); ctx.fillText('CORE', 255, 388);
    ctx.fillText('KINETI', 768, 340); ctx.fillText('CORE', 768, 388);
    ctx.font = '14px monospace';
    ctx.fillText('EXPLORATION VEHICLE', 255, 425);
    ctx.fillText('EXPLORATION VEHICLE', 768, 425);
    ctx.fillStyle = '#899593';
    for (let y = 30; y < h; y += 128) {
      for (let x = 16; x < w; x += 64) {
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
      }
    }
  });
  const thermal = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#d8dddd'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
      const odd = ((x + y) / 64) % 2;
      ctx.fillStyle = odd ? '#bcc7c8' : '#d5dcdc';
      ctx.fillRect(x + 1, y + 1, 62, 62);
      ctx.strokeStyle = '#9fadae'; ctx.strokeRect(x + 3, y + 3, 58, 58);
    }
  });
  const solar = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#13243a'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 72) for (let x = 0; x < w; x += 48) {
      ctx.fillStyle = (x / 48 + y / 72) % 3 === 0 ? '#203e65' : '#19304f';
      ctx.fillRect(x + 3, y + 3, 42, 66);
      ctx.fillStyle = '#688294'; ctx.fillRect(x + 23, y + 3, 1, 66);
    }
    ctx.strokeStyle = '#92a0a4'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
  });
  const deck = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#333c41'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#465056'; ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = '#b7ad81'; ctx.lineWidth = 7;
    ctx.strokeRect(150, 150, w - 300, h - 300);
  });
  deck.wrapS = deck.wrapT = THREE.RepeatWrapping;
  deck.repeat.set(3, 3);
  const earthFallback = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#204f71'; ctx.fillRect(0, 0, w, h);
    const patches = [[.21,.37,.16,.15],[.3,.65,.07,.22],[.53,.35,.1,.15],[.56,.56,.08,.2],[.73,.36,.17,.15],[.81,.72,.07,.06]];
    ctx.fillStyle = '#5d7868';
    patches.forEach(([x,y,rx,ry]) => { ctx.beginPath(); ctx.ellipse(x*w,y*h,rx*w,ry*h,-.2,0,TAU); ctx.fill(); });
    ctx.fillStyle = '#d9e1df'; ctx.fillRect(0, 0, w, h*.045); ctx.fillRect(0, h*.93, w, h*.07);
  }, 2048, 1024);
  return { hull, thermal, solar, deck, earthFallback };
}

function box(parent, size, position, material, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function cylinder(parent, top, bottom, height, position, material, radial = 48) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, radial), material);
  mesh.position.set(...position); mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
function ring(parent, radius, tube, position, material, alongZ = false) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 64), material);
  mesh.position.set(...position);
  if (!alongZ) mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
function beam(parent, a, b, radius, material) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const direction = to.clone().sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true; parent.add(mesh); return mesh;
}

function makeNozzle(parent, radius, height, position, materials) {
  const curve = [[1,0],[.98,.12],[.87,.3],[.67,.52],[.43,.76],[.3,.93],[.32,1]];
  const points = curve.map(([x,y]) => new THREE.Vector2(x * radius, y * height));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(points, 32), materials.nozzle);
  shell.position.set(...position); parent.add(shell); shell.castShadow = true;
  for (let i = 0; i < 5; i++) ring(parent, radius * (.96 - i*.12), .025, [position[0],position[1]+height*(.08+i*.13),position[2]], materials.darkMetal);
  cylinder(parent, radius*.25, radius*.25, .42, [position[0],position[1]+height+.16,position[2]], materials.copper, 16);
  return shell;
}

function makeSpacecraft(materials, options = {}) {
  // Origin = docking face; +Y is the spacecraft nose. Everything extends aft.
  const craft = new THREE.Group();
  const radialScale = options.capsule?.radius ? options.capsule.radius / 2.03 : 1;
  const length = (options.capsule?.height || 3.4) + (options.service?.height || 3.2);
  const service = new THREE.Group(); craft.add(service);
  cylinder(service, 1.72, 1.72, 3.35, [0,-4.65,0], materials.thermal);
  cylinder(service, 1.78, 1.78, .22, [0,-6.35,0], materials.darkMetal);
  cylinder(service, 1.76, 1.76, .18, [0,-2.94,0], materials.titanium);
  for (let i = 0; i < 8; i++) {
    const a = i*TAU/8;
    const panel = box(service,[.62,2.56,.075],[Math.sin(a)*1.75,-4.62,Math.cos(a)*1.75],materials.white);
    panel.rotation.y=a;
    const rail=box(service,[.055,2.83,.065],[Math.sin(a+.12)*1.79,-4.65,Math.cos(a+.12)*1.79],materials.titanium); rail.rotation.y=a+.12;
  }
  // Four visible RCS quadrants, with offset nozzles rather than painted lights.
  const jets=[];
  for (let i=0;i<4;i++) {
    const a=i*Math.PI/2+Math.PI/4;
    const pod=new THREE.Group();pod.position.set(Math.sin(a)*1.8,-3.57,Math.cos(a)*1.8);pod.rotation.y=a;service.add(pod);
    box(pod,[.38,.46,.4],[0,0,0],materials.darkMetal);
    for (const s of [-1,1]) {
      const jet=cylinder(pod,.055,.13,.24,[s*.22,0,.03],materials.nozzle,12);jet.rotation.z=s*Math.PI/2;
      const flame=new THREE.Mesh(new THREE.ConeGeometry(.1,.56,10),materials.rcsFlame);
      flame.rotation.z=-s*Math.PI/2;flame.position.set(s*.5,0,.03);flame.visible=false;pod.add(flame);jets.push(flame);
    }
    const jet=cylinder(pod,.055,.12,.22,[0,.24,.01],materials.nozzle,12);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.1,.5,10),materials.rcsFlame);flame.position.set(0,.48,0);flame.visible=false;pod.add(flame);jets.push(flame);
  }
  makeNozzle(service,.69,1.05,[0,-7.15,0],materials);
  cylinder(craft,2.04,2.04,.26,[0,-2.72,0],materials.heatShield);
  cylinder(craft,.63,2.03,2.43,[0,-1.39,0],materials.capsule);
  ring(craft,1.95,.055,[0,-2.52,0],materials.titanium);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2+Math.PI/4;
    const win=box(craft,[.55,.49,.07],[Math.sin(a)*1.04,-.9,Math.cos(a)*1.04],materials.glass);
    win.rotation.set(-.43, a,0);
    const frame=box(craft,[.69,.62,.045],[Math.sin(a)*1.015,-.91,Math.cos(a)*1.015],materials.titanium);
    frame.rotation.copy(win.rotation);win.renderOrder=2;
  }
  cylinder(craft,.6,.67,.23,[0,-.08,0],materials.darkMetal);
  ring(craft,.52,.08,[0,.045,0],materials.titanium);
  ring(craft,.38,.025,[0,.09,0],materials.copper);
  for(let i=0;i<6;i++) {
    const a=i*TAU/6;
    box(craft,[.13,.08,.18],[Math.sin(a)*.54,.15,Math.cos(a)*.54],materials.white,[0,a,0]);
  }
  // Stowed instrument and antenna hardware stays inside the launch envelope.
  box(service,[.42,.8,.28],[1.76,-5.33,0],materials.copper);
  beam(service,[1.8,-5.55,0],[2.2,-4.38,0],.035,materials.titanium);
  craft.scale.set(radialScale,length / 7.15,radialScale);
  const serviceRadialScale=(options.service?.radius || 1.85)/(1.72*radialScale);
  service.scale.x=service.scale.z=serviceRadialScale;
  craft.userData.length=length;
  craft.userData.jets=jets;
  return craft;
}

function makeRocket(materials, vehicle = {}) {
  const rocket=new THREE.Group();
  const core=new THREE.Group();rocket.add(core);
  cylinder(core,2.63,2.63,25.2,[0,15.4,0],materials.hull);
  cylinder(core,2.64,2.79,1.6,[0,2.8,0],materials.darkMetal);
  cylinder(core,2.63,2.63,.5,[0,28.2,0],materials.white);
  cylinder(core,2.63,2.63,1.8,[0,29.25,0],materials.black);
  for(const y of [3.3,7.1,16.8,24.5,28.5])ring(core,2.646,.045,[0,y,0],materials.titanium);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2;
    const rail=box(core,[.16,21.7,.13],[Math.sin(a)*2.65,15.1,Math.cos(a)*2.65],materials.white);rail.rotation.y=a;
  }
  const engines=[];
  for(const [x,z] of [[0,0],[-1.16,-1.16],[-1.16,1.16],[1.16,-1.16],[1.16,1.16]]) {
    makeNozzle(core,.75,1.62,[x,.15,z],materials);
    const plume=new THREE.Group();plume.position.set(x,.22,z);core.add(plume);engines.push(plume);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.62,7.5,24,1,true),materials.exhaust);
    flame.position.y=-3.9;flame.rotation.z=Math.PI;plume.add(flame);
    const hot=new THREE.Mesh(new THREE.ConeGeometry(.3,2.7,16,1,true),materials.exhaustCore);
    hot.position.y=-1.5;hot.rotation.z=Math.PI;plume.add(hot);plume.visible=false;
  }
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2+Math.PI/4;
    beam(core,[Math.sin(a)*1.8,1.8,Math.cos(a)*1.8],[Math.sin(a)*2.45,4,Math.cos(a)*2.45],.1,materials.copper);
  }
  const upper=new THREE.Group();upper.position.y=30.3;rocket.add(upper);
  makeNozzle(upper,1.05,2,[0,.12,0],materials);
  cylinder(upper,2.2,2.2,10.8,[0,8.05,0],materials.hull);
  cylinder(upper,2.2,2.63,1.0,[0,2.35,0],materials.darkMetal);
  cylinder(upper,1.78,2.2,1.8,[0,14.32,0],materials.white);
  for(const y of [2.9,5.7,10.9,13.5])ring(upper,2.215,.04,[0,y,0],materials.titanium);
  for(let i=0;i<12;i++){
    const a=i*TAU/12;
    const panel=box(upper,[.08,1.45,.04],[Math.sin(a)*2.23,3.7,Math.cos(a)*2.23],materials.titanium);panel.rotation.y=a;
  }
  const upperPlume=new THREE.Group();upperPlume.position.y=.2;upper.add(upperPlume);
  const upperFlame=new THREE.Mesh(new THREE.ConeGeometry(.82,10,24,1,true),materials.exhaustVacuum);upperFlame.position.y=-5.1;upperFlame.rotation.z=Math.PI;upperPlume.add(upperFlame);upperPlume.visible=false;
  const coreHeight=vehicle.core?.height||40,upperHeight=vehicle.upper?.height||13.5;
  const coreRadius=vehicle.core?.radius||2.05,upperRadius=vehicle.upper?.radius||2.05;
  core.scale.set(coreRadius/2.63,coreHeight/30.3,coreRadius/2.63);
  upper.scale.set(upperRadius/2.2,upperHeight/15.2,upperRadius/2.2);
  upper.position.y=coreHeight;
  const spacecraft=makeSpacecraft(materials,vehicle);
  const height=coreHeight+upperHeight+spacecraft.userData.length;
  spacecraft.position.y=height;rocket.add(spacecraft);
  rocket.userData={core,upper,spacecraft,engines,upperPlume,height,coreHeight,upperHeight};
  return rocket;
}

function makePad(materials) {
  const pad=new THREE.Group();
  box(pad,[26,1.3,24],[0,-.8,0],materials.concrete);
  box(pad,[12,.55,13],[0,.04,0],materials.deck);
  box(pad,[6.1,.6,6.1],[0,.56,0],materials.darkMetal);
  box(pad,[5.0,.45,5.0],[0,.83,0],materials.grate);
  // Service tower is intentionally off-axis so the vehicle silhouette stays clear.
  const tower=new THREE.Group();tower.position.set(-10,0,-5);pad.add(tower);
  const width=4.8;
  for(const x of [-width/2,width/2])for(const z of [-width/2,width/2])beam(tower,[x,0,z],[x,50,z],.14,materials.tower);
  for(let y=0;y<49;y+=5) {
    for(const z of [-width/2,width/2]){
      beam(tower,[-width/2,y,z],[width/2,y+5,z],.07,materials.tower);
      beam(tower,[width/2,y,z],[-width/2,y+5,z],.07,materials.tower);
    }
    box(tower,[5.6,.17,5.6],[0,y,0],materials.tower);
  }
  for(const y of [15.4,30.2,45.4]) {
    box(tower,[7.0,.35,1.25],[4.7,y,0],materials.tower);
    box(tower,[7.0,.09,.08],[4.7,y+.9,-.58],materials.titanium);
    box(tower,[7.0,.09,.08],[4.7,y+.9,.58],materials.titanium);
    for(let x=1.5;x<8;x+=1.4)for(const z of [-.58,.58])box(tower,[.045,.9,.045],[x,y+.48,z],materials.titanium);
  }
  for(const x of [-1,1]) {
    const pipe=new THREE.Mesh(new THREE.TorusGeometry(6.4,.11,8,32,Math.PI),materials.copper);pipe.rotation.set(Math.PI/2,0,0);pipe.position.set(x*4,-.1,1);pad.add(pipe);
  }
  return pad;
}

function makeStation(materials) {
  const station=new THREE.Group();
  // Port is exactly z=0 in the docking simulation's local frame.
  const hub=cylinder(station,2.25,2.25,8,[0,0,-5.1],materials.thermal);hub.rotation.x=Math.PI/2;
  for(const z of [-1.2,-3,-6.6,-9])ring(station,2.28,.09,[0,0,z],materials.titanium,true);
  const collar=cylinder(station,1.5,2.25,1.3,[0,0,-.78],materials.white);collar.rotation.x=Math.PI/2;
  const inner=new THREE.Mesh(new THREE.CircleGeometry(.73,48),materials.portDark);inner.position.z=-.14;station.add(inner);
  ring(station,.9,.14,[0,0,-.03],materials.titanium,true);
  ring(station,.73,.045,[0,0,.035],materials.copper,true);
  ring(station,1.25,.035,[0,0,-.1],materials.portLight,true);
  for(let i=0;i<8;i++) {
    const a=i*TAU/8;
    box(station,[.17,.17,.17],[Math.sin(a)*1.25,Math.cos(a)*1.25,0],i%2===0?materials.portLight:materials.titanium);
  }
  // Black-white fiducials and a central docking cross are geometric alignment cues.
  box(station,[.06,1.08,.025],[0,0,-.10],materials.white);
  box(station,[1.08,.06,.025],[0,0,-.10],materials.white);
  for(const [x,y] of [[-1.7,0],[1.7,0],[0,1.7],[0,-1.7]]) {
    box(station,[.55,.3,.05],[x,y,-.48],materials.black);
    box(station,[.22,.22,.06],[x,y,-.44],materials.white);
  }
  for(const sign of [-1,1]) {
    const cross=cylinder(station,1.8,1.8,9,[sign*5.1,0,-7.9],materials.white);cross.rotation.z=Math.PI/2;
    const end=cylinder(station,1.82,1.82,.23,[sign*9.65,0,-7.9],materials.titanium);end.rotation.z=Math.PI/2;
    const module=cylinder(station,1.6,1.6,7,[sign*4.5,0,-13.8],materials.thermal);module.rotation.x=Math.PI/2;
    ring(station,1.63,.055,[sign*4.5,0,-10.4],materials.titanium,true);
    box(station,[.8,.8,1.8],[sign*2.0,2.0,-6.6],materials.copper);
  }
  for(let x=-20;x<20;x+=2.4) {
    beam(station,[x,-.4,-15],[x+2.4,.4,-15],.06,materials.titanium);
    beam(station,[x,.4,-15],[x+2.4,-.4,-15],.06,materials.titanium);
    beam(station,[x,-.4,-15],[x+2.4,-.4,-15],.05,materials.titanium);
    beam(station,[x,.4,-15],[x+2.4,.4,-15],.05,materials.titanium);
  }
  for(const x of [-18,-11,11,18])for(const sign of [-1,1]) {
    box(station,[5.8,13.4,.12],[x,sign*7.5,-15],materials.solar);
    box(station,[.1,14.2,.16],[x,sign*7.3,-15],materials.titanium);
    for(const edge of [-1,1])box(station,[.065,13.5,.14],[x+edge*2.9,sign*7.5,-15],materials.copper);
  }
  // Radiators are distinct white thermal-control surfaces, not more solar cells.
  for(const sign of [-1,1]) {
    box(station,[7.5,2.5,.08],[sign*10,0,-5.4],materials.radiator,[0,sign*.24,.12]);
    for(let i=0;i<7;i++)box(station,[.035,2.42,.1],[sign*(6.8+i*.95),0,-5.35],materials.titanium,[0,sign*.24,.12]);
  }
  return station;
}

function makeLander(materials) {
  // Feet touch y=0. The local upright axis is +Y, matching landing.js.
  const lander=new THREE.Group(),attitudeJets=[];
  const foil=new THREE.MeshStandardMaterial({color:0xb69a60,metalness:.77,roughness:.44,flatShading:true});
  const paleFoil=new THREE.MeshStandardMaterial({color:0xc5c3af,metalness:.69,roughness:.37,flatShading:true});
  cylinder(lander,1.45,1.8,1.7,[0,2.12,0],foil,8);
  cylinder(lander,1.57,1.57,.15,[0,3.04,0],materials.darkMetal,8);
  for(let i=0;i<8;i++){
    const a=i*TAU/8;
    const panel=box(lander,[.89,1.31,.08],[Math.sin(a)*1.52,2.15,Math.cos(a)*1.52],i%3===0?paleFoil:foil);panel.rotation.y=a;
    beam(lander,[Math.sin(a)*1.5,1.45,Math.cos(a)*1.5],[Math.sin(a)*1.4,2.91,Math.cos(a)*1.4],.035,materials.titanium);
  }
  const cabin=cylinder(lander,1.07,1.36,1.78,[0,3.98,0],materials.white,8);cabin.rotation.y=Math.PI/8;
  cylinder(lander,.64,1.08,.45,[0,5.08,0],materials.thermal,8);
  cylinder(lander,.43,.43,.12,[0,5.34,0],materials.darkMetal,24);
  ring(lander,.47,.035,[0,5.41,0],materials.titanium);
  for(const x of [-.53,.53]){
    box(lander,[.62,.5,.08],[x,4.23,1.08],materials.darkMetal,[.17,0,0]);
    box(lander,[.51,.39,.085],[x,4.25,1.13],materials.glass,[.17,0,0]);
  }
  box(lander,[.72,1.04,.13],[0,3.47,1.31],materials.titanium);
  box(lander,[.56,.84,.08],[0,3.49,1.4],materials.thermal);
  for(let i=0;i<9;i++)box(lander,[.67,.045,.09],[0,.35+i*.34,1.8],materials.titanium);
  for(const x of [-.39,.39])beam(lander,[x,.2,1.8],[x,3.14,1.8],.035,materials.titanium);
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2;
    const foot=[Math.sin(a)*3.6,.13,Math.cos(a)*3.6];
    beam(lander,[Math.sin(a)*1.3,2.77,Math.cos(a)*1.3],foot,.095,materials.titanium);
    beam(lander,[Math.sin(a)*1.4,1.54,Math.cos(a)*1.4],[foot[0]*.9,.57,foot[2]*.9],.07,materials.darkMetal);
    beam(lander,[Math.sin(a)*1.95,1.95,Math.cos(a)*1.95],[foot[0]*.88,.7,foot[2]*.88],.11,materials.copper);
    cylinder(lander,.55,.62,.17,foot,materials.titanium,24);
    const pod=new THREE.Group();pod.position.set(Math.sin(a)*1.39,4.55,Math.cos(a)*1.39);pod.rotation.y=a;lander.add(pod);
    box(pod,[.32,.25,.31],[0,0,0],materials.darkMetal);
    const jet=cylinder(pod,.05,.1,.2,[0,.18,0],materials.nozzle,12);jet.rotation.z=Math.PI/2;
  }
  for(const sign of [-1,1]){
    const tank=new THREE.Mesh(new THREE.SphereGeometry(.43,24,16),paleFoil);tank.position.set(sign*1.4,3.38,0);lander.add(tank);
    beam(lander,[sign*1.2,3.07,-.55],[sign*1.2,4.03,-.55],.035,materials.copper);
  }
  // Opposed pairs provide a visible torque without inventing translation.
  // Positive simulation torque tilts clockwise: upper exhaust points -X,
  // lower exhaust +X. Flames respond to the actual torque, including hold.
  for(const torqueSign of [-1,1])for(const upper of [true,false]){
    const outward=(upper?-1:1)*torqueSign;
    const pod=new THREE.Group();pod.position.set(outward*1.62,upper?4.48:1.72,.68);lander.add(pod);
    box(pod,[.23,.2,.22],[0,0,0],materials.darkMetal);
    const nozzle=cylinder(pod,.045,.09,.17,[outward*.16,0,0],materials.nozzle,12);nozzle.rotation.z=-outward*Math.PI/2;
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.085,.66,12),materials.rcsFlame);
    flame.rotation.z=outward*Math.PI/2;flame.position.x=outward*.52;flame.visible=false;pod.add(flame);
    flame.userData.torqueSign=torqueSign;attitudeJets.push(flame);
  }
  makeNozzle(lander,.57,.75,[0,.47,0],materials);
  const plume=new THREE.Mesh(new THREE.CylinderGeometry(.23,1.7,5.5,32,1,true),materials.exhaustVacuum);plume.position.y=-2.2;plume.visible=false;lander.add(plume);
  const hot=new THREE.Mesh(new THREE.CylinderGeometry(.12,.4,1.9,24,1,true),materials.exhaustCore);hot.position.y=-.3;hot.visible=false;lander.add(hot);
  const antenna=new THREE.Group();antenna.position.set(-.8,5.08,-.5);lander.add(antenna);
  beam(antenna,[0,0,0],[0,1.1,0],.025,materials.titanium);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(.43,24,12,0,TAU,0,.55),materials.white);dish.rotation.set(.9,0,.3);dish.position.y=1.14;antenna.add(dish);
  box(lander,[1.3,.055,.83],[1.9,4.8,-.3],materials.solar,[0,0,-.18]);
  beam(lander,[1,4.7,-.3],[2.5,4.7,-.3],.025,materials.titanium);
  lander.userData={plume,hot,foil,paleFoil,attitudeJets};
  return lander;
}

function makeSurface(destination,materials) {
  const profile=VISUAL_PROFILES[destination.id]||VISUAL_PROFILES.moon;
  const ice=profile.kind.includes('ice'),titan=destination.id==='titan';
  const group=new THREE.Group();
  let seed=destination.id.split('').reduce((n,c)=>n+c.charCodeAt(0),131);
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const surfaceMap=canvasTexture((ctx,w,h)=>{
    // Canvas pixel channels are sRGB, whereas THREE.Color stores linear RGB.
    const image=ctx.createImageData(w,h),base=new THREE.Color(profile.color).convertLinearToSRGB();
    for(let i=0;i<image.data.length;i+=4){
      const noise=(rand()-.5)*27;
      image.data[i]=clamp(base.r*255+noise,0,255);image.data[i+1]=clamp(base.g*255+noise,0,255);image.data[i+2]=clamp(base.b*255+noise,0,255);image.data[i+3]=255;
    }
    ctx.putImageData(image,0,0);
    if(ice){
      for(let i=0;i<65;i++){
        const x=rand()*w,y=rand()*h;ctx.beginPath();ctx.moveTo(x,y);
        for(let n=1;n<7;n++)ctx.lineTo(x+(n/6-.1)*w*.7,y+Math.sin(n*.7+i)*h*.08+rand()*18);
        ctx.strokeStyle=destination.id==='europa'?'rgba(94,80,68,.44)':'rgba(62,77,80,.31)';ctx.lineWidth=1+rand()*4;ctx.stroke();
      }
    }else{
      for(let i=0;i<100;i++){
        const x=rand()*w,y=rand()*h,r=2+rand()*25;
        ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.strokeStyle='rgba(16,17,18,.12)';ctx.lineWidth=1;ctx.stroke();
      }
    }
  },1024,1024);
  surfaceMap.wrapS=surfaceMap.wrapT=THREE.RepeatWrapping;surfaceMap.repeat.set(140,140);
  const groundMaterial=new THREE.MeshStandardMaterial({map:surfaceMap,color:0xffffff,roughness:ice?.88:1,metalness:0,envMapIntensity:0});
  const geometry=new THREE.PlaneGeometry(12000,12000,144,144);geometry.rotateX(-Math.PI/2);
  const vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),z=vertices.getZ(i),r=Math.hypot(x,z);
    const fade=clamp((r-600)/1200,0,1);
    let h=Math.sin(x*.0031)*Math.cos(z*.0027)*42+Math.sin(x*.0012+z*.0018)*80+Math.sin(x*.0073-z*.0039)*13;
    if(ice)h*=.4;if(titan)h*=.65;
    vertices.setY(i,h*fade-.035);
  }
  geometry.computeVertexNormals();
  const ground=new THREE.Mesh(geometry,groundMaterial);ground.receiveShadow=true;group.add(ground);
  const rockGeometry=new THREE.DodecahedronGeometry(1,0),rockMaterial=new THREE.MeshStandardMaterial({color:profile.color,roughness:.97,metalness:0,envMapIntensity:0});
  const rocks=new THREE.InstancedMesh(rockGeometry,rockMaterial,190),dummy=new THREE.Object3D();
  for(let i=0;i<190;i++){
    const a=rand()*TAU,r=34+rand()*410,size=.18+rand()**3*2.1;
    dummy.position.set(Math.cos(a)*r,size*.32,Math.sin(a)*r);dummy.rotation.set(rand(),rand()*TAU,rand());dummy.scale.set(size*(1+rand()),size*.55,size);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
  }
  rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
  // Survey beacons mark a real-scale 25 m zone on unpaved terrain. These are
  // fictional training equipment, not a claim of existing lunar infrastructure.
  const beacons=[];
  for(let i=0;i<8;i++){
    const a=i*TAU/8,x=Math.cos(a)*25,z=Math.sin(a)*25;
    cylinder(group,.08,.13,.75,[x,.37,z],materials.darkMetal,12);
    const light=new THREE.Mesh(new THREE.SphereGeometry(.15,12,8),new THREE.MeshBasicMaterial({color:0xc6d6bf}));light.position.set(x,.83,z);group.add(light);beacons.push(light);
  }
  group.userData={surfaceMap,groundMaterial,rockMaterial,beacons,kind:profile.kind};
  return group;
}

function makeMissionEffects(materials,reducedMotion) {
  const group=new THREE.Group(),count=reducedMotion?28:120;
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3),particleGeometry=new THREE.BufferGeometry();
  particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));particleGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const dustMaterial=new THREE.PointsMaterial({size:.23,vertexColors:true,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true});
  const dust=new THREE.Points(particleGeometry,dustMaterial);group.add(dust);
  const bits=[];
  for(let i=0;i<(reducedMotion?5:16);i++){
    const fragment=new THREE.Mesh(new THREE.BoxGeometry(.3+i%3*.17,.1,.38),i%3===0?materials.copper:materials.titanium);fragment.visible=false;fragment.castShadow=true;group.add(fragment);bits.push(fragment);
  }
  const flash=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0xffdaa1,transparent:true,opacity:0,depthWrite:false}));group.add(flash);
  let event=null,age=100;
  const velocity=[];
  function trigger(type,origin,color,gravity=1.62){
    event={type,origin:origin.clone(),color:new THREE.Color(color),gravity};age=0;flash.position.copy(origin);
    for(let i=0;i<count;i++){
      const a=i*2.399963,radial=(type==='impact'?3.5:1.3)+(i%13)*.35;
      velocity[i]=new THREE.Vector3(Math.cos(a)*radial,(type==='impact'?2.8:1)+(i%7)*.25,Math.sin(a)*radial);
      colors.set(event.color.toArray(),i*3);
    }
    particleGeometry.attributes.color.needsUpdate=true;
    bits.forEach((bit,i)=>{bit.visible=type==='impact';bit.position.copy(origin);bit.rotation.set(i*.3,i*.6,i*.2);bit.userData.velocity=new THREE.Vector3(Math.cos(i*2.4)*(3+i%3),2+i%5,Math.sin(i*2.4)*(3+i%4));});
  }
  function update(dt){
    if(!event)return;age+=dt;
    for(let i=0;i<count;i++){
      const v=velocity[i];const p=event.origin.clone().addScaledVector(v,age);p.y-=.5*event.gravity*age*age;
      if(event.type==='touchdown'||event.type==='impact')p.y=Math.max(.05,p.y);
      positions.set(p.toArray(),i*3);
    }
    particleGeometry.attributes.position.needsUpdate=true;
    dustMaterial.opacity=Math.max(0,(event.type==='impact'?.72:.38)*(1-age/5));
    bits.forEach((bit,i)=>{
      if(!bit.visible)return;bit.position.copy(event.origin).addScaledVector(bit.userData.velocity,age);bit.position.y=Math.max(.08,bit.position.y-.5*event.gravity*age*age);
      if(!reducedMotion)bit.rotation.set(i*.3+age*(.8+i*.03),i*.6+age*.3,i*.2+age*.6);
      bit.visible=age<6;
    });
    const impact=event.type==='impact';flash.material.opacity=impact?Math.max(0,(reducedMotion?.12:.46)*(1-age/.55)):0;flash.scale.setScalar(.2+age*(reducedMotion?4:11));
    if(age>6){event=null;dustMaterial.opacity=0;flash.material.opacity=0;}
  }
  function clear(){event=null;age=100;dustMaterial.opacity=0;flash.material.opacity=0;bits.forEach(bit=>bit.visible=false);}
  return {group,trigger,update,clear,getAge:()=>age};
}

function disposeGeometries(root) {
  const geometries=new Set();root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);});
  geometries.forEach(geometry=>geometry.dispose());
}

export function createScene(canvas, options = {}) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.04;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,15000);
  const textures=makeTextures();
  const materials={
    hull:new THREE.MeshStandardMaterial({map:textures.hull,color:0xffffff,metalness:.36,roughness:.48}),
    white:new THREE.MeshStandardMaterial({color:0xe8ecea,metalness:.26,roughness:.43}),
    capsule:new THREE.MeshStandardMaterial({color:0xd3dcdb,metalness:.64,roughness:.33}),
    thermal:new THREE.MeshStandardMaterial({map:textures.thermal,metalness:.72,roughness:.42}),
    titanium:new THREE.MeshStandardMaterial({color:0x9aabb0,metalness:.82,roughness:.28}),
    darkMetal:new THREE.MeshStandardMaterial({color:0x344047,metalness:.85,roughness:.34}),
    black:new THREE.MeshStandardMaterial({color:0x151c20,metalness:.25,roughness:.65}),
    nozzle:new THREE.MeshStandardMaterial({color:0x313b40,metalness:.86,roughness:.37,side:THREE.DoubleSide}),
    copper:new THREE.MeshStandardMaterial({color:0xc39a64,metalness:.82,roughness:.35}),
    glass:new THREE.MeshStandardMaterial({color:0x082c3b,metalness:.58,roughness:.13,emissive:0x0c1b22,emissiveIntensity:.4}),
    heatShield:new THREE.MeshStandardMaterial({color:0x24272a,metalness:.05,roughness:.88}),
    concrete:new THREE.MeshStandardMaterial({color:0x525a5c,roughness:.97}),
    deck:new THREE.MeshStandardMaterial({map:textures.deck,roughness:.88,metalness:.3}),
    grate:new THREE.MeshStandardMaterial({color:0x1b2428,roughness:.8,metalness:.75}),
    tower:new THREE.MeshStandardMaterial({color:0x5b6669,metalness:.58,roughness:.57}),
    solar:new THREE.MeshStandardMaterial({map:textures.solar,color:0xe3edff,metalness:.58,roughness:.32,side:THREE.DoubleSide}),
    radiator:new THREE.MeshStandardMaterial({color:0xd1d7d4,metalness:.22,roughness:.7,side:THREE.DoubleSide}),
    portDark:new THREE.MeshBasicMaterial({color:0x03090c}),
    portLight:new THREE.MeshBasicMaterial({color:0xc9e7de}),
    exhaust:new THREE.MeshBasicMaterial({color:0xffa95c,transparent:true,opacity:.54,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),
    exhaustCore:new THREE.MeshBasicMaterial({color:0xfff3ce,transparent:true,opacity:.84,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),
    exhaustVacuum:new THREE.MeshBasicMaterial({color:0xa1bfff,transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}),
    rcsFlame:new THREE.MeshBasicMaterial({color:0x9ed1e5,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending})
  };
  // A procedural studio environment gives metals real reflections without a
  // downloaded HDRI, a third-party service, or a runtime network dependency.
  const envFaces=[];
  for(let i=0;i<6;i++){
    const face=document.createElement('canvas');face.width=face.height=128;
    const ctx=face.getContext('2d');const gradient=ctx.createLinearGradient(0,0,0,128);
    gradient.addColorStop(0,i===2?'#d1d8dc':'#667781');gradient.addColorStop(.48,'#687780');gradient.addColorStop(1,'#1b242a');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    if(i<4){ctx.fillStyle='#dce1df';ctx.fillRect(46,7,19,104);ctx.fillStyle='#7e8a90';ctx.fillRect(77,16,7,88);}
    envFaces.push(face);
  }
  const environment=new THREE.CubeTexture(envFaces);environment.colorSpace=THREE.SRGBColorSpace;environment.needsUpdate=true;scene.environment=environment;
  const hemi=new THREE.HemisphereLight(0xc9dbea,0x222a2a,1.65);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xffead5,3.3);key.position.set(35,65,45);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-48;key.shadow.camera.right=48;key.shadow.camera.top=64;key.shadow.camera.bottom=-22;key.shadow.camera.near=1;key.shadow.camera.far=160;key.shadow.normalBias=.04;scene.add(key);scene.add(key.target);
  const fill=new THREE.DirectionalLight(0xa4c8e0,1.7);fill.position.set(-30,25,-20);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xf2f3e7,1.5);rim.position.set(15,25,-45);scene.add(rim);
  const engineLight=new THREE.PointLight(0xff8c45,0,65,2);engineLight.position.set(0,3,0);scene.add(engineLight);
  const assembly=new THREE.Group();scene.add(assembly);
  const launchEnvironment=new THREE.Group();scene.add(launchEnvironment);launchEnvironment.visible=false;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(260,260),new THREE.MeshStandardMaterial({color:0x252c31,metalness:.27,roughness:.69}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.5;floor.receiveShadow=true;assembly.add(floor);
  // The bay's tall ribs and light slots frame the rocket, while leaving its
  // central silhouette uninterrupted and the UI free of artificial card chrome.
  const back=box(assembly,[180,110,1],[0,45,-35],new THREE.MeshStandardMaterial({color:0x293138,roughness:.88}));back.receiveShadow=true;
  for(let x=-75;x<=75;x+=15) {
    box(assembly,[.5,105,1.6],[x,45,-33],materials.darkMetal);
    if(x%30===0)box(assembly,[.42,78,.2],[x+2,47,-32.1],new THREE.MeshBasicMaterial({color:0x74888e}));
  }
  const assemblyPad=makePad(materials);assembly.add(assemblyPad);
  const launchPad=makePad(materials);launchEnvironment.add(launchPad);
  const launchGround=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),new THREE.MeshStandardMaterial({color:0x3f5a45,roughness:1}));launchGround.rotation.x=-Math.PI/2;launchGround.position.y=-1.6;launchGround.receiveShadow=true;launchEnvironment.add(launchGround);
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(8000,8000),new THREE.MeshStandardMaterial({color:0x295d72,roughness:.42,metalness:.14}));ocean.rotation.x=-Math.PI/2;ocean.position.set(4000,-2.2,-100);launchEnvironment.add(ocean);
  for(const x of [-48,48])box(launchEnvironment,[9,.12,600],[x,-1.3,190],materials.concrete);
  const rocketRoot=new THREE.Group();scene.add(rocketRoot);
  let vehicle={},rocket=makeRocket(materials,vehicle);rocketRoot.add(rocket);
  const docking=new THREE.Group();scene.add(docking);docking.visible=false;
  const station=makeStation(materials);docking.add(station);
  // Visual station reference during high ascent, not a simulated rendezvous.
  const orbitalStation=makeStation(materials);orbitalStation.position.set(-70,36,-110);orbitalStation.visible=false;scene.add(orbitalStation);
  let dockingCraft=makeSpacecraft(materials,vehicle);dockingCraft.rotation.x=-Math.PI/2;const craftAttitude=new THREE.Group();craftAttitude.add(dockingCraft);docking.add(craftAttitude);
  const reducedMotion=options.reducedMotion??window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
  const celestials=createCelestials(renderer,options),earth=celestials.earth,earthAtmosphere=celestials.earthAtmosphere;
  earth.position.set(-650,-1760,-1700);earth.rotation.set(.2,2.6,-.3);earth.visible=false;scene.add(earth);
  const destinationPreview=celestials.preview;destinationPreview.visible=false;scene.add(destinationPreview);
  const orbitOverview=createOrbitOverview(scene,celestials.getTexture('earth'));
  let selectedDestination='moon';
  const landing=new THREE.Group();landing.visible=false;scene.add(landing);
  let surface=makeSurface(getDestination('moon'),materials);landing.add(surface);
  const lander=makeLander(materials);landing.add(lander);
  const landingParent=celestials.parentContext.clone(true);landingParent.visible=false;scene.add(landingParent);
  const effects=makeMissionEffects(materials,reducedMotion);scene.add(effects.group);
  const captureGlow=new THREE.Mesh(new THREE.TorusGeometry(1.47,.026,8,72),new THREE.MeshBasicMaterial({color:0xadd8ba,transparent:true,opacity:0,depthWrite:false}));captureGlow.position.z=.08;station.add(captureGlow);
  const starPositions=[];let seed=43921;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<1600;i++) {
    const azimuth=random()*TAU,elevation=Math.acos(2*random()-1),radius=6000;
    starPositions.push(radius*Math.sin(elevation)*Math.cos(azimuth),radius*Math.cos(elevation),radius*Math.sin(elevation)*Math.sin(azimuth));
  }
  const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0xc4d3df,size:2.1,sizeAttenuation:true,transparent:true,opacity:.75,depthWrite:false}));scene.add(stars);stars.visible=false;
  let mode='assembly',previousStage=0,previousPhase=null,previousMissionTime=null,phaseAt=0,destructiveFailure=false,disposed=false,elapsed=0,dragging=false,dragX=0,rotation=.18,zoom=1;
  const look=new THREE.Vector3(0,26,0),desiredLook=new THREE.Vector3(),desiredCamera=new THREE.Vector3();
  const cameraPoint=new THREE.Vector3(),targetProjection=new THREE.Vector3();
  const debris=[];
  let orbitYaw=0,orbitPitch=0,orbitZoom=1,dragY=0,freeOrbit=false;
  function resetOrbit(){orbitYaw=orbitPitch=0;orbitZoom=1;freeOrbit=false;}
  camera.position.set(72,40,94);camera.lookAt(look);

  function resetOutcomeVisuals(){
    effects.clear();destructiveFailure=false;captureGlow.material.opacity=0;
    materials.portLight.color.set(0xc9e7de);
    surface.userData.beacons.forEach(beacon=>beacon.material.color.set(0xc6d6bf));
  }
  function clearDebris(){for(const d of debris)scene.remove(d.object);debris.length=0;}
  function separateVisual(stage,time,view){
    const source=stage===0?rocket.userData.core:rocket.userData.upper;
    const object=source.clone(true);source.updateWorldMatrix(true,false);source.getWorldPosition(object.position);source.getWorldQuaternion(object.quaternion);scene.add(object);
    object.traverse(child=>{if(child.material===materials.exhaust||child.material===materials.exhaustCore||child.material===materials.exhaustVacuum)child.visible=false;});
    const body=Array.isArray(view.positionSI)&&Array.isArray(view.velocitySI)?releaseBody(view.positionSI,view.velocitySI,Number(view.pitch)||0):null;
    debris.push({object,start:time,last:time,base:object.position.clone(),rotation:object.quaternion.clone(),body,axis:new THREE.Vector3(Math.sin(Number(view.pitch)||0),Math.cos(Number(view.pitch)||0),0),stage});
  }
  function setMode(next){
    if(!['assembly','launch','docking','destination','landing'].includes(next)||next===mode)return;
    mode=next;resetOrbit();clearDebris();resetOutcomeVisuals();previousStage=0;previousPhase=null;previousMissionTime=null;
    assembly.visible=mode==='assembly';launchEnvironment.visible=mode==='launch';rocketRoot.visible=mode==='assembly'||mode==='launch';docking.visible=mode==='docking';
    destinationPreview.visible=mode==='destination';landing.visible=mode==='landing';landingParent.visible=mode==='landing'&&selectedDestination!=='titan';
    earth.visible=earthAtmosphere.visible=mode==='docking';stars.visible=['docking','destination','landing'].includes(mode);
    camera.up.set(0,1,0);
    if(mode==='assembly'){rocketRoot.rotation.set(0,rotation,0);rocketRoot.position.set(0,0,0);camera.position.set(72*zoom,40,94*zoom);look.set(0,rocket.userData.height*.48,0);}
    if(mode==='launch'){rocketRoot.rotation.set(0,0,0);rocketRoot.position.set(0,0,0);camera.position.set(92,36,118);look.set(0,27,0);}
    if(mode==='docking'){camera.position.set(13,7,102);look.set(0,0,35);}
    if(mode==='destination'){camera.position.set(0,7,69);look.set(0,0,0);}
    if(mode==='landing'){camera.position.set(28,28,52);look.set(0,6,0);}
    camera.lookAt(look);
  }
  function setDestination(next='moon'){
    const id=typeof next==='string'?next:next?.id;
    if(!getDestination(id)||id===selectedDestination)return false;
    selectedDestination=id;celestials.setDestination(id);
    landing.remove(surface);disposeGeometries(surface);
    surface.userData.surfaceMap.dispose();surface.userData.groundMaterial.dispose();surface.userData.rockMaterial.dispose();
    surface.userData.beacons.forEach(beacon=>beacon.material.dispose());
    surface=makeSurface(getDestination(id),materials);landing.add(surface);
    landingParent.scale.copy(celestials.parentContext.scale);landingParent.rotation.copy(celestials.parentContext.rotation);
    landingParent.children.forEach((child,i)=>{child.visible=celestials.parentContext.children[i]?.visible??true;});
    resetOutcomeVisuals();previousPhase=null;
    return true;
  }
  function setVehicle(next={}){
    vehicle=next;clearDebris();rocketRoot.remove(rocket);disposeGeometries(rocket);rocket=makeRocket(materials,vehicle);rocketRoot.add(rocket);
    craftAttitude.remove(dockingCraft);disposeGeometries(dockingCraft);dockingCraft=makeSpacecraft(materials,vehicle);dockingCraft.rotation.x=-Math.PI/2;craftAttitude.add(dockingCraft);
    previousStage=0;
  }
  function update(view={},dt=1/60){
    // Reject incomplete events rather than mixing wall and mission time.
    if(view.separation!==undefined&&!Number.isFinite(view.time))return;
    orbitalStation.visible=false;
    orbitOverview.root.visible=false;
    if(disposed)return;
    if(view.destination)setDestination(view.destination);
    if(view.mode)setMode(view.mode);
    const frameDt=clamp(Number.isFinite(dt)?dt:1/60,0,.1);elapsed+=frameDt;
    const t=Number.isFinite(view.time)?view.time:elapsed;
    const smooth=1-Math.exp(-frameDt*5.2);
    engineLight.intensity=0;
    key.position.set(35,65,45);key.color.set(0xffead5);key.target.position.set(0,0,0);camera.up.set(0,1,0);
    // Only physical mission time participates in rewind detection.
    const phase=view.phase||previousPhase||mode;
    const missionTime=Number.isFinite(view.time)?view.time:null;
    const rewound=missionTime!==null&&previousMissionTime!==null&&missionTime<previousMissionTime-1e-7;
    const restarted=['failed','docked','landed','orbit'].includes(previousPhase)&&['launch','docking','landing'].includes(phase);
    if(rewound||restarted){
      resetOutcomeVisuals();clearDebris();phaseAt=elapsed;
      previousStage=Number.isFinite(view.stageIndex)?clamp(Math.floor(view.stageIndex),0,2):0;
    }
    if(missionTime!==null)previousMissionTime=missionTime;
    if(phase!==previousPhase){
      previousPhase=phase;phaseAt=elapsed;
      if(phase==='docked')materials.portLight.color.set(0xa5d4b4);
      if(phase==='landed'){const pos=view.position||[0,0];effects.trigger('touchdown',new THREE.Vector3(pos[0],.1,0),VISUAL_PROFILES[selectedDestination].color,getDestination(selectedDestination).gravity);}
      if(phase==='failed'){
        if(mode==='landing'){
          const pos=view.position||[0,0],speed=view.impact?.speed??view.maxImpact??0;
          if(pos[1]<2&&speed>3){destructiveFailure=true;effects.trigger('impact',new THREE.Vector3(pos[0],1.3,0),VISUAL_PROFILES[selectedDestination].color,getDestination(selectedDestination).gravity);}
          else if(pos[1]<2)effects.trigger('touchdown',new THREE.Vector3(pos[0],.1,0),VISUAL_PROFILES[selectedDestination].color,getDestination(selectedDestination).gravity);
        }else if(mode==='docking'&&(view.position?.[2]??100)<5){destructiveFailure=true;effects.trigger('impact',new THREE.Vector3(...(view.position||[0,0,0])),0x9faeb1,0);}
        else if(mode==='launch'){destructiveFailure=true;effects.trigger('impact',new THREE.Vector3(0,rocket.userData.height*.45,0),0xb3a999,(view.altitude||0)<100?9.81:0);}
      }
    }
    celestials.update(elapsed,rotation,reducedMotion);
    if(mode==='assembly'){
      scene.background=new THREE.Color(0x1a2229);scene.fog=new THREE.Fog(0x1a2229,115,260);
      rocket.userData.core.visible=rocket.userData.upper.visible=true;rocket.userData.engines.forEach(e=>e.visible=false);rocket.userData.upperPlume.visible=false;
      rocketRoot.rotation.set(0,rotation,0);rocketRoot.position.set(0,0,0);
      desiredCamera.set(69*zoom,rocket.userData.height*.57,91*zoom);desiredLook.set(0,rocket.userData.height*.48,0);
      camera.position.lerp(desiredCamera,smooth);look.lerp(desiredLook,smooth);camera.lookAt(look);
      hemi.intensity=1.6;key.intensity=3.3;fill.intensity=1.7;rim.intensity=1.5;scene.environmentIntensity=.85;
    }else if(mode==='launch'){
      const altitude=Math.max(0,Number(view.altitude)||0),pitch=Number(view.pitch)||0;
      const stage=clamp(Math.floor(Number(view.stageIndex)||0),0,2),throttle=clamp(Number(view.throttle)||0,0,1);
      if(stage>previousStage)for(let i=previousStage;i<stage;i++)separateVisual(i,t,view);
      previousStage=stage;
      rocket.userData.core.visible=stage===0;rocket.userData.upper.visible=stage<2;
      const space=clamp((altitude-10000)/80000,0,1);
      scene.background=new THREE.Color(0x779cac).lerp(new THREE.Color(0x03080e),space);
      scene.fog=space<.65?new THREE.Fog(scene.background,140+altitude*.015,800+altitude*.035):null;
      stars.visible=space>.65;stars.material.opacity=clamp((space-.65)*2,.0,.75);
      earth.visible=earthAtmosphere.visible=altitude>14000;
      const longitude=Array.isArray(view.positionSI)?Math.atan2(view.positionSI[1],view.positionSI[0]):0;
      earth.position.set(-1200,-900-Math.max(0,altitude-100000)*.00015,-3500);
      earth.rotation.z=-longitude;earth.rotation.y=2.6+t*.0000729;
      // The old stationary ISS decoration looked like a frozen rendezvous.
      // A station belongs to the separate approach scenario, not ascent.
      orbitalStation.visible=false;
      launchEnvironment.position.y=-Math.min(altitude,7000);launchEnvironment.visible=altitude<5500;
      // Rocket positions are local to its active stage. This frame follows the
      // vehicle, while the actual altitude is represented by atmosphere/ground.
      const pivot=rocket.userData.height*.48;
      rocketRoot.rotation.z=-pitch;rocketRoot.position.set(-Math.sin(pitch)*pivot,pivot*(1-Math.cos(pitch)),0);
      rocket.userData.engines.forEach((e,i)=>{e.visible=stage===0&&throttle>.01;e.scale.set(1,mix(.45,1.35,throttle)*(1+Math.sin(elapsed*53+i)*.05),1);});
      rocket.userData.upperPlume.visible=stage===1&&throttle>.01;rocket.userData.upperPlume.scale.set(1,1+Math.sin(elapsed*43)*.045,1);
      engineLight.intensity=throttle*(stage===0?750:240);engineLight.position.set(0,stage===0?1:30,0);
      desiredCamera.set(stage===0?88:stage===1?51:29,pivot+12,stage===0?112:stage===1?69:39);desiredLook.set(0,pivot,0);
      camera.position.lerp(desiredCamera,smooth*.45);look.lerp(desiredLook,smooth*.6);camera.lookAt(look);
      hemi.intensity=mix(1.7,.58,space);key.intensity=mix(3.7,4.6,space);fill.intensity=mix(.9,.3,space);rim.intensity=1;scene.environmentIntensity=mix(.8,.35,space);
      for(const d of debris){
        const age=Math.max(0,t-d.start),step=Math.max(0,t-d.last);d.last=t;
        if(d.body&&Array.isArray(view.positionSI)){
          advanceBallistic(d.body,Math.min(step,10));
          const relative=inertialToLocal(d.body.position,view.positionSI);
          d.object.position.copy(d.base).add(new THREE.Vector3(relative[0],relative[1],(d.stage===0?-1:1)*age*.7));
        }else d.object.position.copy(d.base).addScaledVector(d.axis,-age*2);
        // Keep detached hardware behind the separating joint, including when
        // the player pitches through it. This is a visual clearance constraint.
        if(age<2){const projection=d.object.position.clone().sub(d.base).dot(d.axis),clearance=-age*2;if(projection>clearance)d.object.position.addScaledVector(d.axis,clearance-projection);}
        const activeBounds=new THREE.Box3().setFromObject(rocket.userData.spacecraft);
        if(stage<2)activeBounds.union(new THREE.Box3().setFromObject(rocket.userData.upper));
        const stageBounds=new THREE.Box3().setFromObject(d.object);
        const contact=boxClearance(activeBounds,stageBounds);
        if(contact){
          const {axis:k,amount:push}=contact;d.object.position[k]+=push;
          // Rebase the independent debris state after contact, rather than
          // drawing the same interpenetration again on the following frame.
          d.base[k]+=push;
          if(d.body&&k!=='z'){
            const p=view.positionSI,r=Math.hypot(...p),normal=k==='x'?[-p[1]/r,p[0]/r]:[p[0]/r,p[1]/r];
            const relativeSpeed=d.body.velocity.reduce((v,n,i)=>v+(n-view.velocitySI[i])*normal[i],0);
            if(relativeSpeed*Math.sign(push)<0)d.body.velocity=d.body.velocity.map((v,i)=>v-1.25*relativeSpeed*normal[i]);
          }
        }
        d.object.quaternion.copy(d.rotation);d.object.visible=age<180&&d.object.position.length()<8000;
      }
      // Detached stages must also clear each other, not only the active craft.
      for(let i=0;i<debris.length;i++)for(let j=i+1;j<debris.length;j++){
        const a=debris[i],b=debris[j];
        const contact=boxClearance(new THREE.Box3().setFromObject(a.object),new THREE.Box3().setFromObject(b.object));
        if(contact){const {axis,amount}=contact;b.object.position[axis]+=amount;b.base[axis]+=amount;}
      }
      rocketRoot.visible=phase!=='failed'||elapsed-phaseAt<.28;
    }else if(mode==='docking'){
      scene.background=new THREE.Color(0x03080d);scene.fog=null;
      earth.visible=earthAtmosphere.visible=stars.visible=true;earth.position.set(-1200,-900,-3500);earth.rotation.y=2.6+t*.0000729;
      hemi.intensity=.23;key.color.set(0xfffaf2);key.intensity=4.6;fill.intensity=.15;rim.intensity=.5;scene.environmentIntensity=.35;
      const position=Array.isArray(view.position)?view.position:[0,0,80];
      craftAttitude.position.set(Number(position[0])||0,Number(position[1])||0,Number(position[2])||0);
      const orientation=view.quaternion||view.orientation;
      if(Array.isArray(orientation)&&orientation.length===4)craftAttitude.quaternion.set(...orientation).normalize();else craftAttitude.quaternion.identity();
      const firing=view.firing||[0,0,0];const firingLevel=Math.abs(firing[0]||0)+Math.abs(firing[1]||0)+Math.abs(firing[2]||0);
      dockingCraft.userData.jets.forEach((jet,i)=>{jet.visible=firingLevel>.01&&i%3===Math.floor(elapsed*16)%3;});
      const cockpit=['port','cockpit','docking'].includes(view.cameraMode);
      dockingCraft.visible=!cockpit&&(!destructiveFailure||elapsed-phaseAt<.28);
      if(cockpit){
        cameraPoint.set(0,.1,-.2).applyQuaternion(craftAttitude.quaternion).add(craftAttitude.position);camera.position.copy(cameraPoint);
        desiredLook.set(0,0,-1).applyQuaternion(craftAttitude.quaternion).add(camera.position);camera.up.set(0,1,0).applyQuaternion(craftAttitude.quaternion);camera.lookAt(desiredLook);
      }else{
        camera.up.set(0,1,0);
        const range=Math.max(0,craftAttitude.position.z);
        desiredCamera.copy(craftAttitude.position).add(new THREE.Vector3(12+Math.min(range*.025,4),10,36));
        desiredLook.copy(craftAttitude.position).multiplyScalar(clamp(range/160,.0,.6));desiredLook.z-=2;
        camera.position.lerp(desiredCamera,smooth);look.lerp(desiredLook,smooth);camera.lookAt(look);
      }
      const captured=phase==='docked';captureGlow.material.opacity=captured?.36+.14*Math.exp(-(elapsed-phaseAt))*Math.sin((elapsed-phaseAt)*7):0;
      if(!captured)materials.portLight.color.set(0xc9e7de);
    }else if(mode==='destination'){
      scene.background=new THREE.Color(0x020509);scene.fog=null;stars.visible=true;stars.material.opacity=.65;
      hemi.intensity=.035;key.position.set(-60,25,45);key.color.set(0xfffaf2);key.intensity=4.3;fill.intensity=.015;rim.intensity=0;scene.environmentIntensity=0;
      camera.position.set(0,5,69*clamp(zoom,.78,1.3));look.set(0,0,0);camera.lookAt(look);
    }else if(mode==='landing'){
      const destination=getDestination(selectedDestination),titan=selectedDestination==='titan',ice=VISUAL_PROFILES[selectedDestination].kind.includes('ice');
      const position=view.position||[0,800],x=Number(position[0])||0,height=Math.max(0,Number(position[1])||0),angle=Number(view.angle)||0;
      const throttle=phase==='landing'?clamp(Number(view.throttle)||0,0,1):0;
      scene.background=new THREE.Color(titan?0x44382a:0x020407);scene.fog=titan?new THREE.FogExp2(0x8d7454,.0018):null;
      stars.visible=!titan;stars.material.opacity=.62;
      key.target.position.set(x,height+2,0);key.position.copy(key.target.position).add(new THREE.Vector3(-65,100,75));key.color.set(ice?0xf5f8ff:0xfff8ec);key.intensity=titan?1.55:4.1;
      hemi.intensity=titan?.75:.09;fill.intensity=titan?.18:.045;rim.intensity=.15;scene.environmentIntensity=.12;
      lander.position.set(x,height,0);lander.rotation.z=-angle;lander.visible=true;
      lander.userData.plume.visible=lander.userData.hot.visible=throttle>.015;
      lander.userData.plume.scale.set(.5+throttle*.65,.35+throttle*.8,.5+throttle*.65);
      lander.userData.hot.scale.setScalar(.45+throttle*.55);
      const torque=Number(view.torque)||0;
      lander.userData.attitudeJets.forEach(jet=>{
        jet.visible=phase==='landing'&&!view.paused&&Math.abs(torque)>5&&Math.sign(torque)===jet.userData.torqueSign;
        jet.scale.setScalar(.4+.6*clamp(Math.abs(torque)/900,0,1));
      });
      engineLight.position.copy(lander.position).add(new THREE.Vector3(0,1.4,0));engineLight.intensity=throttle*(titan?12:5);
      const terminal=1-THREE.MathUtils.smoothstep(height,70,200);
      const descentCamera=['cockpit','port','docking'].includes(view.cameraMode)&&phase==='landing';
      if(descentCamera){
        lander.visible=false;camera.position.set(x,Math.max(8,height+3),.08);camera.up.set(0,0,-1);camera.lookAt(new THREE.Vector3(0,0,0));
      }else{
        desiredCamera.set(x+mix(18,Math.max(15,height*.12),terminal),height+mix(11,Math.max(11,height*.25),terminal),mix(32,Math.max(30,height*1.6+30),terminal));
        desiredLook.set(mix(x,x*.5,terminal),mix(height+2,Math.max(3,height*.52),terminal),0);
        if(Math.abs(camera.position.y-height)>200){camera.position.copy(desiredCamera);look.copy(desiredLook);}
        camera.position.lerp(desiredCamera,smooth);look.lerp(desiredLook,smooth);camera.lookAt(look);
      }
      // Context is composed in camera space, rather than pretending to be an
      // ephemeris. Keep the complete silhouette inside the upper-left view.
      landingParent.visible=!titan&&!['mars','mercury'].includes(selectedDestination);landingParent.position.copy(camera.position).add(new THREE.Vector3(-2500,1600,-11000).applyQuaternion(camera.quaternion));
      const parentScale=clamp(VISUAL_PROFILES[selectedDestination].parentSize*35,100,VISUAL_PROFILES[selectedDestination].parent==='saturn'?310:650);
      landingParent.scale.setScalar(parentScale);
      if(phase==='landed')surface.userData.beacons.forEach(beacon=>beacon.material.color.set(0x9dcba9));
      else if(phase==='failed')surface.userData.beacons.forEach(beacon=>beacon.material.color.set(0xd0a17d));
      else surface.userData.beacons.forEach(beacon=>beacon.material.color.set(0xc6d6bf));
      if(phase==='failed'&&view.impact?.speed>3){lander.rotation.z=-angle+Math.min(1.1,(elapsed-phaseAt)*.45);lander.position.y=Math.max(.1,height-(elapsed-phaseAt)*.4);}
    }
    celestials.setSunDirection(new THREE.Vector3().subVectors(key.position,key.target.position));
    effects.update(frameDt);
    if(freeOrbit){
      const center=mode==='docking'?craftAttitude.position:mode==='landing'?lander.position:mode==='destination'?new THREE.Vector3():desiredLook;
      const radius=(mode==='assembly'?120:mode==='launch'?110:mode==='destination'?69:mode==='docking'?38:38)*orbitZoom;
      camera.up.set(0,1,0);
      camera.position.set(center.x+radius*Math.cos(orbitPitch)*Math.sin(orbitYaw),center.y+radius*Math.sin(orbitPitch),center.z+radius*Math.cos(orbitPitch)*Math.cos(orbitYaw));
      camera.lookAt(center);
      if(mode==='docking')dockingCraft.visible=true;
      if(mode==='landing')lander.visible=true;
    }
    orbitOverview.update(view,debris);
    if(mode==='launch'&&view.orbitOverview&&Array.isArray(view.positionSI)){
      rocketRoot.visible=launchEnvironment.visible=earth.visible=earthAtmosphere.visible=false;
      debris.forEach(d=>d.object.visible=false);scene.fog=null;scene.background=new THREE.Color(0x000000);stars.visible=true;
      orbitOverview.root.visible=true;camera.up.set(0,1,0);camera.position.set(0,0,65);camera.lookAt(0,0,0);
    }
    renderer.render(scene,camera);
    targetProjection.set(0,0,0).project(camera);
    return {targetX:(targetProjection.x+1)/2,targetY:(1-targetProjection.y)/2,targetVisible:Math.abs(targetProjection.x)<=1&&Math.abs(targetProjection.y)<=1&&targetProjection.z>=-1&&targetProjection.z<=1};
  }
  function resize(){
    if(disposed)return;
    const width=Math.max(1,canvas.clientWidth||canvas.parentElement?.clientWidth||640);
    const height=Math.max(1,canvas.clientHeight||canvas.parentElement?.clientHeight||640);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  function onPointerDown(event){if(event.button!==0)return;dragging=true;dragX=event.clientX;dragY=event.clientY;canvas.setPointerCapture?.(event.pointerId);}
  function onPointerMove(event){if(!dragging)return;freeOrbit=true;orbitYaw-=(event.clientX-dragX)*.007;orbitPitch=clamp(orbitPitch+(event.clientY-dragY)*.007,-1.45,1.45);dragX=event.clientX;dragY=event.clientY;}
  function onPointerUp(){dragging=false;}
  function onWheel(event){event.preventDefault();freeOrbit=true;orbitZoom=clamp(orbitZoom*Math.exp(event.deltaY*.001),.25,4);}
  canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',onPointerUp);canvas.addEventListener('wheel',onWheel,{passive:false});
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);
  resize();update({mode:'assembly'},1/60);
  function dispose(){
    if(disposed)return;disposed=true;observer?.disconnect();clearDebris();
    canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointermove',onPointerMove);canvas.removeEventListener('pointerup',onPointerUp);canvas.removeEventListener('pointercancel',onPointerUp);canvas.removeEventListener('wheel',onWheel);
    disposeGeometries(scene);const allMaterials=new Set();scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>allMaterials.add(m));}});allMaterials.forEach(m=>m.dispose());Object.values(textures).forEach(t=>t.dispose());surface.userData.surfaceMap.dispose();celestials.dispose();environment.dispose();renderer.dispose();
  }
  return {setMode,setVehicle,setDestination,update,resize,dispose,resetOrbit,renderer,scene,camera};
}
