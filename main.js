import * as THREE from 'three';

// --- 1. SETUP DO MOTOR ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Cor do céu
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });

const container = document.getElementById('game-container');
if (container) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
}

// --- 2. CARREGAMENTO DE TEXTURAS ---
const loader = new THREE.TextureLoader();
function loadT(f) {
    const t = loader.load(`./textures/${f}`, (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
    });
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

// --- 3. GERAÇÃO DO MUNDO ---
const blocks = [];
function addB(x, y, z, type) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(x, y, z);
    scene.add(b);
    blocks.push(b);
}

// Criar plataforma 20x20 com 3 camadas
for(let x=-10; x<=10; x++) {
    for(let z=-10; z<=10; z++) {
        addB(x, 0, z, 'grass');
        addB(x, -1, z, 'dirt');
        addB(x, -2, z, 'stone');
    }
}

// Árvores de Teste
function createTree(x, z) {
    for(let y=1; y<=3; y++) addB(x, y, z, 'wood');
    for(let lx=-1; lx<=1; lx++) {
        for(let lz=-1; lz<=1; lz++) {
            for(let ly=3; ly<=4; ly++) {
                if(!(lx === 0 && lz === 0 && ly === 3)) addB(x+lx, ly, z+lz, 'leaf');
            }
        }
    }
}
createTree(5, 5); createTree(-5, -7);

// --- 4. PERSONAGEM E RACHADURA ---
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.5, -0.6, -0.7);
camera.add(arm);
scene.add(camera);

const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({ transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
crackMesh.visible = false;
scene.add(crackMesh);

// --- 5. SISTEMA DE CONTROLES E TELA CHEIA ---
let input = { f:0, b:0, l:0, r:0, sneak: false };
let yaw = 0, pitch = 0, vY = 0, onG = false, selBlock = 'none';

// Botão de Tela Cheia
const fsBtn = document.getElementById('btn-fullscreen');
if(fsBtn) {
    fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        } else {
            document.exitFullscreen();
        }
    });
}

// Mapeamento de botões
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

// --- 6. FÍSICA E MOVIMENTO ---
function updatePhysics() {
    const speed = input.sneak ? 0.05 : 0.13;
    const h = input.sneak ? 1.4 : 1.7;
    let move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));

    let nx = camera.position.x + move.x * speed;
    let nz = camera.position.z + move.z * speed;

    if (input.sneak && onG) {
        let safe = false;
        for (let b of blocks) {
            if (Math.abs(nx - b.position.x) < 0.6 && Math.abs(nz - b.position.z) < 0.6 && Math.abs(camera.position.y - 1.4 - (b.position.y + 0.5)) < 0.2) {
                safe = true; break;
            }
        }
        if (!safe) { nx = camera.position.x; nz = camera.position.z; }
    }

    camera.position.x = nx; camera.position.z = nz;
    vY -= 0.01; camera.position.y += vY;
    onG = false;

    blocks.forEach(b => {
        if (Math.abs(camera.position.x - b.position.x) < 0.6 && Math.abs(camera.position.z - b.position.z) < 0.6) {
            if (camera.position.y - h < b.position.y + 0.5 && camera.position.y - h > b.position.y - 0.5) {
                camera.position.y = b.position.y + 0.5 + h;
                vY = 0; onG = true;
            }
        }
    });
}

// --- 7. TOQUE (GIRAR CÂMERA E CLICAR) ---
let lookId = null, lastX, lastY, bBlock = null, bProg = 0, tStart = 0, moved = false;

window.addEventListener('pointerdown', e => {
    if(e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY; moved = false;
    
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = ray.intersectObjects(blocks);
    if(hits.length > 0 && hits[0].distance < 4) { bBlock = hits[0].object; tStart = Date.now(); }
});

window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        if(Math.abs(e.clientX - lastX) > 5 || Math.abs(e.clientY - lastY) > 5) moved = true;
        yaw -= (e.clientX - lastX) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - lastY) * 0.005));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});

window.addEventListener('pointerup', e => {
    if (lookId === e.pointerId) {
        if (!moved && bBlock && Date.now() - tStart < 250 && selBlock !== 'none') {
            const ray = new THREE.Raycaster();
            ray.setFromCamera(new THREE.Vector2(0,0), camera);
            const hits = ray.intersectObjects(blocks);
            if(hits.length > 0) {
                const p = hits[0].object.position.clone().add(hits[0].face.normal);
                addB(p.x, p.y, p.z, selBlock);
            }
        }
        lookId = null; bBlock = null; bProg = 0; crackMesh.visible = false;
    }
});

// --- 8. LOOP FINAL ---
function animate() {
    requestAnimationFrame(animate);
    updatePhysics();

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
        s.classList.add('selected'); selBlock = s.dataset.block;
    };
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

camera.position.set(0, 5, 5);
animate();
