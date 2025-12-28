import * as THREE from 'three';

// ─── 1. CENA E RENDER ─────────────────────────────────
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

// ─── 3. TEXTURAS (GARANTA QUE OS NOMES ESTÃO CORRETOS) ─
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

// ─── 4. MUNDO ─────────────────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type) {
    if (type === 'none' || !mats[type]) return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

// Chão plano para teste de colisão
for(let x=-10; x<10; x++) {
    for(let z=-10; z<10; z++) {
        addBlock(x, 0, z, 'grass');
        if(Math.random() < 0.05 && (x > 3 || x < -3)) {
            addBlock(x, 1, z, 'wood');
            addBlock(x, 2, z, 'wood');
            addBlock(x, 3, z, 'leaf');
        }
    }
}

// ─── 5. FÍSICA E MOVIMENTO ────────────────────────────
let vy = 0;
let onGround = false;
const playerHeight = 1.6; // Altura dos olhos
const speed = 0.12;

function checkCollision(x, y, z) {
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i].position;
        // Se a posição futura da câmera estiver dentro de um bloco
        if (Math.abs(x - b.x) < 0.7 && Math.abs(z - b.z) < 0.7 && Math.abs((y - 0.8) - b.y) < 0.5) {
            return true;
        }
    }
    return false;
}

const input = { f:0, b:0, l:0, r:0 };
let yaw = 0, pitch = 0;

// Configuração de botões
const setup = (id, k) => {
    const el = document.getElementById(id);
    if(el) {
        el.onpointerdown = (e) => { e.preventDefault(); input[k] = 1; };
        el.onpointerup = () => input[k] = 0;
        el.onpointerleave = () => input[k] = 0;
    }
};
setup('btn-up','f'); setup('btn-down','b'); setup('btn-left','l'); setup('btn-right','r');

document.getElementById('btn-jump').onpointerdown = (e) => {
    e.preventDefault();
    if(onGround && vy === 0) { // SÓ PULA SE ESTIVER PARADO NO CHÃO
        vy = 0.2; 
        onGround = false;
    }
};

// Olhar (Touch)
let lookId = null, lastX = 0, lastY = 0;
window.addEventListener('pointerdown', e => {
    if(e.clientX > window.innerWidth/2) { lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY; }
});
window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.007;
        pitch -= (e.clientY - lastY) * 0.007;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', () => lookId = null);

camera.position.set(0, 5, 5);

// ─── 6. LOOP DE ANIMAÇÃO ──────────────────────────────
function animate() {
    requestAnimationFrame(animate);

    // Movimento Horizontal
    const move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));

    const nextX = camera.position.x + move.x * speed;
    const nextZ = camera.position.z + move.z * speed;

    if (!checkCollision(nextX, camera.position.y, camera.position.z)) camera.position.x = nextX;
    if (!checkCollision(camera.position.x, camera.position.y, nextZ)) camera.position.z = nextZ;

    // Gravidade
    vy -= 0.01; 
    camera.position.y += vy;

    // Colisão com o Chão
    onGround = false;
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i].position;
        if (Math.abs(camera.position.x - b.x) < 0.6 && Math.abs(camera.position.z - b.z) < 0.6) {
            // Se os pés (camera.y - playerHeight) tocarem o topo do bloco
            if (camera.position.y - playerHeight < b.y + 0.5 && camera.position.y - playerHeight > b.y - 0.5) {
                camera.position.y = b.y + 0.5 + playerHeight;
                vy = 0;
                onGround = true;
                break;
            }
        }
    }

    // Reset se cair
    if (camera.position.y < -10) {
        camera.position.set(0, 5, 0);
        vy = 0;
    }

    renderer.render(scene, camera);
}

animate();

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
        }
    }
}

// ─── 5. FÍSICA E COLISÃO (REFORÇADA) ──────────────────
let vy = 0;
let onGround = false;
const playerSize = 0.4; // Tamanho do "corpo" do jogador

function isColliding(px, py, pz) {
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i].position;
        // Verifica se a caixa do jogador toca na caixa do bloco
        if (px + playerSize > b.x - 0.5 && px - playerSize < b.x + 0.5 &&
            pz + playerSize > b.z - 0.5 && pz - playerSize < b.z + 0.5 &&
            py + 0.2 > b.y - 0.5 && py - 1.6 < b.y + 0.5) {
            return true;
        }
    }
    return false;
}

// ─── 6. CONTROLES ─────────────────────────────────────
const input = { f:0, b:0, l:0, r:0 };
let yaw = 0, pitch = 0;
let selected = 'stone';

const bind = (id, k) => {
    const el = document.getElementById(id);
    if(el) {
        el.onpointerdown = (e) => { e.preventDefault(); input[k] = 1; };
        el.onpointerup = () => input[k] = 0;
    }
};
bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r');
document.getElementById('btn-jump').onpointerdown = () => { if(onGround) vy = 0.15; };

// Olhar Touch
let lookId = null, lastX = 0, lastY = 0;
window.addEventListener('pointerdown', e => {
    if(e.clientX > window.innerWidth/2) { lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY; }
});
window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch -= (e.clientY - lastY) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', () => lookId = null);

// ─── 7. LOOP DE ANIMAÇÃO ──────────────────────────────
camera.position.set(0, 5, 0); // Começa no alto

function animate() {
    requestAnimationFrame(animate);

    const speed = 0.1;
    const move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));

    // Movimento X com colisão
    const oldX = camera.position.x;
    camera.position.x += move.x * speed;
    if (isColliding(camera.position.x, camera.position.y, camera.position.z)) {
        camera.position.x = oldX;
    }

    // Movimento Z com colisão
    const oldZ = camera.position.z;
    camera.position.z += move.z * speed;
    if (isColliding(camera.position.x, camera.position.y, camera.position.z)) {
        camera.position.z = oldZ;
    }

    // Gravidade Y com colisão
    vy -= 0.008;
    camera.position.y += vy;
    onGround = false;

    if (isColliding(camera.position.x, camera.position.y, camera.position.z)) {
        camera.position.y -= vy; // Desfaz o movimento
        if (vy < 0) onGround = true;
        vy = 0;
    }

    // Se cair do mapa, volta ao início
    if (camera.position.y < -5) camera.position.set(0, 5, 0);

    renderer.render(scene, camera);
}
animate();

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
