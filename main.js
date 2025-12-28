import * as THREE from 'three';

// ─── 1. CENA E RENDERIZADOR ───────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. LUZ ───────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

// ─── 3. TEXTURAS ──────────────────────────────────────
const textureLoader = new THREE.TextureLoader();
function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}`);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

const mats = {
    grass: [
        new THREE.MeshStandardMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshStandardMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshStandardMaterial({ map: loadTex('grass_top.png') }),
        new THREE.MeshStandardMaterial({ map: loadTex('dirt.png') }),
        new THREE.MeshStandardMaterial({ map: loadTex('grass_side.png') }),
        new THREE.MeshStandardMaterial({ map: loadTex('grass_side.png') })
    ],
    dirt: new THREE.MeshStandardMaterial({ map: loadTex('dirt.png') }),
    stone: new THREE.MeshStandardMaterial({ map: loadTex('stone.png') }),
    wood: new THREE.MeshStandardMaterial({ map: loadTex('wood.png') }),
    leaf: new THREE.MeshStandardMaterial({ map: loadTex('leaf.png'), transparent: true, alphaTest: 0.5 })
};

// ─── 4. MUNDO E BLOCOS ────────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type) {
    if (type === 'none' || !mats[type]) return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

// Chão estável
for(let x=-8; x<8; x++) {
    for(let z=-8; z<8; z++) {
        addBlock(x, 0, z, 'grass');
        addBlock(x, -1, z, 'dirt');
    }
}

// ─── 5. CONTROLES (FIXING THE BUTTONS) ────────────────
const input = { f: 0, b: 0, l: 0, r: 0 };
let yaw = 0, pitch = 0, vy = 0, onGround = false;

function bind(id, key) {
    const el = document.getElementById(id);
    if (el) {
        el.onpointerdown = (e) => { e.preventDefault(); input[key] = 1; };
        el.onpointerup = (e) => { e.preventDefault(); input[key] = 0; };
        el.onpointerleave = (e) => { e.preventDefault(); input[key] = 0; };
    }
}

bind('btn-up', 'f'); bind('btn-down', 'b');
bind('btn-left', 'l'); bind('btn-right', 'r');

const jumpBtn = document.getElementById('btn-jump');
if (jumpBtn) {
    jumpBtn.onpointerdown = (e) => {
        e.preventDefault();
        if (onGround) {
            vy = 0.18;
            onGround = false;
        }
    };
}

// Olhar (Lado direito da tela)
let lookId = null, lastX = 0, lastY = 0;
window.addEventListener('pointerdown', e => {
    if (e.clientX > window.innerWidth / 2) {
        lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.007;
        pitch -= (e.clientY - lastY) * 0.007;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', () => lookId = null);

// ─── 6. FÍSICA E COLISÃO ──────────────────────────────
const playerHeight = 1.7;

function checkCollision(x, y, z) {
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i].position;
        if (Math.abs(x - b.x) < 0.7 && Math.abs(z - b.z) < 0.7 && Math.abs((y - 0.8) - b.y) < 0.5) {
            return true;
        }
    }
    return false;
}

// ─── 7. LOOP DE ANIMAÇÃO ──────────────────────────────
camera.position.set(0, 5, 0);

function animate() {
    requestAnimationFrame(animate);

    // Movimento Horizontal
    const speed = 0.12;
    const move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));

    const nextX = camera.position.x + move.x * speed;
    const nextZ = camera.position.z + move.z * speed;

    if (!checkCollision(nextX, camera.position.y, camera.position.z)) camera.position.x = nextX;
    if (!checkCollision(camera.position.x, camera.position.y, nextZ)) camera.position.z = nextZ;

    // Gravidade
    vy -= 0.01;
    camera.position.y += vy;

    // Detecção de Chão
    onGround = false;
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i].position;
        if (Math.abs(camera.position.x - b.x) < 0.6 && Math.abs(camera.position.z - b.z) < 0.6) {
            if (camera.position.y - playerHeight < b.y + 0.5 && camera.position.y - playerHeight > b.y - 0.5) {
                camera.position.y = b.y + 0.5 + playerHeight;
                vy = 0;
                onGround = true;
                break;
            }
        }
    }

    if (camera.position.y < -10) camera.position.set(0, 5, 0);

    renderer.render(scene, camera);
}

animate();

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
