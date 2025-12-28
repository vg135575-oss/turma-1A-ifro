import * as THREE from 'three';

// ─── 1. CENA E CONFIGURAÇÃO ───────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. SISTEMA DE TEXTURAS ───────────────────────────
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

// ─── 3. BRAÇO E EFEITOS VISUAIS ──────────────────────
const armPivot = new THREE.Group();
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
arm.position.set(0.6, -0.5, -0.7);
armPivot.add(arm);
camera.add(armPivot);
scene.add(camera);

const crackMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.01, 1.01, 1.01),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
);
scene.add(crackMesh);

// ─── 4. MUNDO, PARTÍCULAS E DROPS ────────────────────
const blocks = [];
const particles = [];
const droppedItems = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
const itemGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);

function addBlock(x, y, z, type) {
    if (type === 'none' || !mats[type]) return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    b.userData.type = type;
    scene.add(b);
    blocks.push(b);
}

function spawnParticles(pos, color) {
    for (let i = 0; i < 8; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: color }));
        p.position.copy(pos);
        p.userData = { 
            vel: new THREE.Vector3((Math.random()-0.5)*0.1, Math.random()*0.12, (Math.random()-0.5)*0.1),
            life: 1.0 
        };
        scene.add(p);
        particles.push(p);
    }
}

function spawnDrop(pos, type) {
    const item = new THREE.Mesh(itemGeo, type === 'grass' ? mats.grass : mats[type]);
    item.position.copy(pos);
    item.userData = { startY: pos.y, time: 0, type: type };
    scene.add(item);
    droppedItems.push(item);
}

for(let x = -8; x < 8; x++) {
    for(let z = -8; z < 8; z++) {
        addBlock(x, 0, z, 'grass');
    }
}

// ─── 5. AÇÕES (QUEBRAR / COLOCAR) ─────────────────────
const raycaster = new THREE.Raycaster();
let selected = 'stone';

function action(place) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);
    
    armPivot.rotation.x = -0.5; 
    setTimeout(() => armPivot.rotation.x = 0, 100);

    if (hits.length > 0 && hits[0].distance < 5) {
        const hit = hits[0];
        if (place) {
            const pos = hit.object.position.clone().add(hit.face.normal);
            addBlock(pos.x, pos.y, pos.z, selected);
        } else {
            const color = hit.object.material.color || 0x555555;
            spawnParticles(hit.object.position, color);
            spawnDrop(hit.object.position, hit.object.userData.type);
            
            scene.remove(hit.object);
            blocks.splice(blocks.indexOf(hit.object), 1);
            if(navigator.vibrate) navigator.vibrate(50);
        }
    }
}

// ─── 6. CONTROLES E PROTEÇÃO DE CLIQUE ────────────────
const input = { f: 0, b: 0, l: 0, r: 0 };
let pitch = 0, yaw = 0, lookId = null, lastX = 0, lastY = 0;
let touchTimer = null, isMovingDedo = false, touchStart = 0;
let breakingBlock = null, breakProgress = 0;

function bind(id, k) {
    const el = document.getElementById(id);
    if(el) {
        el.onpointerdown = e => { 
            e.stopPropagation(); e.preventDefault(); 
            input[k] = 1; 
        };
        el.onpointerup = el.onpointerleave = e => { 
            e.stopPropagation(); 
            input[k] = 0; 
        };
    }
}
bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r');

const jumpBtn = document.getElementById('btn-jump');
if(jumpBtn) {
    jumpBtn.onpointerdown = e => {
        e.stopPropagation(); e.preventDefault();
        if(onGround) vy = 0.22;
    };
}

// Bloquear cliques na Hotbar
document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = e => {
        e.stopPropagation();
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected'); selected = s.dataset.block;
    };
});

// Lógica de Toque no Cenário
window.addEventListener('pointerdown', e => {
    // PROTEÇÃO: Ignora se clicar em botões ou hotbar
    if (e.target.closest('.dbtn') || e.target.closest('.slot') || e.target.id === 'btn-jump') return;

    if (e.clientX > window.innerWidth / 2 && lookId === null) {
        lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
        touchStart = Date.now(); isMovingDedo = false;

        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = raycaster.intersectObjects(blocks);
        if (hits.length > 0 && hits[0].distance < 5) {
            breakingBlock = hits[0].object;
            breakProgress = 0;
            crackMesh.position.copy(breakingBlock.position);
            
            touchTimer = setInterval(() => {
                if(!isMovingDedo && breakingBlock) {
                    breakProgress += 50;
                    crackMesh.material.opacity = (breakProgress / 600) * 0.7;
                    armPivot.rotation.x = Math.sin(Date.now() * 0.02) * 0.2;
                    if (breakProgress >= 600) {
                        clearInterval(touchTimer);
                        action(false);
                        breakingBlock = null;
                        crackMesh.material.opacity = 0;
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
            isMovingDedo = true; 
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
        if (!isMovingDedo && (Date.now() - touchStart) < 300) {
            // Verifica novamente se não soltou em cima de um botão
            if (!e.target.closest('.dbtn') && !e.target.closest('.slot') && e.target.id !== 'btn-jump') {
                action(true);
            }
        }
        crackMesh.material.opacity = 0;
        breakingBlock = null;
        lookId = null;
    }
});

// ─── 7. FÍSICA E LOOP ANIMATE ────────────────────────
let vy = 0, onGround = false, walkTime = 0;

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
    
    const isWalking = input.f || input.b || input.l || input.r;
    const move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));
    
    if (!checkCollision(camera.position.x + move.x * 0.12, camera.position.y, camera.position.z)) camera.position.x += move.x * 0.12;
    if (!checkCollision(camera.position.x, camera.position.y, camera.position.z + move.z * 0.12)) camera.position.z += move.z * 0.12;

    if (isWalking && onGround) {
        walkTime += 0.15;
        camera.position.y += Math.sin(walkTime) * 0.02;
    }

    vy -= 0.015; camera.position.y += vy;
    let gh = -10;
    for (const b of blocks) {
        if (Math.abs(b.position.x - camera.position.x) < 0.6 && Math.abs(b.position.z - camera.position.z) < 0.6) {
            if (b.position.y < camera.position.y - 0.5) gh = Math.max(gh, b.position.y + 1.8);
        }
    }
    if (camera.position.y <= gh) { camera.position.y = gh; vy = 0; onGround = true; }
    else onGround = false;

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.vel.y -= 0.005;
        p.userData.life -= 0.02;
        p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    for (let i = droppedItems.length - 1; i >= 0; i--) {
        const item = droppedItems[i];
        item.userData.time += 0.05;
        item.position.y = item.userData.startY + Math.sin(item.userData.time) * 0.1 + 0.2;
        item.rotation.y += 0.02;
        if (camera.position.distanceTo(item.position) < 1.2) {
            scene.remove(item);
            droppedItems.splice(i, 1);
            if(navigator.vibrate) navigator.vibrate(10);
        }
    }

    renderer.render(scene, camera);
}
animate();

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
