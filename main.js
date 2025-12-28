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
    if (type === 'none') return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    b.userData.type = type;
    scene.add(b);
    blocks.push(b);
}

// Chão inicial
for(let x = -8; x <= 8; x++) {
    for(let z = -8; z <= 8; z++) {
        addBlock(x, 0, z, 'grass');
    }
}

// ─── 5. INTERAÇÃO ─────────────────────────────────────
const raycaster = new THREE.Raycaster();
let selectedBlock = 'none';

function handleAction(isPlacing) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(blocks);
    
    arm.position.z += 0.2;
    setTimeout(() => arm.position.z -= 0.2, 100);

    if (intersects.length > 0 && intersects[0].distance < 5) {
        const hit = intersects[0];
        if (isPlacing && selectedBlock !== 'none') {
            const pos = hit.object.position.clone().add(hit.face.normal);
            addBlock(pos.x, pos.y, pos.z, selectedBlock);
        } else if (!isPlacing) {
            scene.remove(hit.object);
            blocks.splice(blocks.indexOf(hit.object), 1);
        }
    }
}

// ─── 6. FÍSICA E MOVIMENTAÇÃO CORRIGIDA ───────────────
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;
let moveVelocity = new THREE.Vector3();
let bobTimer = 0;

function bindBtn(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    el.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation();
        if(key === 'shift') {
            input.shift = !input.shift;
            el.classList.toggle('active', input.shift);
        } else { input[key] = 1; }
    };
    if(key !== 'shift') {
        el.onpointerup = el.onpointerleave = () => { input[key] = 0; };
    }
}

bindBtn('btn-up', 'f'); bindBtn('btn-down', 'b');
bindBtn('btn-left', 'l'); bindBtn('btn-right', 'r');
bindBtn('btn-shift', 'shift');
document.getElementById('btn-jump').onpointerdown = (e) => {
    e.preventDefault(); if(onGround) velocityY = 0.22;
};

// Detecção de chão com precisão
function getGroundAt(x, z, radius = 0.3) {
    let highest = -1;
    for (const b of blocks) {
        if (Math.abs(b.position.x - x) < 0.5 + radius && Math.abs(b.position.z - z) < 0.5 + radius) {
            // Só considera blocos que estão abaixo ou no máximo na altura dos pés
            if (b.position.y + 0.5 <= camera.position.y - 0.5) {
                highest = Math.max(highest, b.position.y + 0.5);
            }
        }
    }
    return highest;
}

// Checa se há um obstáculo alto na frente (Impede teleporte)
function isWallAhead(x, z) {
    for (const b of blocks) {
        if (Math.abs(b.position.x - x) < 0.4 && Math.abs(b.position.z - z) < 0.4) {
            // Se o bloco estiver acima da altura permitida para degrau (1.1)
            if (b.position.y + 0.5 > getGroundAt(camera.position.x, camera.position.z) + 1.1) {
                return true;
            }
        }
    }
    return false;
}

function animate() {
    requestAnimationFrame(animate);

    const accel = 0.02;
    const friction = 0.8;
    const maxSpeed = input.shift ? 0.06 : 0.15;
    const eyeHeight = input.shift ? 1.3 : 1.7;

    const wishDir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    wishDir.applyEuler(new THREE.Euler(0, yaw, 0));

    moveVelocity.x += wishDir.x * accel;
    moveVelocity.z += wishDir.z * accel;
    moveVelocity.x *= friction;
    moveVelocity.z *= friction;

    let nextX = camera.position.x + moveVelocity.x;
    let nextZ = camera.position.z + moveVelocity.z;

    // Colisão com Paredes/Torres
    if (isWallAhead(nextX, nextZ)) {
        nextX = camera.position.x;
        nextZ = camera.position.z;
        moveVelocity.set(0, 0, 0);
    }

    // SNEAK (Não cair de bordas)
    if (input.shift && onGround) {
        const currentFloor = getGroundAt(camera.position.x, camera.position.z);
        if (currentFloor - getGroundAt(nextX, nextZ) > 0.1) {
            nextX = camera.position.x;
            nextZ = camera.position.z;
            moveVelocity.set(0,0,0);
        }
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;

    // Gravidade
    velocityY -= 0.012;
    camera.position.y += velocityY;

    const floorY = getGroundAt(camera.position.x, camera.position.z);
    const targetY = floorY + eyeHeight;

    if (camera.position.y < targetY) {
        // Subida suave apenas para degraus pequenos
        if (targetY - camera.position.y < 1.2) {
            camera.position.y += (targetY - camera.position.y) * 0.2;
        } else {
            camera.position.y = targetY; 
        }
        velocityY = 0;
        onGround = true;
    } else {
        onGround = false;
    }

    // Bobbing
    if (onGround && (Math.abs(moveVelocity.x) > 0.01 || Math.abs(moveVelocity.z) > 0.01)) {
        bobTimer += 0.15;
        const bob = Math.sin(bobTimer) * 0.03;
        camera.position.y += bob;
        arm.position.y = -0.4 + (bob * 0.5);
    }

    renderer.render(scene, camera);
}

// ─── 7. TOUCH (VISÃO) ─────────────────────────────────
let lookId = null, lastX = 0, lastY = 0, touchStart = 0, totalMoved = 0;

window.addEventListener('pointerdown', e => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    touchStart = Date.now(); totalMoved = 0;
});
window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        totalMoved += Math.abs(dx) + Math.abs(dy);
        yaw -= dx * 0.005; pitch -= dy * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        if (totalMoved < 15) {
            const duration = Date.now() - touchStart;
            if (duration < 250) handleAction(true);
            else if (duration > 600) handleAction(false);
        }
        lookId = null;
    }
});

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
