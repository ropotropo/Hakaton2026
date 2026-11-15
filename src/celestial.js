import * as THREE from 'three';

// These are explicit paths so the portable builder can embed every resource.
// The maps are NASA display assets. They do not define gravity or landing DEMs.
export const BODY_TEXTURE_PATHS = Object.freeze({
  earth: 'assets/celestial-earth.jpg',
  moon: 'assets/celestial-moon.jpg',
  moonHeight: 'assets/celestial-moon-height.jpg',
  phobos: 'assets/celestial-phobos.jpg',
  deimos: 'assets/celestial-deimos.jpg',
  io: 'assets/celestial-io.jpg',
  europa: 'assets/celestial-europa.jpg',
  ganymede: 'assets/celestial-ganymede.jpg',
  callisto: 'assets/celestial-callisto.jpg',
  titan: 'assets/celestial-titan.jpg',
  enceladus: 'assets/celestial-enceladus.jpg',
  rhea: 'assets/celestial-rhea.jpg',
  iapetus: 'assets/celestial-iapetus.jpg',
  triton: 'assets/celestial-triton.jpg',
  mars: 'assets/celestial-mars.jpg',
  jupiter: 'assets/celestial-jupiter.jpg',
  saturn: 'assets/celestial-saturn.jpg',
  neptune: 'assets/celestial-neptune.jpg',
});

export const VISUAL_PROFILES = Object.freeze({
  moon: { parent: 'earth', color: '#97938d', kind: 'regolith', parentSize: 2.4 },
  phobos: { parent: 'mars', color: '#7b7367', kind: 'regolith', parentSize: 28, shape: [1.28, 1.03, .83] },
  deimos: { parent: 'mars', color: '#8b8074', kind: 'regolith', parentSize: 14, shape: [1.2, .94, .86] },
  io: { parent: 'jupiter', color: '#a79952', kind: 'sulfur', parentSize: 22 },
  europa: { parent: 'jupiter', color: '#d5dce0', kind: 'ice', parentSize: 14 },
  ganymede: { parent: 'jupiter', color: '#9e9482', kind: 'ice-rock', parentSize: 9 },
  callisto: { parent: 'jupiter', color: '#79736b', kind: 'regolith', parentSize: 5.5 },
  titan: { parent: 'saturn', color: '#8e754c', kind: 'haze', parentSize: 7 },
  enceladus: { parent: 'saturn', color: '#e1e5e7', kind: 'ice', parentSize: 29 },
  rhea: { parent: 'saturn', color: '#9b9a94', kind: 'ice-rock', parentSize: 13 },
  iapetus: { parent: 'saturn', color: '#716c61', kind: 'regolith', parentSize: 2.8 },
  triton: { parent: 'neptune', color: '#c1c9c9', kind: 'ice', parentSize: 8 },
});

