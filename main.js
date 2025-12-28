import * as THREE from 'three';

// ─── CENA E CONFIGURAÇÃO ──────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.02);

const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── ILUMINAÇÃO ───────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

// ─── CARREGADOR DE TEXTURAS ───────────────────────────
const textureLoader = new THREE.TextureLoader();

function loadTex(url) {
    const tex = textureLoader.load(url, 
        undefined, // onProgress
        undefined, // onError
        (err) => console.error("Erro ao carregar textura:", url)
    );
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

// Novos links mais estáveis (Texturas estilo Minecraft)
const texUrls = {
    grassSide: 'https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/grass_side.png',
    grassTop: 'https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/grass_top.png',
    dirt: 'https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/dirt.png',
    stone: 'https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/stone.png',
    wood: 'https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/wood.png',
    glass: 'https://raw.githubusercontent.com/niteshsharma500/Minecraft-Clone/master/textures/glass.png'
};

// ─── MATERIAIS ────────────────────────────────────────
const mats = {
    grass: [
        new THREE.MeshStandardMaterial({ map: loadTex(texUrls.grassSide) }),
        new THREE.MeshStandardMaterial({ map: loadTex(texUrls.grassSide) }),
        new THREE.MeshStandardMaterial({ map: loadTex(texUrls.grassTop) }),
        new THREE.MeshStandardMaterial({ map: loadTex(texUrls.dirt) }),
        new THREE.MeshStandardMaterial({ map: loadTex(texUrls.grassSide) }),
        new THREE.MeshStandardMaterial({ map: loadTex(texUrls.grassSide) })
    ],
    dirt: new THREE.MeshStandardMaterial({ map: loadTex(texUrls.dirt) }),
    stone: new THREE.MeshStandardMaterial({ map: loadTex(texUrls.stone) }),
    wood: new THREE.MeshStandardMaterial({ map: loadTex(texUrls.wood) }),
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

// ─── SISTEMA DE BLOCOS ────────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type) {
    if (type === 'none' || !mats[type]) return;
    const material = (type === 'grass') ? mats.grass : mats[type];
    const b = new THREE.Mesh(geo, material);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

// Gerar Terreno Inicial
for(let x = -8; x < 8; x++) {
    for(let z = -8; z < 8; z++) {
        const h = Math.floor(Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5);
        addBlock(x, h, z, 'grass');
        addBlock(x, h - 1, z, 'dirt');
    }
}

// ─── CONTROLES ────────────────────────────────────────
const input = { f: 0, b: 0, l: 0, r: 0 };
function bind(id, key) {
    const el = document.getElementById(id);
    el.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); input[key] = 1; };
    el.onpointerup = el.onpointerleave = () => { input[key] = 0; };
}
bind('btn-up', 'f'); bind('btn-down', 'b');
bind('btn-left', 'l'); bind('btn-right', 'r');

let vy = 0, onGround = false;
document.getElementById('btn-jump').onpointerdown = (e) => {
    e.preventDefault(); if (onGround) { vy = 0.22; onGround = false; }
};

// ─── OLHAR ────────────────────────────────────────────
let pitch = 0, yaw = 0, lookId = null, lastX = 0, lastY = 0;
addEventListener('pointerdown', e => {
    if (e.clientX > innerWidth / 2 && lookId === null) {
        lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    }
});
addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch -= (e.clientY - lastY) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
addEventListener('pointerup', e => { if (e.pointerId === lookId) lookId = null; });

// ─── AÇÕES ────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
let selected = 'none';

document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = (e) => {
        e.preventDefault();
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        selected = s.dataset.block;
    };
});

function action(place) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);
    armPivot.rotation.x = -0.5;
    setTimeout(() => armPivot.rotation.x = 0, 100);
    if (hits.length > 0 && hits[0].distance < 5) {
        const hit = hits[0];
        if (place && selected !== 'none') {
            const pos = hit.object.position.clone().add(hit.face.normal);
            addBlock(pos.x, pos.y, pos.z, selected);
        } else if (!place) {
            scene.remove(hit.object);
            blocks.splice(blocks.indexOf(hit.object), 1);
        }
    }
}
document.getElementById('btn-break').onpointerdown = e => { e.preventDefault(); action(false); };
document.getElementById('btn-place').onpointerdown = e => { e.preventDefault(); action(true); };

// ─── FÍSICA E LOOP ────────────────────────────────────
function checkCollision(x, y, z) {
    for (const b of blocks) {
        if (Math.abs(b.position.x - x) < 0.7 && Math.abs(b.position.z - z) < 0.7 &&
            Math.abs(b.position.y - (y - 1.2)) < 0.4) return true;
    }
    return false;
}

function animate() {
    requestAnimationFrame(animate);
    const moveDir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    moveDir.applyEuler(new THREE.Euler(0, yaw, 0));
    const speed = 0.12;
    if (!checkCollision(camera.position.x + moveDir.x * speed, camera.position.y, camera.position.z)) 
        camera.position.x += moveDir.x * speed;
    if (!checkCollision(camera.position.x, camera.position.y, camera.position.z + moveDir.z * speed)) 
        camera.position.z += moveDir.z * speed;

    vy -= 0.015; camera.position.y += vy;
    let gh = -10;
    for (const b of blocks) {
        if (Math.abs(b.position.x - camera.position.x) < 0.6 && Math.abs(b.position.z - camera.position.z) < 0.6) {
            if (b.position.y < camera.position.y - 0.5) gh = Math.max(gh, b.position.y + 1.8);
        }
    }
    if (camera.position.y <= gh) { camera.position.y = gh; vy = 0; onGround = true; }
    else onGround = false;

    renderer.render(scene, camera);
}
animate();

onresize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
};
