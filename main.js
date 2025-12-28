import * as THREE from 'three';

// 1. SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// 2. TEXTURAS
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

// 3. BRAÇO (Corrigido para não sumir)
const armPivot = new THREE.Group();
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.7), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.4, -0.4, -0.6); // Posição fixa relativa ao olho
armPivot.add(arm);
camera.add(armPivot); // O braço agora é "filho" da câmera
scene.add(camera);

// 4. MUNDO
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addBlock(x, y, z, type) {
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

for(let x = -8; x < 8; x++) {
    for(let z = -8; z < 8; z++) {
        addBlock(x, 0, z, 'grass');
    }
}
addBlock(0, 1, 0, 'stone'); // Bloco elevado para teste

// 5. INTERAÇÃO
const raycaster = new THREE.Raycaster();
let selectedBlock = 'stone';

function handleAction(isPlacing) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);
    
    // Animação de soco
    arm.position.z += 0.2;
    setTimeout(() => arm.position.z -= 0.2, 100);

    if (hits.length > 0 && hits[0].distance < 5) {
        const hit = hits[0];
        if (isPlacing) {
            const pos = hit.object.position.clone().add(hit.face.normal);
            addBlock(pos.x, pos.y, pos.z, selectedBlock);
        } else {
            scene.remove(hit.object);
            blocks.splice(blocks.indexOf(hit.object), 1);
        }
    }
}

// 6. FÍSICA E MOVIMENTO
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;

// Função que checa se existe chão sólido abaixo de um ponto
function getBlockUnder(x, z) {
    let highest = -100;
    for (const b of blocks) {
        if (x >= b.position.x - 0.5 && x <= b.position.x + 0.5 &&
            z >= b.position.z - 0.5 && z <= b.position.z + 0.5) {
            highest = Math.max(highest, b.position.y + 0.5);
        }
    }
    return highest;
}

function animate() {
    requestAnimationFrame(animate);

    const speed = input.shift ? 0.05 : 0.13;
    const eyeHeight = input.shift ? 1.4 : 1.7; // Câmera desce ao agachar

    const direction = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    direction.applyEuler(new THREE.Euler(0, yaw, 0));

    let nextX = camera.position.x + direction.x * speed;
    let nextZ = camera.position.z + direction.z * speed;

    // LÓGICA DE SNEAK (Checa altura do próximo passo)
    if (input.shift && onGround) {
        const currentFloor = getBlockUnder(camera.position.x, camera.position.z);
        const nextFloorX = getBlockUnder(nextX, camera.position.z);
        const nextFloorZ = getBlockUnder(camera.position.x, nextZ);

        // Se o próximo bloco for mais de 0.1 abaixo do atual, ele trava
        if (currentFloor - nextFloorX > 0.1) nextX = camera.position.x;
        if (currentFloor - nextFloorZ > 0.1) nextZ = camera.position.z;
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;

    // Gravidade
    velocityY -= 0.012;
    camera.position.y += velocityY;

    // Colisão com chão
    const groundY = getBlockUnder(camera.position.x, camera.position.z);
    if (camera.position.y <= groundY + eyeHeight) {
        camera.position.y = groundY + eyeHeight;
        velocityY = 0;
        onGround = true;
    } else {
        onGround = false;
    }

    renderer.render(scene, camera);
}

// 7. EVENTOS (MOBILE)
function bindBtn(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    if(key === 'shift') {
        el.onpointerdown = e => {
            e.stopPropagation();
            input.shift = !input.shift;
            el.classList.toggle('active', input.shift);
        };
    } else {
        el.onpointerdown = () => input[key] = 1;
        el.onpointerup = () => input[key] = 0;
    }
}
bindBtn('btn-up', 'f'); bindBtn('btn-down', 'b');
bindBtn('btn-left', 'l'); bindBtn('btn-right', 'r');
bindBtn('btn-shift', 'shift');
document.getElementById('btn-jump').onpointerdown = () => { if(onGround) velocityY = 0.22; };

// Toque na tela para olhar e agir
let lookId = null, lastX = 0, lastY = 0, touchTime = 0;
window.addEventListener('pointerdown', e => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
    touchTime = Date.now();
});
window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch -= (e.clientY - lastY) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        if (Date.now() - touchTime < 200) handleAction(true);
        else if (Date.now() - touchTime > 500) handleAction(false);
        lookId = null;
    }
});

animate();
