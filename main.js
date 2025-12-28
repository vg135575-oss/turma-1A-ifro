import * as THREE from 'three';

/* ================= CENA ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

/* ================= LUZ ================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

/* ================= TEXTURAS ================= */
const loader = new THREE.TextureLoader();
const pixel = t => {
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
};

const mats = {
  grass: new THREE.MeshStandardMaterial({ color: 0x55aa55 }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
};

/* ================= BLOCOS / CHUNKS ================= */
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

const CHUNK = 16;
const DIST = 2;
const chunks = new Map();

function addBlock(x, y, z, type) {
  const b = new THREE.Mesh(geo, mats[type]);
  b.position.set(x, y, z);
  scene.add(b);
  blocks.push(b);
}

function genChunk(cx, cz) {
  const key = cx + ',' + cz;
  if (chunks.has(key)) return;

  for (let x = 0; x < CHUNK; x++) {
    for (let z = 0; z < CHUNK; z++) {
      const wx = cx * CHUNK + x;
      const wz = cz * CHUNK + z;
      const h = Math.floor(Math.sin(wx * 0.2) * Math.cos(wz * 0.2) * 2);
      addBlock(wx, h, wz, 'grass');
      addBlock(wx, h - 1, wz, 'dirt');
    }
  }
  chunks.set(key, true);
}

/* ================= PLAYER ================= */
const input = { f:0, b:0, l:0, r:0 };
const bind = (id,k)=>{
  const e=document.getElementById(id);
  e.onpointerdown=_=>input[k]=1;
  e.onpointerup=e.onpointerleave=_=>input[k]=0;
};
bind('btn-up','f'); bind('btn-down','b');
bind('btn-left','l'); bind('btn-right','r');

let vy=0,onGround=false;

/* ================= MOBS ================= */
const mobs = [];

function spawnMob(x, z) {
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  body.position.set(x, 2, z);
  scene.add(body);

  mobs.push({
    mesh: body,
    dir: Math.random() * Math.PI * 2
  });
}

function updateMobs() {
  mobs.forEach(m => {
    m.mesh.position.x += Math.sin(m.dir) * 0.02;
    m.mesh.position.z += Math.cos(m.dir) * 0.02;

    if (Math.random() < 0.01) {
      m.dir += (Math.random() - 0.5);
    }
  });
}

/* ================= LOOP ================= */
function animate() {
  requestAnimationFrame(animate);

  const dir = new THREE.Vector3(input.r-input.l,0,input.b-input.f).normalize();
  camera.position.addScaledVector(dir, 0.12);

  vy -= 0.015;
  camera.position.y += vy;
  if (camera.position.y < 2) {
    camera.position.y = 2;
    vy = 0;
    onGround = true;
  }

  const pcx = Math.floor(camera.position.x / CHUNK);
  const pcz = Math.floor(camera.position.z / CHUNK);

  for(let x=-DIST;x<=DIST;x++){
    for(let z=-DIST;z<=DIST;z++){
      genChunk(pcx+x,pcz+z);
    }
  }

  // spawn mobs perto
  if (mobs.length < 5) {
    spawnMob(
      camera.position.x + Math.random()*10-5,
      camera.position.z + Math.random()*10-5
    );
  }

  updateMobs();
  renderer.render(scene,camera);
}
animate();

onresize=_=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
};