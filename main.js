import * as THREE from 'three';

// ─── 1. SETUP DA CENA ─────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. TEXTURAS ──────────────────────────────────────
const textureLoader = new THREE.TextureLoader();
function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}`);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

const mats = {
    grass: [loadTex('grass_side.png'), loadTex('grass_side.png'), loadTex('grass_top.png'), loadTex('dirt.png'), loadTex('grass_side.png'), loadTex('grass_side.png')].map(t => new THREE.MeshBasicMaterial({map: t})),
    dirt: new THREE.MeshBasicMaterial({ map: loadTex('dirt.png') }),
    stone: new THREE.MeshBasicMaterial({ map: loadTex('stone.png') }),
    wood: new THREE.MeshBasicMaterial({ map: loadTex('wood.png') }),
    leaf: new THREE.MeshBasicMaterial({ map: loadTex('leaf.png'), transparent: true, alphaTest: 0.5 })
};

// ─── 3. JOGADOR (BRAÇO E CÂMERA) ──────────────────────
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.4, -0.4, -0.5);
camera.add(arm);
scene.add(camera);

// ─── 4. MUNDO E BLOCOS ────────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type) {
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    b.userData.type = type;
    scene.add(b);
    blocks.push(b);
}

for(let x = -8; x <= 8; x++) {
    for(let z = -8; z <= 8; z++) {
        addBlock(x, 0, z, 'grass');
    }
}
// Degraus de teste
addBlock(2, 1, 0, 'stone');
addBlock(3, 2, 0, 'stone');

// ─── 5. INTERAÇÃO (QUEBRAR/COLOCAR) ───────────────────
const raycaster = new THREE.Raycaster();
let selectedBlock = 'none'; // Começa com a "Mão"

function handleAction(isPlacing) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(blocks);

    // Animação de soco sempre acontece
    arm.position.z += 0.2;
    setTimeout(() => arm.position.z -= 0.2, 100);

    if (intersects.length > 0 && intersects[0].distance < 5) {
        const hit = intersects[0];
        if (isPlacing) {
            // Só coloca se não for o slot "none" (Mão)
            if (selectedBlock !== 'none') {
                const pos = hit.object.position.clone().add(hit.face.normal);
                addBlock(pos.x, pos.y, pos.z, selectedBlock);
            }
        } else {
            scene.remove(hit.object);
            blocks.splice(blocks.indexOf(hit.object), 1);
        }
    }
}

// ─── 6. MOVIMENTO E FÍSICA SUAVE ──────────────────────
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;
let currentVisualY = 5; // Para suavizar a subida de degraus

function bindBtn(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    if(key === 'shift') {
        el.onpointerdown = (e) => {
            e.preventDefault(); e.stopPropagation();
            input.shift = !input.shift;
            el.classList.toggle('active', input.shift);
        };
    } else {
        el.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); input[key] = 1; };
        el.onpointerup = el.onpointerleave = () => { input[key] = 0; };
    }
}

bindBtn('btn-up', 'f'); bindBtn('btn-down', 'b');
bindBtn('btn-left', 'l'); bindBtn('btn-right', 'r');
bindBtn('btn-shift', 'shift');
document.getElementById('btn-jump').onpointerdown = (e) => { 
    e.preventDefault(); if(onGround) velocityY = 0.22; 
};

function getGroundAt(x, z) {
    let highest = -1;
    for (const b of blocks) {
        if (Math.abs(b.position.x - x) < 0.6 && Math.abs(b.position.z - z) < 0.6) {
            highest = Math.max(highest, b.position.y + 0.5);
        }
    }
    return highest;
}

function animate() {
    requestAnimationFrame(animate);

    const moveSpeed = input.shift ? 0.05 : 0.13;
    const eyeHeight = input.shift ? 1.3 : 1.7;

    const dir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    dir.applyEuler(new THREE.Euler(0, yaw, 0));

    let nextX = camera.position.x + dir.x * moveSpeed;
    let nextZ = camera.position.z + dir.z * moveSpeed;

    // LÓGICA DE SNEAK
    if (input.shift && onGround) {
        const currentFloor = getGroundAt(camera.position.x, camera.position.z);
        if (currentFloor - getGroundAt(nextX, camera.position.z) > 0.1) nextX = camera.position.x;
        if (currentFloor - getGroundAt(camera.position.x, nextZ) > 0.1) nextZ = camera.position.z;
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;

    // Gravidade
    velocityY -= 0.012;
    camera.position.y += velocityY;

    // Colisão e Subida de Degrau Suave
    const floorY = getGroundAt(camera.position.x, camera.position.z);
    const targetY = floorY + eyeHeight;

    if (camera.position.y < targetY) {
        // Interpolação para evitar o "teleporte"
        camera.position.y += (targetY - camera.position.y) * 0.2; 
        velocityY = 0;
        onGround = true;
    } else {
        onGround = false;
    }

    renderer.render(scene, camera);
}

// ─── 7. TOUCH (VISÃO E FILTRO) ────────────────────────
let lookId = null, lastX = 0, lastY = 0, touchStart = 0, totalMoved = 0;

window.addEventListener('pointerdown', e => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    lookId = e.pointerId;
    lastX = e.clientX; lastY = e.clientY;
    touchStart = Date.now();
    totalMoved = 0;
});

window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        totalMoved += Math.abs(dx) + Math.abs(dy);
        yaw -= dx * 0.005;
        pitch -= dy * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});

window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        if (totalMoved < 15) { // Filtro de movimento para não bugar ao virar
            const duration = Date.now() - touchStart;
            if (duration < 250) handleAction(true);
            else if (duration > 600) handleAction(false);
        }
        lookId = null;
    }
});

// Seleção de Blocos (Incluindo a Mão)
document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        selectedBlock = s.dataset.block;
    };
});

camera.position.set(0, 5, 5);
animate();
