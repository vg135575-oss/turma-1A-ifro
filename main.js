import * as THREE from 'three';

// ─── 1. SETUP ───
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. TEXTURAS ───
const loader = new THREE.TextureLoader();
const crackTexs = [];
for(let i=0; i<10; i++) {
    const t = loader.load(`./textures/crack_${i}.png`);
    t.magFilter = THREE.NearestFilter;
    crackTexs.push(t);
}

const loadM = (img) => {
    const t = loader.load(`./textures/${img}`);
    t.magFilter = THREE.NearestFilter;
    return new THREE.MeshBasicMaterial({ map: t });
};

const mats = {
    grass: [loadM('grass_side.png'), loadM('grass_side.png'), loadM('grass_top.png'), loadM('dirt.png'), loadM('grass_side.png'), loadM('grass_side.png')],
    stone: loadM('stone.png'),
    dirt: loadM('dirt.png'),
    wood: loadM('wood.png')
};

// ─── 3. BRAÇO E RACHADURA ───
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.7), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.4, -0.5, -0.6);
camera.add(arm);
scene.add(camera);

const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), new THREE.MeshBasicMaterial({ transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
crackMesh.visible = false;
scene.add(crackMesh);

// ─── 4. MUNDO ───
const blocks = [];
for(let x=-8; x<8; x++) {
    for(let z=-8; z<8; z++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mats.grass);
        b.position.set(x, 0, z);
        scene.add(b);
        blocks.push(b);
    }
}

// ─── 5. ESTADO E CONTROLES ───
let input = { f:0, b:0, l:0, r:0, sneak: false };
let yaw = 0, pitch = 0, vY = 0, onG = false;
let selectedBlock = 'none';

// Mapeamento de botões
const bind = (id, key) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.onpointerdown = (e) => {
        e.preventDefault();
        if(key === 'sneak') {
            input.sneak = !input.sneak;
            el.classList.toggle('active', input.sneak);
        } else { input[key] = 1; }
    };
    el.onpointerup = () => { if(key !== 'sneak') input[key] = 0; };
};

bind('btn-up','f'); bind('btn-down','b'); 
bind('btn-left','l'); bind('btn-right','r'); 
bind('btn-shift','sneak');

document.getElementById('btn-jump').onpointerdown = () => { if(onG) vY = 0.2; };

// ─── 6. LÓGICA DE MOVIMENTO E SHIFT ───
function updatePlayer() {
    // Ajuste da altura do Shift (Agachar)
    const targetHeight = input.sneak ? 1.4 : 1.7;
    const currentHeight = 1.7; // Altura padrão

    let speed = input.sneak ? 0.05 : 0.12;
    let dir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    dir.applyEuler(new THREE.Euler(0, yaw, 0));

    camera.position.x += dir.x * speed;
    camera.position.z += dir.z * speed;

    vY -= 0.01;
    camera.position.y += vY;

    onG = false;
    for(let b of blocks) {
        if(Math.abs(camera.position.x - b.position.x) < 0.7 && Math.abs(camera.position.z - b.position.z) < 0.7) {
            if(camera.position.y - targetHeight < b.position.y + 0.5 && camera.position.y - targetHeight > b.position.y - 0.5) {
                camera.position.y = b.position.y + 0.5 + targetHeight;
                vY = 0;
                onG = true;
            }
        }
    }
}

// ─── 7. TOUCH (OLHAR EM TODA A TELA / QUEBRAR) ───
let lookId = null, lastX, lastY, bBlock = null, bProg = 0, tStart;
const bBar = document.getElementById('breaking-bar-container');
const bProgIn = document.getElementById('breaking-bar-progress');

window.addEventListener('pointerdown', e => {
    // Bloqueia se clicar na UI
    if(e.target.closest('.mc-btn') || e.target.closest('.slot')) return;

    // Se clicar no lado direito (Ação de bloco)
    if(e.clientX > window.innerWidth / 2) {
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0,0), camera);
        const hits = ray.intersectObjects(blocks);
        if(hits.length > 0 && hits[0].distance < 5) {
            bBlock = hits[0].object;
            tStart = Date.now();
            // Clique rápido coloca bloco
            setTimeout(() => {
                if(bBlock && (Date.now() - tStart < 200)) {
                    if(selectedBlock !== 'none') {
                        const p = hits[0].object.position.clone().add(hits[0].face.normal);
                        const nb = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), mats[selectedBlock] || mats.stone);
                        nb.position.copy(p);
                        scene.add(nb); blocks.push(nb);
                    }
                    bBlock = null;
                }
            }, 200);
        }
    }
    
    // Qualquer lugar da tela inicia o "Olhar" se não for interrompido
    lookId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.006;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - lastY) * 0.006));
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

// ─── 8. LOOP ───
function animate() {
    requestAnimationFrame(animate);
    updatePlayer();

    // Lógica da Barra e Rachadura
    if(bBlock) {
        bProg += 1.5;
        if(bBar) {
            bBar.style.display = 'block';
            bProgIn.style.width = bProg + '%';
        }
        crackMesh.visible = true;
        crackMesh.position.copy(bBlock.position);
        crackMesh.material.map = crackTexs[Math.min(Math.floor(bProg/10), 9)];
        arm.position.z = -0.6 + Math.sin(Date.now() * 0.02) * 0.05; // Soco
        
        if(bProg >= 100) {
            scene.remove(bBlock);
            blocks.splice(blocks.indexOf(bBlock), 1);
            bBlock = null; bProg = 0;
        }
    }

    renderer.render(scene, camera);
}

document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = () => {
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        selectedBlock = s.dataset.block;
    };
});

camera.position.set(0, 5, 5);
animate();
