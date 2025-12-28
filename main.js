import * as THREE from 'three';

// ─── 1. SETUP INICIAL ───
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. CARREGAMENTO DE TEXTURAS (COM PROTEÇÃO) ───
const loader = new THREE.TextureLoader();
function loadT(file, fallbackColor) {
    return loader.load(`./textures/${file}`, 
        undefined, undefined, 
        () => console.warn(`Erro na textura ${file}, usando cor base.`)
    );
}

// Materiais (Se a imagem sumir, o bloco fica com a cor definida)
const mats = {
    grass: [
        new THREE.MeshBasicMaterial({ map: loadT('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadT('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadT('grass_top.png') }),
        new THREE.MeshBasicMaterial({ map: loadT('dirt.png') }),
        new THREE.MeshBasicMaterial({ map: loadT('grass_side.png') }),
        new THREE.MeshBasicMaterial({ map: loadT('grass_side.png') })
    ],
    stone: new THREE.MeshBasicMaterial({ map: loadT('stone.png'), color: 0x888888 }),
    dirt: new THREE.MeshBasicMaterial({ map: loadT('dirt.png'), color: 0x8b4513 }),
    wood: new THREE.MeshBasicMaterial({ map: loadT('wood.png'), color: 0x5d4037 })
};

// ─── 3. BRAÇO DO JOGADOR ───
const armGeo = new THREE.BoxGeometry(0.25, 0.25, 0.7);
const armMat = new THREE.MeshBasicMaterial({ color: 0xffdbac });
const arm = new THREE.Mesh(armGeo, armMat);
arm.position.set(0.4, -0.5, -0.6); // Posição clássica do Mine
camera.add(arm);
scene.add(camera);

// ─── 4. MUNDO ───
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addB(x, y, z, type) {
    const m = mats[type] || mats.stone;
    const b = new THREE.Mesh(geo, m);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

// Chão inicial
for(let x=-8; x<8; x++) {
    for(let z=-8; z<8; z++) addB(x, 0, z, 'grass');
}

// ─── 5. CONTROLES E FÍSICA ───
let input = { f:0, b:0, l:0, r:0, shift: false };
let yaw = 0, pitch = 0, vY = 0, onG = false;
let selectedBlock = 'none';

// Mapear botões da UI
const setupBtn = (id, key) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.onpointerdown = (e) => {
        e.preventDefault();
        if(key === 'shift') {
            input.shift = !input.shift;
            el.classList.toggle('active', input.shift);
        } else { input[key] = 1; }
    };
    el.onpointerup = () => { if(key !== 'shift') input[key] = 0; };
};

setupBtn('btn-up', 'f'); setupBtn('btn-down', 'b');
setupBtn('btn-left', 'l'); setupBtn('btn-right', 'r');
setupBtn('btn-shift', 'shift');

const jumpBtn = document.getElementById('btn-jump');
if(jumpBtn) jumpBtn.onpointerdown = () => { if(onG) vY = 0.22; };

// ─── 6. QUEBRA E COLOCAÇÃO ───
let bBlock = null, bProg = 0;

function updatePhysics() {
    let speed = input.shift ? 0.06 : 0.13;
    let forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw, 0));
    let side = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw, 0));

    let move = new THREE.Vector3();
    if(input.f) move.add(forward);
    if(input.b) move.add(forward.negate());
    if(input.l) move.add(side.negate());
    if(input.r) move.add(side);
    move.normalize().multiplyScalar(speed);

    // Movimento com colisão simples
    camera.position.x += move.x;
    camera.position.z += move.z;

    // Gravidade
    vY -= 0.012;
    camera.position.y += vY;

    // Colisão com o chão
    onG = false;
    blocks.forEach(b => {
        if(Math.abs(camera.position.x - b.position.x) < 0.7 && 
           Math.abs(camera.position.z - b.position.z) < 0.7 &&
           (camera.position.y - 1.7) < b.position.y + 0.5 &&
           (camera.position.y - 1.7) > b.position.y - 0.5) {
            camera.position.y = b.position.y + 0.5 + 1.7;
            vY = 0;
            onG = true;
        }
    });
}

// ─── 7. TOUCH (OLHAR E INTERAGIR) ───
let lookId = null, lastX, lastY, touchStart;

window.addEventListener('pointerdown', e => {
    // Se clicou em botão ou slot, ignora
    if(e.target.closest('.mc-btn') || e.target.closest('.slot')) return;

    if(e.clientX < window.innerWidth / 2) {
        // Lado esquerdo: Olhar
        lookId = e.pointerId;
        lastX = e.clientX;
        lastY = e.clientY;
    } else {
        // Lado direito: Quebrar/Colocar
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0,0), camera);
        const hits = ray.intersectObjects(blocks);
        
        if(hits.length > 0 && hits[0].distance < 5) {
            bBlock = hits[0].object;
            touchStart = Date.now();
            
            // Soco rápido coloca bloco, segurar quebra
            setTimeout(() => {
                if(bBlock && (Date.now() - touchStart < 250)) {
                    if(selectedBlock !== 'none') {
                        const p = hits[0].object.position.clone().add(hits[0].face.normal);
                        addB(p.x, p.y, p.z, selectedBlock);
                    }
                    bBlock = null;
                }
            }, 250);
        }
    }
});

window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.007;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - lastY) * 0.007));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX;
        lastY = e.clientY;
    }
});

window.addEventListener('pointerup', () => { lookId = null; bBlock = null; });

// Seleção da Hotbar
document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = () => {
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        selectedBlock = s.dataset.block;
    };
});

// ─── 8. LOOP FINAL ───
function animate() {
    requestAnimationFrame(animate);
    updatePhysics();
    
    // Animação do braço andando
    if(input.f || input.b || input.l || input.r) {
        arm.position.y = -0.5 + Math.sin(Date.now() * 0.01) * 0.02;
    }

    renderer.render(scene, camera);
}

camera.position.set(0, 5, 5);
animate();
