import * as THREE from 'three';

// ─── CENA ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.02);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── LUZ ──────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

// ─── TEXTURAS ─────────────────────────────────────────
const loader = new THREE.TextureLoader();
function tex(url) {
    const t = loader.load(url);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return t;
}

const mats = {
    grass: [
        new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/grass_side.png') }),
        new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/grass_side.png') }),
        new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/grass_top.png') }),
        new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/dirt.png') }),
        new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/grass_side.png') }),
        new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/grass_side.png') })
    ],
    dirt: new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/dirt.png') }),
    stone: new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/stone.png') }),
    wood: new THREE.MeshStandardMaterial({ map: tex('https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/wood.png') }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x3a6324, transparent: true, opacity: 0.9 })
};

// ─── BRAÇO ────────────────────────────────────────────
const armPivot = new THREE.Group();
const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xffdbac })
);
arm.position.set(0.6, -0.5, -0.7);
armPivot.add(arm);
camera.add(armPivot);
scene.add(camera);

// ─── BLOCOS + CHUNKS ──────────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 2;
const chunks = new Map();

function addBlock(x, y, z, type) {
    if (!mats[type]) return;
    const m = type === 'grass' ? mats.grass : mats[type];
    const b = new THREE.Mesh(geo, m);
    b.position.set(x, y, z);
    scene.add(b);
    blocks.push(b);
}

function chunkKey(cx, cz) {
    return `${cx},${cz}`;
}

function generateChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (chunks.has(key)) return;

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            const wx = cx * CHUNK_SIZE + x;
            const wz = cz * CHUNK_SIZE + z;
            const h = Math.floor(Math.sin(wx * 0.25) * Math.cos(wz * 0.25) * 2);

            addBlock(wx, h, wz, 'grass');
            addBlock(wx, h - 1, wz, 'dirt');
        }
    }

    chunks.set(key, true);
}

function unloadChunks(pcX, pcZ) {
    for (const key of chunks.keys()) {
        const [cx, cz] = key.split(',').map(Number);
        if (Math.abs(cx - pcX) > RENDER_DISTANCE || Math.abs(cz - pcZ) > RENDER_DISTANCE) {
            for (let i = blocks.length - 1; i >= 0; i--) {
                const b = blocks[i];
                const bx = Math.floor(b.position.x / CHUNK_SIZE);
                const bz = Math.floor(b.position.z / CHUNK_SIZE);
                if (bx === cx && bz === cz) {
                    scene.remove(b);
                    blocks.splice(i, 1);
                }
            }
            chunks.delete(key);
        }
    }
}

// ─── CONTROLES ────────────────────────────────────────
const input = { f: 0, b: 0, l: 0, r: 0 };
function bind(id, key) {
    const e = document.getElementById(id);
    e.onpointerdown = ev => { ev.preventDefault(); input[key] = 1; };
    e.onpointerup = e.onpointerleave = () => input[key] = 0;
}
bind('btn-up','f'); bind('btn-down','b');
bind('btn-left','l'); bind('btn-right','r');

let vy = 0, onGround = false;
document.getElementById('btn-jump').onpointerdown = e => {
    e.preventDefault();
    if (onGround) { vy = 0.22; onGround = false; }
};

// ─── OLHAR ────────────────────────────────────────────
let yaw = 0, pitch = 0, pid = null, lx = 0, ly = 0;
addEventListener('pointerdown', e => {
    if (e.clientX > innerWidth/2 && pid === null) {
        pid = e.pointerId; lx = e.clientX; ly = e.clientY;
    }
});
addEventListener('pointermove', e => {
    if (e.pointerId === pid) {
        yaw -= (e.clientX - lx) * 0.005;
        pitch -= (e.clientY - ly) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lx = e.clientX; ly = e.clientY;
    }
});
addEventListener('pointerup', e => { if (e.pointerId === pid) pid = null; });

// ─── LOOP ─────────────────────────────────────────────
function animate() {
    requestAnimationFrame(animate);

    const dir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    dir.applyEuler(new THREE.Euler(0, yaw, 0));
    camera.position.addScaledVector(dir, 0.12);

    vy -= 0.015;
    camera.position.y += vy;
    if (camera.position.y < 2) {
        camera.position.y = 2;
        vy = 0;
        onGround = true;
    }

    const pcX = Math.floor(camera.position.x / CHUNK_SIZE);
    const pcZ = Math.floor(camera.position.z / CHUNK_SIZE);

    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            generateChunk(pcX + x, pcZ + z);
        }
    }

    unloadChunks(pcX, pcZ);

    renderer.render(scene, camera);
}
animate();

onresize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
};