import * as THREE from 'three';

// --- CONFIGURAÇÃO DE CENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('game-container').appendChild(renderer.domElement);

// --- CARREGAMENTO DE TEXTURAS ---
const loader = new THREE.TextureLoader();
function loadTex(file) {
    const t = loader.load(`./textures/${file}`);
    t.magFilter = THREE.NearestFilter; // Mantém o estilo pixelado
    t.minFilter = THREE.NearestFilter;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
}

// Criando materiais com correção de mapeamento
const mats = {
    grass: [
        new THREE.MeshBasicMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('grass_top.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('dirt.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadTex('grass_side.png') })
    ],
    stone: new THREE.MeshBasicMaterial({ map: loadTex('stone.png') }),
    dirt: new THREE.MeshBasicMaterial({ map: loadTex('dirt.png') }),
    wood: new THREE.MeshBasicMaterial({ map: loadTex('wood.png') })
};

// --- JOGADOR E BRAÇO ---
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.5, -0.6, -0.7);
camera.add(arm);
scene.add(camera);

// --- MUNDO ---
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addBlock(x, y, z, type) {
    const mesh = new THREE.Mesh(geo, mats[type] || mats.stone);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    blocks.push(mesh);
}

// Gerar um chão pequeno e uma torre (como na sua foto)
for(let x = -5; x < 5; x++) for(let z = -5; z < 5; z++) addBlock(x, 0, z, 'grass');
addBlock(0, 1, 0, 'stone');
addBlock(0, 2, 0, 'wood');
addBlock(0, 3, 0, 'dirt');

// --- CONTROLES ---
let input = { f: 0, b: 0, l: 0, r: 0, sneak: false };
let yaw = 0, pitch = 0, vY = 0, onGround = false;
let selectedBlock = 'none';

// Botões de Movimento
const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.onpointerdown = (e) => { e.preventDefault(); if(key === 'sneak') { input.sneak = !input.sneak; el.classList.toggle('active'); } else input[key] = 1; };
    el.onpointerup = () => { if(key !== 'sneak') input[key] = 0; };
};
bind('btn-up', 'f'); bind('btn-down', 'b'); bind('btn-left', 'l'); bind('btn-right', 'r'); bind('btn-shift', 'sneak');
document.getElementById('btn-jump').onpointerdown = () => { if(onGround) vY = 0.22; };

// --- INTERAÇÃO: OLHAR E QUEBRAR ---
let lookId = null, lastX, lastY, isBreaking = false, breakProg = 0, targetBlock = null;

window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;

    // Inicia rotação de câmera
    lookId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;

    // Tentar identificar bloco na mira (Centro da tela)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(blocks);

    if (intersects.length > 0 && intersects[0].distance < 4) {
        targetBlock = intersects[0].object;
        isBreaking = true;
        breakProg = 0;
    }
});

window.addEventListener('pointermove', (e) => {
    if (e.pointerId === lookId) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        yaw -= deltaX * 0.005;
        pitch -= deltaY * 0.005;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX;
        lastY = e.clientY;
    }
});

window.addEventListener('pointerup', () => {
    lookId = null;
    isBreaking = false;
    targetBlock = null;
});

// --- LOOP DE ANIMAÇÃO ---
function animate() {
    requestAnimationFrame(animate);

    // Movimento
    const speed = input.sneak ? 0.05 : 0.12;
    const height = input.sneak ? 1.4 : 1.7;
    const dir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    dir.applyEuler(new THREE.Euler(0, yaw, 0));
    camera.position.x += dir.x * speed;
    camera.position.z += dir.z * speed;

    // Gravidade e Colisão simples
    vY -= 0.01;
    camera.position.y += vY;
    onGround = false;
    blocks.forEach(b => {
        if (Math.abs(camera.position.x - b.position.x) < 0.6 && Math.abs(camera.position.z - b.position.z) < 0.6) {
            if (camera.position.y - height < b.position.y + 0.5 && camera.position.y - height > b.position.y - 0.5) {
                camera.position.y = b.position.y + 0.5 + height;
                vY = 0;
                onGround = true;
            }
        }
    });

    // Lógica de Quebrar
    if (isBreaking && targetBlock) {
        breakProg += 1.5;
        arm.position.z = -0.7 + Math.sin(Date.now() * 0.015) * 0.1; // Balanço do braço
        if (breakProg >= 100) {
            scene.remove(targetBlock);
            blocks.splice(blocks.indexOf(targetBlock), 1);
            isBreaking = false;
        }
    } else {
        arm.position.z = -0.7;
    }

    renderer.render(scene, camera);
}

// Seleção da Hotbar
document.querySelectorAll('.slot').forEach(slot => {
    slot.onpointerdown = () => {
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
        selectedBlock = slot.dataset.block;
    };
});

camera.position.set(0, 5, 5);
animate();