function textureFromCanvas(canvas, color = true) {
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function seeded(seed = 1138) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function cloudTexture() {
  // Illustrative cloud layer, deliberately separate from the dated NASA map.
  // There is no live weather claim and no baked-in sunlight in this alpha map.
  const canvas = document.createElement('canvas'); canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d'), rand = seeded(73119);
  for (let i = 0; i < 440; i++) {
    const x = rand() * canvas.width, latitude = rand() * Math.PI;
    const y = (0.14 + rand() * .72) * canvas.height;
    const width = 24 + rand() * 180, height = 6 + rand() * 27;
    const curl = Math.sin(latitude * 6) * .3;
    for (const wrap of [-canvas.width, 0, canvas.width]) {
      ctx.save(); ctx.translate(x + wrap, y); ctx.rotate(curl + (rand()-.5)*.2);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gradient.addColorStop(0, 'rgba(255,255,255,.67)');
      gradient.addColorStop(.45, 'rgba(255,255,255,.39)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.scale(width, height); ctx.fillStyle = gradient; ctx.fillRect(-1,-1,2,2); ctx.restore();
    }
  }
  return textureFromCanvas(canvas);
}

function atmosphere(radius, tint, strength = .22) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: { sunDirection: { value: new THREE.Vector3(-.8,.35,.6).normalize() }, tint: { value: new THREE.Color(tint) }, strength: { value: strength } },
    vertexShader: `varying vec3 worldNormal; varying vec3 worldPoint;
      void main(){ vec4 p=modelMatrix*vec4(position,1.0); worldPoint=p.xyz; worldNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*p; }`,
    fragmentShader: `uniform vec3 sunDirection; uniform vec3 tint; uniform float strength;
      varying vec3 worldNormal; varying vec3 worldPoint;
      void main(){ vec3 n=normalize(worldNormal); vec3 v=normalize(cameraPosition-worldPoint);
        float rim=pow(1.0-clamp(dot(n,v),0.0,1.0),3.8);
        float day=smoothstep(-.18,.42,dot(n,sunDirection));
        float alpha=rim*day*strength;
        gl_FragColor=vec4(tint,alpha); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), material);
}

function makeRingTexture() {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=4;
  const ctx=canvas.getContext('2d'), rand=seeded(1907);
  for(let i=0;i<1024;i++){
    const r=i/1024;
    const cassini=r>.58&&r<.635;
    const alpha=cassini?.05:(.2+.55*Math.pow(Math.sin(i*.043)*.5+.5,.6))*(.8+rand()*.2);
    ctx.fillStyle=`rgba(${174+Math.floor(rand()*27)},${162+Math.floor(rand()*24)},${132+Math.floor(rand()*18)},${alpha})`;
    ctx.fillRect(i,0,1,4);
  }
  return textureFromCanvas(canvas);
}

export function createCelestials(renderer, options = {}) {
  const textureCache=new Map(), resources=[];
  const loader=new THREE.TextureLoader();
  function getTexture(id) {
    if(textureCache.has(id))return textureCache.get(id);
    const path=BODY_TEXTURE_PATHS[id];
    if(!path)return null;
    const texture=loader.load(new URL(path,document.baseURI).href,()=>{
      if(id==='earth')makeOceanRoughness(texture);
    },undefined,()=>options.onAssetWarning?.(`The local ${id} map could not be loaded.`));
    texture.colorSpace=id==='moonHeight'?THREE.NoColorSpace:THREE.SRGBColorSpace;
    texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    textureCache.set(id,texture);return texture;
  }

  const earth=new THREE.Group();
  const earthSurface=new THREE.Mesh(new THREE.SphereGeometry(1900,128,80),new THREE.MeshStandardMaterial({
    map:getTexture('earth'), color:0xffffff, roughness:.9, metalness:0,
    envMapIntensity:.015, emissive:0x020507, emissiveIntensity:.12,
  }));earth.add(earthSurface);
  function makeOceanRoughness(texture) {
    if(!texture.image)return;
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0,1024,512);
    const image=ctx.getImageData(0,0,1024,512),data=image.data;
    for(let i=0;i<data.length;i+=4){
      const ocean=data[i+2]>data[i]*1.22&&data[i+2]>data[i+1]*.95&&data[i]<95;
      const rough=ocean?92:232;data[i]=data[i+1]=data[i+2]=rough;data[i+3]=255;
    }
    ctx.putImageData(image,0,0);const roughness=textureFromCanvas(canvas,false);resources.push(roughness);
    earthSurface.material.roughness=1;earthSurface.material.roughnessMap=roughness;earthSurface.material.needsUpdate=true;
  }
  const cloudsMap=cloudTexture();resources.push(cloudsMap);
  const earthClouds=new THREE.Mesh(new THREE.SphereGeometry(1903.8,128,64),new THREE.MeshStandardMaterial({
    map:cloudsMap,transparent:true,opacity:.72,roughness:1,metalness:0,envMapIntensity:0,depthWrite:false,
  }));earthClouds.renderOrder=2;earth.add(earthClouds);
  const earthAtmosphere=atmosphere(1916,0x74b3e0,.24);earthAtmosphere.renderOrder=3;earth.add(earthAtmosphere);

  const preview=new THREE.Group();
  const bodyPivot=new THREE.Group();preview.add(bodyPivot);
  const body=new THREE.Mesh(new THREE.SphereGeometry(17,128,80),new THREE.MeshStandardMaterial({roughness:1,metalness:0,envMapIntensity:0}));bodyPivot.add(body);
  const parentContext=new THREE.Group();preview.add(parentContext);
  const parentBody=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({roughness:.96,metalness:0,envMapIntensity:0}));parentContext.add(parentBody);
  const ringGeometry=new THREE.RingGeometry(1.22,2.36,128);
  const ringPositions=ringGeometry.attributes.position,ringUV=ringGeometry.attributes.uv;
  for(let i=0;i<ringPositions.count;i++){
    const x=ringPositions.getX(i),y=ringPositions.getY(i);
    ringUV.setXY(i,(Math.hypot(x,y)-1.22)/(2.36-1.22),(Math.atan2(y,x)+Math.PI)/(Math.PI*2));
  }
  const ringMap=makeRingTexture();resources.push(ringMap);
  const parentRings=new THREE.Mesh(ringGeometry,new THREE.MeshStandardMaterial({map:ringMap,transparent:true,opacity:.88,side:THREE.DoubleSide,roughness:1,metalness:0,envMapIntensity:0,depthWrite:false}));
  parentRings.rotation.x=-Math.PI/2;parentContext.add(parentRings);
  const titanHaze=atmosphere(17.35,0xcba776,.25);bodyPivot.add(titanHaze);titanHaze.visible=false;
  let destination='moon';
  function setDestination(next) {
    const id=typeof next==='string'?next:next?.id;
    if(!VISUAL_PROFILES[id]||id===destination&&body.material.map)return false;
    destination=id;const profile=VISUAL_PROFILES[id];
    body.material.map=getTexture(id);body.material.color.set(0xffffff);
    body.material.bumpMap=id==='moon'?getTexture('moonHeight'):null;
    body.material.bumpScale=id==='moon'?.085:0;
    body.material.roughness=1;body.material.needsUpdate=true;
    body.geometry.dispose();body.geometry=new THREE.SphereGeometry(17,128,80);
    if(profile.shape){
      const positions=body.geometry.attributes.position;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
        const relief=1+.021*Math.sin(x*.39+y*.44)*Math.cos(z*.42)+.012*Math.sin(y*.8+z*.23);
        positions.setXYZ(i,x*profile.shape[0]*relief,y*profile.shape[1]*relief,z*profile.shape[2]*relief);
      }
      positions.needsUpdate=true;body.geometry.computeVertexNormals();
    }
    bodyPivot.rotation.set(.11,-.8,.035);
    titanHaze.visible=id==='titan';
    parentBody.material.map=getTexture(profile.parent);parentBody.material.needsUpdate=true;
    parentContext.scale.setScalar(profile.parentSize);
    parentContext.position.set(-43,19,-116);
    parentContext.rotation.set(.2,-.4,-.32);
    parentRings.visible=profile.parent==='saturn';
    return true;
  }
  function update(time,rotation=0,reducedMotion=false){
    bodyPivot.rotation.y=-.8+rotation+(reducedMotion?0:time*.012);
    earthClouds.rotation.y=time*.000011;
  }
  function setSunDirection(direction){
    earthAtmosphere.material.uniforms.sunDirection.value.copy(direction).normalize();
    titanHaze.material.uniforms.sunDirection.value.copy(direction).normalize();
  }
  function dispose(){
    const geometries=new Set(),materials=new Set();
    for(const root of [earth,preview])root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textureCache.forEach(t=>t.dispose());resources.forEach(t=>t.dispose());
  }
  setDestination('moon');
  return {earth,earthSurface,earthClouds,earthAtmosphere,preview,body,bodyPivot,parentContext,setDestination,update,setSunDirection,getTexture,dispose,
    getDestination:()=>destination,getProfile:()=>VISUAL_PROFILES[destination]};
}
