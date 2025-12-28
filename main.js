import * as THREE from 'three';

// ─── 1. CONFIGURAÇÃO DA CENA ───────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. ILUMINAÇÃO ─────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

// ─── 3. CARREGADOR DE TEXTURAS ─────────────────────────
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

// ─── 4. BRAÇO DO JOGADOR ──────────────────────────────
const armPivot = new THREE.Group();
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
arm.position.set(0.6, -0.5, -0.7);
armPivot.add(arm);
camera.add(armPivot);
scene.add(camera);

// ─── 5. SISTEMA DE RACHADURA E SELEÇÃO ────────────────
const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
const crackMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
const crackMesh = new THREE.Mesh(crackGeo, crackMat);
scene.add(crackMesh);

// ─── 6. MUNDO ─────────────────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type) {
    if (type === 'none' || !mats[type]) return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

for(let x = -8; x < 8; x++) {
    for(let z = -8; z < 8; z++) {
        addBlock(x, 0, z, 'grass');
        addBlock(x, -1, z, 'dirt');
    }
}

// ─── 7. AÇÕES (QUEBRAR E COLOCAR) ─────────────────────
const raycaster = new THREE.Raycaster();
let selected = 'stone';

function action(place) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);
    
    // Animação de clique do braço
    armPivot.rotation.x = -0.5;
    setTimeout(() => armPivot.rotation.x = 0, 100);

    if (hits.length > 0 && hits[0].distance < 5) {
        const hit = hits[0];
        if (place) {
            const pos = hit.object.position.clone().add(hit.face.normal);
            addBlock(pos.x, pos.y, pos.z, selected);
        } else {
            scene.remove(hit.object);
            blocks.splice(blocks.indexOf(hit.object), 1);
            crackMesh.material.opacity = 0;
        }
    }
}

// ─── 8. CONTROLES E TOQUE DINÂMICO ────────────────────
const input = { f: 0, b: 0, l: 0, r: 0 };
let pitch = 0, yaw = 0, lookId = null, lastX = 0, lastY = 0;
let touchTimer = null, isMoving = false, touchStart = 0;
let breakingBlock = null, breakProgress = 0;
const breakDuration = 600; // Tempo para quebrar (ms)

function bind(id, k) {
    const el = document.getElementById(id);
    if(el) {
        el.onpointerdown = e => { e.preventDefault(); input[k] = 1; };
        el.onpointerup = el.onpointerleave = () => input[k] = 0;
    }
}
bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r');

let vy = 0, onGround = false;
document.getElementById('btn-jump').onpointerdown = e => {
    e.preventDefault(); if(onGround) { vy = 0.22; onGround = false; }
};

// Lógica do lado direito (Olhar, Quebrar, Colocar)
window.addEventListener('pointerdown', e => {
    if (e.clientX > window.innerWidth / 2 && lookId === null) {
        lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
        touchStart = Date.now(); isMoving = false;

        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = raycaster.intersectObjects(blocks);
        
        if (hits.length > 0 && hits[0].distance < 5) {
            breakingBlock = hits[0].object;
            breakProgress = 0;
            crackMesh.position.copy(breakingBlock.position);
            
            touchTimer = setInterval(() => {
                if(!isMoving && breakingBlock) {
                    breakProgress += 50;
                    crackMesh.material.opacity = (breakProgress / breakDuration) * 0.7;
                    armPivot.rotation.x = Math.sin(Date.now() * 0.02) * 0.2; // Braço balançando

                    if (breakProgress >= breakDuration) {
                        clearInterval(touchTimer);
                        action(false);
                        if(navigator.vibrate) navigator.vibrate(50);
                    }
                }
            }, 50);
        }
    }
});

window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { 
            isMoving = true; 
            clearInterval(touchTimer); 
            crackMesh.material.opacity = 0;
        }
        yaw -= dx * 0.005; pitch -= dy * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});

window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        clearInterval(touchTimer);
        if (!isMoving && (Date.now() - touchStart) < 300) action(true);
        crackMesh.material.opacity = 0;
        breakingBlock = null;
        lookId = null;
    }
});

document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = () => {
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected'); selected = s.dataset.block;
    };
});

// ─── 9. FÍSICA E LOOP ─────────────────────────────────
function checkCollision(x, y, z) {
    for (const b of blocks) {
        if (Math.abs(b.position.x - x) < 0.7 && Math.abs(b.position.z - z) < 0.7 &&
            Math.abs(b.position.y - (y - 1.2)) < 0.4) return true;
    }
    return false;
}

camera.position.set(0, 5, 5);

function animate() {
    requestAnimationFrame(animate);
    const speed = 0.12;
    const move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));
    
    if (!checkCollision(camera.position.x + move.x * speed, camera.position.y, camera.position.z)) camera.position.x += move.x * speed;
    if (!checkCollision(camera.position.x, camera.position.y, camera.position.z + move.z * speed)) camera.position.z += move.z * speed;

    vy -= 0.015; camera.position.y += vy;
    let gh = -10;
    for (const b of blocks) {
        if (Math.abs(b.position.x - camera.position.x) < 0.6 && Math.abs(b.position.z - camera.position.z) < 0.6) {
            if (b.position.y < camera.position.y - 0.5) gh = Math.max(gh, b.position.y + 1.8);
        }
    }
    if (camera.position.y <= gh) { camera.position.y = gh; vy = 0; onGround = true; }
    else onGround = false;

    renderer.render(scene, camera);
}
animate();

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
