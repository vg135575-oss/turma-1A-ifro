import * as THREE from 'three';

// ─── 1. CONFIGURAÇÃO DA CENA E RENDERER ────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Céu azul claro
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. TEXTURAS E MATERIAIS ──────────────────────────
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');

function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}?v=${Math.random()}`);
    tex.magFilter = THREE.NearestFilter; // Mantém o estilo pixelado
    tex.minFilter = THREE.NearestFilter;
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

// ─── 3. JOGADOR (BRAÇO E CÂMARA) ──────────────────────
const armPivot = new THREE.Group();
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.6, -0.5, -0.7);
armPivot.add(arm);
camera.add(armPivot);
scene.add(camera);

const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type) {
    if (!mats[type]) return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    b.userData.type = type;
    scene.add(b);
    blocks.push(b);
}

// Gerar um chão inicial
for(let x = -8; x < 8; x++) {
    for(let z = -8; z < 8; z++) {
        addBlock(x, 0, z, 'grass');
    }
}

// ─── 4. AÇÕES (QUEBRAR E COLOCAR) ─────────────────────
const raycaster = new THREE.Raycaster();
let selectedBlock = 'stone';

function handleAction(isPlacing) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);
    
    // Animação do braço
    armPivot.rotation.x = -0.5; 
    setTimeout(() => armPivot.rotation.x = 0, 100);

    if (hits.length > 0 && hits[0].distance < 5) {
        const hit = hits[0];
        if (isPlacing) {
            const pos = hit.object.position.clone().add(hit.face.normal);
            addBlock(pos.x, pos.y, pos.z, selectedBlock);
        } else {
            scene.remove(hit.object);
            blocks.splice(blocks.indexOf(hit.object), 1);
            if(navigator.vibrate) navigator.vibrate(50);
        }
    }
}

// ─── 5. CONTROLOS E EVENTOS ──────────────────────────
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let pitch = 0, yaw = 0, lookId = null, lastX = 0, lastY = 0;
let isMovingFinger = false, touchStartTime = 0;

// Ligar botões do HTML ao código
function bindBtn(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    el.onpointerdown = e => { 
        e.stopPropagation(); 
        if(key === 'shift') input.shift = true; 
        else input[key] = 1; 
    };
    el.onpointerup = el.onpointerleave = e => { 
        e.stopPropagation(); 
        if(key === 'shift') input.shift = false; 
        else input[key] = 0; 
    };
}

bindBtn('btn-up', 'f');
bindBtn('btn-down', 'b');
bindBtn('btn-left', 'l');
bindBtn('btn-right', 'r');
bindBtn('btn-shift', 'shift');

document.getElementById('btn-jump').onpointerdown = e => { 
    e.stopPropagation(); 
    if(onGround) velocityY = 0.22; 
};

// Seleção da Hotbar
document.querySelectorAll('.slot').forEach(slot => {
    slot.onpointerdown = e => {
        e.stopPropagation();
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
        selectedBlock = slot.dataset.block;
    };
});

// Movimentação da Câmara e Toque para ação
window.addEventListener('pointerdown', e => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    if (e.clientX > window.innerWidth / 2) {
        lookId = e.pointerId;
        lastX = e.clientX;
        lastY = e.clientY;
        touchStartTime = Date.now();
        isMovingFinger = false;
    }
});

window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isMovingFinger = true;
        
        yaw -= dx * 0.005;
        pitch -= dy * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX;
        lastY = e.clientY;
    }
});

window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        if (!isMovingFinger) {
            const duration = Date.now() - touchStartTime;
            if (duration < 250) handleAction(true); // Clique rápido coloca
            else handleAction(false);              // Segurar quebra
        }
        lookId = null;
    }
});

// ─── 6. FÍSICA E ANIMAÇÃO ─────────────────────────────
let velocityY = 0, onGround = false, currentHeight = 1.8;
camera.position.set(0, 5, 5);

// Verifica se há um bloco abaixo da posição (para o Sneak)
function hasFloorAt(x, z) {
    for (const b of blocks) {
        if (Math.abs(b.position.x - x) < 0.65 && Math.abs(b.position.z - z) < 0.65) {
            if (b.position.y < camera.position.y - 0.5) return true;
        }
    }
    return false;
}

function animate() {
    requestAnimationFrame(animate);

    // Velocidade e Altura (Sneak/Agachar)
    const moveSpeed = input.shift ? 0.05 : 0.12;
    const targetHeight = input.shift ? 1.4 : 1.8;
    currentHeight += (targetHeight - currentHeight) * 0.15;

    // Movimento direcional
    const direction = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    direction.applyEuler(new THREE.Euler(0, yaw, 0));
    
    let nextX = camera.position.x + direction.x * moveSpeed;
    let nextZ = camera.position.z + direction.z * moveSpeed;

    // LÓGICA SNEAK: Impede de cair da borda se o shift estiver ativo
    if (input.shift && onGround) {
        if (!hasFloorAt(nextX, camera.position.z)) nextX = camera.position.x;
        if (!hasFloorAt(camera.position.x, nextZ)) nextZ = camera.position.z;
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;

    // Gravidade
    velocityY -= 0.012;
    camera.position.y += velocityY;

    // Colisão simples com o chão
    let groundHeight = -10;
    for (const b of blocks) {
        if (Math.abs(b.position.x - camera.position.x) < 0.6 && Math.abs(b.position.z - camera.position.z) < 0.6) {
            if (b.position.y < camera.position.y - 0.5) {
                groundHeight = Math.max(groundHeight, b.position.y + currentHeight);
            }
        }
    }

    if (camera.position.y <= groundHeight) {
        camera.position.y = groundHeight;
        velocityY = 0;
        onGround = true;
    } else {
        onGround = false;
    }

    renderer.render(scene, camera);
}

animate();
