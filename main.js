import * as THREE from 'three';

// ─── 1. CONFIGURAÇÃO DA CENA ──────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); 
scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. CARREGADOR DE TEXTURAS ────────────────────────
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous'); 

function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}?v=${Math.random()}`);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const mats = {
    grass: [
        new THREE.MeshBasicMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('grass_top.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('dirt.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('grass_side.png') })
    ],
    dirt: new THREE.MeshBasicMaterial({ map: loadTex('dirt.png') }),
    stone: new THREE.MeshBasicMaterial({ map: loadTex('stone.png') }),
    wood: new THREE.MeshBasicMaterial({ map: loadTex('wood.png') }),
    leaf: new THREE.MeshBasicMaterial({ map: loadTex('leaf.png'), transparent: true, alphaTest: 0.5 })
};

// ─── 3. BRAÇO E RACHADURA ─────────────────────────────
const armPivot = new THREE.Group();
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.6, -0.5, -0.7);
armPivot.add(arm);
camera.add(armPivot);
scene.add(camera);

const crackMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.01, 1.01, 1.01),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })
);
scene.add(crackMesh);

// ─── 4. GESTÃO DO MUNDO ──────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type) {
    if (!mats[type]) return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    b.userData = { type: type };
    scene.add(b);
    blocks.push(b);
}

for(let x = -6; x < 6; x++) {
    for(let z = -6; z < 6; z++) {
        addBlock(x, 0, z, 'grass');
    }
}

// ─── 5. AÇÕES ─────────────────────────────────────────
const raycaster = new THREE.Raycaster();
let selected = 'stone';

function action(place) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);
    armPivot.rotation.x = -0.5; 
    setTimeout(() => armPivot.rotation.x = 0, 100);

    if (hits.length > 0 && hits[0].distance < 5) {
        const hit = hits[0];
        if (place) {
            const pos = hit.object.position.clone().add(hit.face.normal);
            addBlock(pos.x, pos.y, pos.z, selected);
        } else {
            scene.remove(hit.object);
            blocks.splice(blocks.indexOf(hit.object), 1);
        }
    }
}

// ─── 6. CONTROLOS E SHIFT ─────────────────────────────
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let pitch = 0, yaw = 0, lookId = null, lastX = 0, lastY = 0;
let isMovingDedo = false, touchStart = 0;

function bind(id, k) {
    const el = document.getElementById(id);
    if(el) {
        el.onpointerdown = e => { e.stopPropagation(); e.preventDefault(); input[k] = 1; };
        el.onpointerup = el.onpointerleave = e => { e.stopPropagation(); input[k] = 0; };
    }
}
bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r');

// Pulo e Shift
document.getElementById('btn-jump').onpointerdown = e => { e.stopPropagation(); if(onGround) vy = 0.22; };

document.getElementById('btn-shift').onpointerdown = e => { e.stopPropagation(); input.shift = true; };
document.getElementById('btn-shift').onpointerup = e => { e.stopPropagation(); input.shift = false; };

document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = e => {
        e.stopPropagation();
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected'); selected = s.dataset.block;
    };
});

window.addEventListener('pointerdown', e => {
    if (e.target.closest('.dbtn') || e.target.closest('.slot') || e.target.closest('.action-btn')) return;
    if (e.clientX > window.innerWidth / 2 && lookId === null) {
        lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
        touchStart = Date.now(); isMovingDedo = false;
    }
});

window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) isMovingDedo = true;
        yaw -= dx * 0.005; pitch -= dy * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});

window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        if (!isMovingDedo && (Date.now() - touchStart) < 250) action(true);
        lookId = null;
    }
});

// ─── 7. FÍSICA E ANIMAÇÃO ─────────────────────────────
let vy = 0, onGround = false, walkTime = 0;
let currentHeight = 1.8;

function checkCollision(x, y, z) {
    for (const b of blocks) {
        if (Math.abs(b.position.x - x) < 0.7 && Math.abs(b.position.z - z) < 0.7 &&
            Math.abs(b.position.y - (y - currentHeight)) < 0.5) return true;
    }
    return false;
}

camera.position.set(0, 4, 4);

function animate() {
    requestAnimationFrame(animate);
    
    // Lógica Shift
    const speed = input.shift ? 0.05 : 0.12;
    const targetHeight = input.shift ? 1.4 : 1.8;
    currentHeight += (targetHeight - currentHeight) * 0.15;

    const move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));
    
    if (!checkCollision(camera.position.x + move.x * speed, camera.position.y, camera.position.z)) camera.position.x += move.x * speed;
    if (!checkCollision(camera.position.x, camera.position.y, camera.position.z + move.z * speed)) camera.position.z += move.z * speed;

    vy -= 0.012; camera.position.y += vy;
    let gh = -10;
    for (const b of blocks) {
        if (Math.abs(b.position.x - camera.position.x) < 0.6 && Math.abs(b.position.z - camera.position.z) < 0.6) {
            if (b.position.y < camera.position.y - 0.5) gh = Math.max(gh, b.position.y + currentHeight);
        }
    }
    if (camera.position.y <= gh) { camera.position.y = gh; vy = 0; onGround = true; }
    else onGround = false;

    renderer.render(scene, camera);
}
animate();
