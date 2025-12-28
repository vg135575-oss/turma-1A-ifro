import * as THREE from 'three';

// --- 1. SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('game-container').appendChild(renderer.domElement);

// --- 2. TEXTURAS ---
const loader = new THREE.TextureLoader();
function loadT(f) {
    const t = loader.load(`./textures/${f}`);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return t;
}

// Carregar frames de rachadura
const crackTexs = [];
for(let i=0; i<10; i++) crackTexs.push(loadT(`crack_${i}.png`));

const mats = {
    grass: [loadT('grass_side.png'), loadT('grass_side.png'), loadT('grass_top.png'), loadT('dirt.png'), loadT('grass_side.png'), loadT('grass_side.png')].map(m => new THREE.MeshBasicMaterial({map: m})),
    stone: new THREE.MeshBasicMaterial({ map: loadT('stone.png') }),
    dirt: new THREE.MeshBasicMaterial({ map: loadT('dirt.png') }),
    wood: new THREE.MeshBasicMaterial({ map: loadT('wood.png') }),
    leaf: new THREE.MeshBasicMaterial({ map: loadT('leaf.png'), transparent: true, alphaTest: 0.5 })
};

// Mesh invisível da rachadura que aparece sobre o bloco
const crackMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.01, 1.01, 1.01),
    new THREE.MeshBasicMaterial({ transparent: true, polygonOffset: true, polygonOffsetFactor: -1, depthWrite: false })
);
crackMesh.visible = false;
scene.add(crackMesh);

// --- 3. JOGADOR E BRAÇO ---
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.5, -0.6, -0.7);
camera.add(arm);
scene.add(camera);

// --- 4. MUNDO ---
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addB(x, y, z, type) {
    if(type === 'none') return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(x, y, z);
    scene.add(b);
    blocks.push(b);
}

// Criar o cenário da sua foto
for(let x=-5; x<5; x++) for(let z=-5; z<5; z++) addB(x, 0, z, 'grass');
addB(0, 1, 0, 'stone');
addB(0, 2, 0, 'wood');
addB(0, 3, 0, 'dirt');
addB(0, 4, 0, 'grass');

// --- 5. CONTROLES ---
let input = { f:0, b:0, l:0, r:0, sneak: false };
let yaw = 0, pitch = 0, vY = 0, onG = false;
let selBlock = 'none';

const bind = (id, k) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.onpointerdown = (e) => { 
        e.preventDefault(); 
        if(k === 'sneak') { input.sneak = !input.sneak; el.classList.toggle('active'); }
        else input[k] = 1; 
    };
    el.onpointerup = () => { if(k !== 'sneak') input[k] = 0; };
};
bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r'); bind('btn-shift','sneak');
document.getElementById('btn-jump').onpointerdown = () => { if(onG) vY = 0.22; };

// --- 6. TOQUE (VISÃO E QUEBRA) ---
let lookId = null, lastX, lastY, bBlock = null, bProg = 0, tStart;
const bBar = document.getElementById('breaking-bar-container');
const bProgIn = document.getElementById('breaking-bar-progress');

window.addEventListener('pointerdown', e => {
    if(e.target.closest('.mc-btn') || e.target.closest('.slot')) return;

    // Gerenciar Visão (Esquerda ou Direita agora funcionam para girar)
    lookId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;

    // Lógica de Quebra/Colocação (Raycast)
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = ray.intersectObjects(blocks);

    if(hits.length > 0 && hits[0].distance < 4) {
        bBlock = hits[0].object;
        tStart = Date.now();
        
        // Se soltar rápido (<200ms), coloca bloco. Se segurar, quebra.
        setTimeout(() => {
            if(bBlock && (Date.now() - tStart < 200)) {
                if(selBlock !== 'none') {
                    const p = hits[0].object.position.clone().add(hits[0].face.normal);
                    addB(p.x, p.y, p.z, selBlock);
                }
                bBlock = null;
            }
        }, 200);
    }
});

window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - lastY) * 0.005));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX;
        lastY = e.clientY;
    }
});

window.addEventListener('pointerup', () => { 
    lookId = null; bBlock = null; bProg = 0; 
    if(bBar) bBar.style.display = 'none';
    crackMesh.visible = false;
});

// --- 7. LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Movimento e Gravidade
    const speed = input.sneak ? 0.05 : 0.12;
    const h = input.sneak ? 1.4 : 1.7;
    let move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));
    camera.position.x += move.x * speed;
    camera.position.z += move.z * speed;

    vY -= 0.01; camera.position.y += vY;
    onG = false;
    blocks.forEach(b => {
        if(Math.abs(camera.position.x - b.position.x) < 0.6 && Math.abs(camera.position.z - b.position.z) < 0.6) {
            if(camera.position.y - h < b.position.y + 0.5 && camera.position.y - h > b.position.y - 0.5) {
                camera.position.y = b.position.y + 0.5 + h;
                vY = 0; onG = true;
            }
        }
    });

    // Animação de Quebra e Rachaduras
    if(bBlock && Date.now() - tStart > 200) {
        bProg += 1.5;
        if(bBar) { bBar.style.display = 'block'; bProgIn.style.width = bProg + '%'; }
        
        crackMesh.visible = true;
        crackMesh.position.copy(bBlock.position);
        
        // Troca a textura da rachadura conforme o progresso
        let frame = Math.floor((bProg / 100) * 10);
        crackMesh.material.map = crackTexs[Math.min(frame, 9)];
        crackMesh.material.needsUpdate = true;

        // Animação do braço batendo
        arm.position.z = -0.7 + Math.sin(Date.now() * 0.02) * 0.1;

        if(bProg >= 100) {
            scene.remove(bBlock);
            blocks.splice(blocks.indexOf(bBlock), 1);
            bBlock = null; bProg = 0;
        }
    } else {
        arm.position.z = -0.7;
    }

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
