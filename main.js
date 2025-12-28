import * as THREE from 'three';

// --- SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('game-container').appendChild(renderer.domElement);

// --- TEXTURAS ---
const loader = new THREE.TextureLoader();
function loadT(f) {
    const t = loader.load(`./textures/${f}`);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return t;
}

const crackTexs = [];
for(let i=0; i<10; i++) crackTexs.push(loadT(`crack_${i}.png`));

const mats = {
    grass: [loadT('grass_side.png'), loadT('grass_side.png'), loadT('grass_top.png'), loadT('dirt.png'), loadT('grass_side.png'), loadT('grass_side.png')].map(m => new THREE.MeshBasicMaterial({map: m})),
    stone: new THREE.MeshBasicMaterial({ map: loadT('stone.png') }),
    dirt: new THREE.MeshBasicMaterial({ map: loadT('dirt.png') }),
    wood: new THREE.MeshBasicMaterial({ map: loadT('wood.png') }),
    leaf: new THREE.MeshBasicMaterial({ map: loadT('leaf.png'), transparent: true, alphaTest: 0.5 })
};

// --- MUNDO (CAMADAS E ÁRVORES) ---
const blocks = [];
function addB(x, y, z, type) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(x, y, z);
    scene.add(b);
    blocks.push(b);
}

// Criar plataforma 20x20 com camadas
for(let x=-10; x<=10; x++) {
    for(let z=-10; z<=10; z++) {
        addB(x, 0, z, 'grass');   // Camada 0: Relva
        addB(x, -1, z, 'dirt');   // Camada -1: Terra
        addB(x, -2, z, 'stone');  // Camada -2: Pedra
    }
}

// Função para criar uma árvore
function createTree(x, z) {
    for(let y=1; y<=3; y++) addB(x, y, z, 'wood'); // Tronco
    // Copa de folhas
    for(let lx=-1; lx<=1; lx++) {
        for(let lz=-1; lz<=1; lz++) {
            for(let ly=3; ly<=4; ly++) {
                if(lx === 0 && lz === 0 && ly === 3) continue;
                addB(x+lx, ly, z+lz, 'leaf');
            }
        }
    }
}
// Árvores de teste
createTree(5, 5);
createTree(-5, -7);
createTree(3, -4);

// --- PERSONAGEM ---
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.5, -0.6, -0.7);
camera.add(arm);
scene.add(camera);

const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({ transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
crackMesh.visible = false;
scene.add(crackMesh);

// --- CONTROLOS ---
let input = { f:0, b:0, l:0, r:0, sneak: false };
let yaw = 0, pitch = 0, vY = 0, onG = false, selBlock = 'none';

const bind = (id, k) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.onpointerdown = (e) => {
        e.preventDefault();
        if(k === 'sneak') {
            input.sneak = !input.sneak;
            el.classList.toggle('active', input.sneak);
        } else input[k] = 1;
    };
    el.onpointerup = () => { if(k !== 'sneak') input[k] = 0; };
};
bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r'); bind('btn-shift','sneak');
document.getElementById('btn-jump').onpointerdown = () => { if(onG) vY = 0.22; };

// --- FÍSICA ---
function updatePhysics() {
    const speed = input.sneak ? 0.05 : 0.13;
    const h = input.sneak ? 1.4 : 1.7;
    let move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));

    let nextX = camera.position.x + move.x * speed;
    let nextZ = camera.position.z + move.z * speed;

    // Trava de Sneak (não cair)
    if (input.sneak && onG) {
        let hasFloor = false;
        for (let b of blocks) {
            if (Math.abs(nextX - b.position.x) < 0.6 && Math.abs(nextZ - b.position.z) < 0.6 && Math.abs(camera.position.y - 1.4 - (b.position.y + 0.5)) < 0.2) {
                hasFloor = true; break;
            }
        }
        if (!hasFloor) { nextX = camera.position.x; nextZ = camera.position.z; }
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;
    vY -= 0.01;
    camera.position.y += vY;
    onG = false;

    for (let b of blocks) {
        if (Math.abs(camera.position.x - b.position.x) < 0.6 && Math.abs(camera.position.z - b.position.z) < 0.6) {
            if (camera.position.y - h < b.position.y + 0.5 && camera.position.y - h > b.position.y - 0.5) {
                camera.position.y = b.position.y + 0.5 + h;
                vY = 0; onG = true;
            }
        }
    }
}

// --- INTERAÇÃO (CLIQUE ÚNICO E VISÃO) ---
let lookId = null, lastX, lastY, bBlock = null, bProg = 0, tStart = 0, moved = false;

window.addEventListener('pointerdown', e => {
    if(e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    lookId = e.pointerId;
    lastX = e.clientX; lastY = e.clientY;
    moved = false; // Resetar detecção de movimento de câmara

    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = ray.intersectObjects(blocks);
    if(hits.length > 0 && hits[0].distance < 4) {
        bBlock = hits[0].object;
        tStart = Date.now();
    }
});

window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        const dx = Math.abs(e.clientX - lastX);
        const dy = Math.abs(e.clientY - lastY);
        if(dx > 5 || dy > 5) moved = true; // Se arrastou mais de 5px, é movimento de câmara

        yaw -= (e.clientX - lastX) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - lastY) * 0.005));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});

window.addEventListener('pointerup', e => {
    if (lookId === e.pointerId) {
        // Se NÃO moveu a câmara e foi um clique rápido, coloca bloco
        if (!moved && bBlock && Date.now() - tStart < 250 && selBlock !== 'none') {
            const ray = new THREE.Raycaster();
            ray.setFromCamera(new THREE.Vector2(0,0), camera);
            const hits = ray.intersectObjects(blocks);
            if(hits.length > 0) {
                const p = hits[0].object.position.clone().add(hits[0].face.normal);
                addB(p.x, p.y, p.z, selBlock);
            }
        }
        lookId = null; bBlock = null; bProg = 0;
        crackMesh.visible = false;
    }
});

function animate() {
    requestAnimationFrame(animate);
    updatePhysics();

    // Quebrar bloco (só se não estiver a mover a câmara)
    if(!moved && bBlock && Date.now() - tStart > 250) {
        bProg += 2;
        crackMesh.visible = true;
        crackMesh.position.copy(bBlock.position);
        crackMesh.material.map = crackTexs[Math.min(Math.floor(bProg/10), 9)];
        arm.position.z = -0.7 + Math.sin(Date.now() * 0.02) * 0.1;
        if(bProg >= 100) {
            scene.remove(bBlock);
            blocks.splice(blocks.indexOf(bBlock), 1);
            bBlock = null; bProg = 0;
        }
    } else { arm.position.z = -0.7; }
    renderer.render(scene, camera);
}

document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = () => {
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        selBlock = s.dataset.block;
    };
});

camera.position.set(0, 5, 5);
animate();
