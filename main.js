import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader();
function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}`, undefined, undefined, () => {
        console.warn("Erro ao carregar textura: " + file);
    });
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

// Rachaduras
const crackTextures = [];
for(let i=0; i<10; i++) crackTextures.push(loadTex(`crack_${i}.png`));

const mats = {
    grass: [loadTex('grass_side.png'), loadTex('grass_side.png'), loadTex('grass_top.png'), loadTex('dirt.png'), loadTex('grass_side.png'), loadTex('grass_side.png')].map(t => new THREE.MeshBasicMaterial({map: t})),
    stone: new THREE.MeshBasicMaterial({ map: loadTex('stone.png') }),
    wood: new THREE.MeshBasicMaterial({ map: loadTex('wood.png') })
};

const crackMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.01, 1.01, 1.01),
    new THREE.MeshBasicMaterial({ transparent: true, polygonOffset: true, polygonOffsetFactor: -1 })
);
crackMesh.visible = false;
scene.add(crackMesh);

const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addBlock(x, y, z, type) {
    const material = mats[type] || mats.stone;
    const b = new THREE.Mesh(geo, material);
    b.position.set(x, y, z);
    scene.add(b);
    blocks.push(b);
}

// Gerar chão
for(let x = -8; x <= 8; x++) {
    for(let z = -8; z <= 8; z++) addBlock(x, 0, z, 'grass');
}

// --- FÍSICA E MOVIMENTO ---
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;

function checkCollision(nx, ny, nz) {
    for (const b of blocks) {
        if (Math.abs(nx - b.position.x) < 0.8 && Math.abs(nz - b.position.z) < 0.8 && Math.abs((ny-0.8) - b.position.y) < 1) return b;
    }
    return null;
}

function animate() {
    requestAnimationFrame(animate);

    let speed = input.shift ? 0.05 : 0.12;
    let forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw, 0));
    let side = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw, 0));

    let nextPos = camera.position.clone();
    if(input.f) nextPos.addScaledVector(forward, speed);
    if(input.b) nextPos.addScaledVector(forward, -speed);
    if(input.l) nextPos.addScaledVector(side, -speed);
    if(input.r) nextPos.addScaledVector(side, speed);

    if(!checkCollision(nextPos.x, camera.position.y, nextPos.z)) {
        camera.position.x = nextPos.x;
        camera.position.z = nextPos.z;
    }

    velocityY -= 0.01;
    camera.position.y += velocityY;
    const hit = checkCollision(camera.position.x, camera.position.y, camera.position.z);
    if(hit) {
        camera.position.y = hit.position.y + 1.7;
        velocityY = 0;
        onGround = true;
    } else { onGround = false; }

    renderer.render(scene, camera);
}

// --- INTERAÇÃO (DIREITA = QUEBRAR, ESQUERDA = OLHAR) ---
let lookId = null, lastX = 0, lastY = 0;
window.addEventListener('pointerdown', e => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    if (e.clientX < window.innerWidth / 2) {
        lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch -= (e.clientY - lastY) * 0.005;
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', () => lookId = null);

// Botões
const bind = (id, k) => {
    const el = document.getElementById(id);
    el.onpointerdown = () => input[k] = 1;
    el.onpointerup = () => input[k] = 0;
}
bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r');
document.getElementById('btn-jump').onpointerdown = () => { if(onGround) velocityY = 0.15; };

camera.position.set(0, 5, 5);
animate();
