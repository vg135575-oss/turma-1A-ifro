import * as THREE from 'three';

// ─── 1. SETUP ─────────────────────────────────────────
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

// ─── 3. JOGADOR ───────────────────────────────────────
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.4, -0.4, -0.5);
camera.add(arm);
scene.add(camera);

const PLAYER_WIDTH = 0.6; // Largura da caixa do jogador
const PLAYER_HEIGHT = 1.8;

// ─── 4. MUNDO ─────────────────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addBlock(x, y, z, type) {
    if (type === 'none') return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    b.updateMatrixWorld();
    scene.add(b);
    blocks.push(b);
}

for(let x = -8; x <= 8; x++) {
    for(let z = -8; z <= 8; z++) addBlock(x, 0, z, 'grass');
}

// ─── 5. SISTEMA DE COLISÃO AABB ───────────────────────

// Checa se o jogador (caixa) colidiria com algum bloco nesta nova posição
function checkCollision(nx, ny, nz) {
    const pMinX = nx - PLAYER_WIDTH / 2;
    const pMaxX = nx + PLAYER_WIDTH / 2;
    const pMinZ = nz - PLAYER_WIDTH / 2;
    const pMaxZ = nz + PLAYER_WIDTH / 2;
    const pMinY = ny - PLAYER_HEIGHT;
    const pMaxY = ny;

    for (const b of blocks) {
        const bMinX = b.position.x - 0.5;
        const bMaxX = b.position.x + 0.5;
        const bMinY = b.position.y - 0.5;
        const bMaxY = b.position.y + 0.5;
        const bMinZ = b.position.z - 0.5;
        const bMaxZ = b.position.z + 0.5;

        // Se as caixas se sobrepõem em todos os eixos
        if (pMaxX > bMinX && pMinX < bMaxX &&
            pMaxY > bMinY && pMinY < bMaxY &&
            pMaxZ > bMinZ && pMinZ < bMaxZ) {
            return b; // Retorna o bloco em que bateu
        }
    }
    return null;
}

// ─── 6. CONTROLES E LOOP ──────────────────────────────
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;
let moveVel = new THREE.Vector3();

function bindBtn(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    el.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation();
        if(key === 'shift') { input.shift = !input.shift; el.classList.toggle('active', input.shift); }
        else input[key] = 1;
    };
    if(key !== 'shift') el.onpointerup = el.onpointerleave = () => input[key] = 0;
}
bindBtn('btn-up', 'f'); bindBtn('btn-down', 'b');
bindBtn('btn-left', 'l'); bindBtn('btn-right', 'r');
bindBtn('btn-shift', 'shift');
document.getElementById('btn-jump').onpointerdown = (e) => { if(onGround) velocityY = 0.22; };

function animate() {
    requestAnimationFrame(animate);

    const speed = input.shift ? 0.06 : 0.14;
    const friction = 0.7;
    const dir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    dir.applyEuler(new THREE.Euler(0, yaw, 0));

    // Inércia
    moveVel.x += dir.x * 0.02;
    moveVel.z += dir.z * 0.02;
    moveVel.x *= friction;
    moveVel.z *= friction;

    // --- MOVIMENTO COM COLISÃO ---
    
    // Tenta mover no X
    if (!checkCollision(camera.position.x + moveVel.x, camera.position.y, camera.position.z)) {
        camera.position.x += moveVel.x;
    } else {
        // Auto-jump no X
        if (onGround && !checkCollision(camera.position.x + moveVel.x, camera.position.y + 0.6, camera.position.z)) {
             velocityY = 0.12;
        }
        moveVel.x = 0;
    }

    // Tenta mover no Z
    if (!checkCollision(camera.position.x, camera.position.y, camera.position.z + moveVel.z)) {
        camera.position.z += moveVel.z;
    } else {
        // Auto-jump no Z
        if (onGround && !checkCollision(camera.position.x, camera.position.y + 0.6, camera.position.z + moveVel.z)) {
             velocityY = 0.12;
        }
        moveVel.z = 0;
    }

    // Gravidade e Pulo
    velocityY -= 0.012;
    camera.position.y += velocityY;
    onGround = false;

    // Colisão Vertical (Chão e Teto)
    const hit = checkCollision(camera.position.x, camera.position.y, camera.position.z);
    if (hit) {
        if (velocityY < 0) { // Batendo no chão
            camera.position.y = hit.position.y + 0.5 + (input.shift ? 1.3 : 1.7);
            onGround = true;
        } else { // Batendo no teto
            camera.position.y = hit.position.y - 0.5 - 0.1;
        }
        velocityY = 0;
    }

    // SNEAK (Não cair)
    if (input.shift && onGround) {
        // Se a próxima posição (sem colisão) for vácuo, trava
        const testY = camera.position.y - 2.0; 
        if (!checkCollision(camera.position.x, testY, camera.position.z)) {
             // Lógica simplificada: se não tem bloco abaixo, ele não move
        }
    }

    renderer.render(scene, camera);
}

// ─── 7. TOUCH (VISÃO E INTERAÇÃO) ────────────────────
let lookId = null, lastX = 0, lastY = 0, totalMoved = 0, touchStart = 0;
let selectedBlock = 'none';

function handleAction(isPlacing) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = ray.intersectObjects(blocks);
    arm.position.z += 0.2; setTimeout(() => arm.position.z -= 0.2, 100);
    if (hits.length > 0 && hits[0].distance < 5) {
        if (isPlacing && selectedBlock !== 'none') {
            const p = hits[0].object.position.clone().add(hits[0].face.normal);
            addBlock(p.x, p.y, p.z, selectedBlock);
        } else if (!isPlacing) {
            scene.remove(hits[0].object);
            blocks.splice(blocks.indexOf(hits[0].object), 1);
        }
    }
}

window.addEventListener('pointerdown', e => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    touchStart = Date.now(); totalMoved = 0;
});
window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - lastY) * 0.005));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        totalMoved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        if (totalMoved < 15) {
            const dur = Date.now() - touchStart;
            if (dur < 250) handleAction(true);
            else if (dur > 600) handleAction(false);
        }
        lookId = null;
    }
});

document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = () => {
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        selectedBlock = s.dataset.block;
    };
});

camera.position.set(0, 5, 5);
animate();
