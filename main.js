import * as THREE from 'three';

// 1. CENA E RENDERER
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// 2. TEXTURAS
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}`);
    tex.magFilter = THREE.NearestFilter;
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

// 3. BRAÇO DO JOGADOR (Visual)
const armPivot = new THREE.Group();
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.6, -0.5, -0.7);
armPivot.add(arm);
camera.add(armPivot);
scene.add(camera);

// 4. MUNDO E BLOCOS
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

// Mapa inicial (16x16)
for(let x = -8; x < 8; x++) {
    for(let z = -8; z < 8; z++) {
        addBlock(x, 0, z, 'grass');
    }
}
// Alguns blocos extras para testar degraus
addBlock(0, 1, 0, 'stone');
addBlock(1, 1, 0, 'stone');

// 5. INTERAÇÃO (QUEBRAR / COLOCAR)
const raycaster = new THREE.Raycaster();
let selectedBlock = 'stone';

function handleAction(isPlacing) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);
    
    // Animação de clique
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

// 6. CONTROLES (MOVIMENTO E VISÃO)
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;
let lookId = null, lastX = 0, lastY = 0, touchStartTime = 0, isMovingFinger = false;

function bindBtn(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    if(key === 'shift') {
        el.onpointerdown = e => {
            e.stopPropagation();
            input.shift = !input.shift;
            el.classList.toggle('active', input.shift);
            if(navigator.vibrate) navigator.vibrate(30);
        };
    } else {
        el.onpointerdown = e => { e.stopPropagation(); input[key] = 1; };
        el.onpointerup = el.onpointerleave = e => { e.stopPropagation(); input[key] = 0; };
    }
}

bindBtn('btn-up', 'f'); bindBtn('btn-down', 'b');
bindBtn('btn-left', 'l'); bindBtn('btn-right', 'r');
bindBtn('btn-shift', 'shift');
document.getElementById('btn-jump').onpointerdown = e => { 
    e.stopPropagation(); 
    if(onGround) velocityY = 0.22; 
};

// Seleção de Hotbar
document.querySelectorAll('.slot').forEach(slot => {
    slot.onpointerdown = e => {
        e.stopPropagation();
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
        slot.classList.add('selected');
        selectedBlock = slot.dataset.block;
    };
});

// Visão e Clique na Tela
window.addEventListener('pointerdown', e => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    if (e.clientX > window.innerWidth / 2) {
        lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
        touchStartTime = Date.now(); isMovingFinger = false;
    }
});

window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isMovingFinger = true;
        yaw -= dx * 0.005; pitch -= dy * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});

window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        if (!isMovingFinger) {
            const duration = Date.now() - touchStartTime;
            if (duration < 250) handleAction(true); // Curto: Coloca
            else handleAction(false); // Longo: Quebra
        }
        lookId = null;
    }
});

// 7. FÍSICA DE BORDA (SNEAK)
const PLAYER_RADIUS = 0.3;

function isFloorAt(x, z) {
    // Detecta a altura do bloco atual sobre o qual o jogador está "oficialmente"
    const currentFootY = Math.round(camera.position.y - (input.shift ? 1.4 : 1.8));
    for (const b of blocks) {
        if (x >= b.position.x - 0.5 && x <= b.position.x + 0.5 &&
            z >= b.position.z - 0.5 && z <= b.position.z + 0.5) {
            // Só permite andar se o bloco estiver no mesmo nível (impede cair degrau de 1)
            if (Math.abs(b.position.y - currentFootY) < 0.1) return true;
        }
    }
    return false;
}

function canMoveTo(x, z) {
    const points = [
        {x: x - PLAYER_RADIUS, z: z - PLAYER_RADIUS},
        {x: x + PLAYER_RADIUS, z: z - PLAYER_RADIUS},
        {x: x - PLAYER_RADIUS, z: z + PLAYER_RADIUS},
        {x: x + PLAYER_RADIUS, z: z + PLAYER_RADIUS}
    ];
    for(let p of points) {
        if (!isFloorAt(p.x, p.z)) return false;
    }
    return true;
}

// 8. LOOP PRINCIPAL
function animate() {
    requestAnimationFrame(animate);

    const speed = input.shift ? 0.05 : 0.13;
    const direction = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    direction.applyEuler(new THREE.Euler(0, yaw, 0));

    let nextX = camera.position.x + direction.x * speed;
    let nextZ = camera.position.z + direction.z * speed;

    if (input.shift && onGround) {
        if (!canMoveTo(nextX, camera.position.z)) nextX = camera.position.x;
        if (!canMoveTo(camera.position.x, nextZ)) nextZ = camera.position.z;
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;

    // Gravidade
    velocityY -= 0.012;
    camera.position.y += velocityY;

    // Colisão com Chão
    onGround = false;
    let targetHeight = input.shift ? 1.4 : 1.8;
    let highestGround = -100;

    for(const b of blocks) {
        if (Math.abs(b.position.x - camera.position.x) < 0.7 && Math.abs(b.position.z - camera.position.z) < 0.7) {
            let topY = b.position.y + 0.5 + targetHeight;
            if (camera.position.y <= topY + 0.1 && camera.position.y > b.position.y) {
                highestGround = Math.max(highestGround, topY);
                onGround = true;
            }
        }
    }

    if (onGround) {
        camera.position.y = highestGround;
        velocityY = 0;
    }

    renderer.render(scene, camera);
}
animate();
