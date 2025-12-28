import * as THREE from 'three';

// --- 1. SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// --- 2. TEXTURAS ---
const textureLoader = new THREE.TextureLoader();
function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}`);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

const crackTextures = [];
for(let i=0; i<10; i++) crackTextures.push(loadTex(`crack_${i}.png`));

const mats = {
    grass: [loadTex('grass_side.png'), loadTex('grass_side.png'), loadTex('grass_top.png'), loadTex('dirt.png'), loadTex('grass_side.png'), loadTex('grass_side.png')].map(t => new THREE.MeshBasicMaterial({map: t})),
    dirt: new THREE.MeshBasicMaterial({ map: loadTex('dirt.png') }),
    stone: new THREE.MeshBasicMaterial({ map: loadTex('stone.png') }),
    wood: new THREE.MeshBasicMaterial({ map: loadTex('wood.png') }),
    leaf: new THREE.MeshBasicMaterial({ map: loadTex('leaf.png'), transparent: true, alphaTest: 0.5 })
};

const crackGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
const crackMat = new THREE.MeshBasicMaterial({ transparent: true, polygonOffset: true, polygonOffsetFactor: -1, depthWrite: false });
const crackMesh = new THREE.Mesh(crackGeo, crackMat);
crackMesh.visible = false;
scene.add(crackMesh);

// --- 3. JOGADOR ---
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.6), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.35, -0.4, -0.5);
camera.add(arm);
scene.add(camera);

const PLAYER_RADIUS = 0.3; 
const PLAYER_HEIGHT = 1.7;

// --- 4. MUNDO ---
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addBlock(x, y, z, type) {
    if (type === 'none') return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

for(let x = -8; x <= 8; x++) {
    for(let z = -8; z <= 8; z++) addBlock(x, 0, z, 'grass');
}

// --- 5. QUEBRA E INTERAÇÃO ---
let breakingBlock = null;
let breakProgress = 0;
const breakBar = document.getElementById('breaking-bar-container');
const breakProgressInner = document.getElementById('breaking-bar-progress');

function updateBreaking() {
    if (breakingBlock) {
        breakProgress += 1.5; 
        breakBar.style.display = 'block';
        breakProgressInner.style.width = breakProgress + '%';
        crackMesh.visible = true;
        crackMesh.position.copy(breakingBlock.position);
        let frame = Math.floor((breakProgress / 100) * 10);
        crackMat.map = crackTextures[Math.min(frame, 9)];
        crackMat.needsUpdate = true;
        arm.position.z = -0.5 + Math.sin(Date.now() * 0.02) * 0.1;
        if (breakProgress >= 100) {
            scene.remove(breakingBlock);
            blocks.splice(blocks.indexOf(breakingBlock), 1);
            stopBreaking();
        }
    } else {
        breakBar.style.display = 'none';
        crackMesh.visible = false;
        arm.position.z = -0.5;
    }
}
function stopBreaking() { breakingBlock = null; breakProgress = 0; }

// --- 6. FÍSICA ---
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;
let moveVel = new THREE.Vector3();

function checkCollision(nx, ny, nz) {
    const pMinX = nx - PLAYER_RADIUS, pMaxX = nx + PLAYER_RADIUS;
    const pMinZ = nz - PLAYER_RADIUS, pMaxZ = nz + PLAYER_RADIUS;
    const pMinY = ny - PLAYER_HEIGHT, pMaxY = ny;
    for (const b of blocks) {
        const bMinX = b.position.x-0.5, bMaxX = b.position.x+0.5;
        const bMinY = b.position.y-0.5, bMaxY = b.position.y+0.5;
        const bMinZ = b.position.z-0.5, bMaxZ = b.position.z+0.5;
        if (pMaxX > bMinX && pMinX < bMaxX && pMaxY > bMinY && pMinY < bMaxY && pMaxZ > bMinZ && pMinZ < bMaxZ) return b;
    }
    return null;
}

function animate() {
    requestAnimationFrame(animate);
    updateBreaking();
    const friction = 0.75;
    const dir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    dir.applyEuler(new THREE.Euler(0, yaw, 0));
    moveVel.x += dir.x * 0.02; moveVel.z += dir.z * 0.02;
    moveVel.x *= friction; moveVel.z *= friction;
    if (!checkCollision(camera.position.x + moveVel.x, camera.position.y, camera.position.z)) camera.position.x += moveVel.x;
    if (!checkCollision(camera.position.x, camera.position.y, camera.position.z + moveVel.z)) camera.position.z += moveVel.z;
    velocityY -= 0.012;
    camera.position.y += velocityY;
    const hit = checkCollision(camera.position.x, camera.position.y, camera.position.z);
    if (hit) {
        if (velocityY < 0) {
            camera.position.y = hit.position.y + 0.5 + (input.shift ? 1.3 : 1.7);
            onGround = true;
        } else {
            camera.position.y = hit.position.y - 0.5 - 0.01;
        }
        velocityY = 0;
    } else { onGround = false; }
    renderer.render(scene, camera);
}

// --- 7. CONTROLE TOUCH DIVIDIDO ---
let lookId = null, lastX = 0, lastY = 0, touchStart = 0;
let selectedBlock = 'none';

window.addEventListener('pointerdown', e => {
    if (e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    if (e.clientX > window.innerWidth / 2) { 
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0,0), camera);
        const hits = ray.intersectObjects(blocks);
        if (hits.length > 0 && hits[0].distance < 5) {
            breakingBlock = hits[0].object;
            touchStart = Date.now();
            setTimeout(() => {
                if (breakingBlock && Date.now() - touchStart < 200) {
                    if (selectedBlock !== 'none') {
                        const p = hits[0].object.position.clone().add(hits[0].face.normal);
                        if(!checkCollision(p.x, p.y + 0.5, p.z)) addBlock(p.x, p.y, p.z, selectedBlock);
                        stopBreaking();
                    }
                }
            }, 200);
        }
    } else { 
        lookId = e.pointerId;
        lastX = e.clientX; lastY = e.clientY;
    }
});

window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - lastY) * 0.005));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', e => { if (e.pointerId === lookId) lookId = null; stopBreaking(); });

// BOTÕES UI
function bindBtn(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    el.onpointerdown = (e) => {
        e.preventDefault(); e.stopPropagation();
        if(key === 'shift') { input.shift = !input.shift; el.classList.toggle('active', input.shift); }
        else input[key] = 1;
    };
    if(key !== 'shift') el.onpointerup = el.onpointerleave = () => input[key] = 0;
}
bindBtn('btn-up', 'f'); bindBtn('btn-down', 'b');
bindBtn('btn-left', 'l'); bindBtn('btn-right', 'r');
bindBtn('btn-shift', 'shift');
document.getElementById('btn-jump').onpointerdown = (e) => { e.preventDefault(); if(onGround) velocityY = 0.22; };
document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = () => {
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        selectedBlock = s.dataset.block;
    };
});

camera.position.set(0, 5, 5);
animate();
