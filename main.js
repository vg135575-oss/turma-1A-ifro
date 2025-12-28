import * as THREE from 'three';

// --- 1. SETUP OTIMIZADO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500); // Reduzi o campo de visão (Far) para diminuir lag
const renderer = new THREE.WebGLRenderer({ 
    antialias: false, // Desativar antialias aumenta muito o FPS no celular
    powerPreference: "high-performance" 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1); // Forçar 1 em vez de window.devicePixelRatio economiza GPU
document.getElementById('game-container').appendChild(renderer.domElement);

// --- 2. TEXTURAS ---
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

// --- 3. CLASSE MOB (Zumbi/Animal) ---
class Mob {
    constructor(x, y, z, color, isHostile = false) {
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 1.2, 0.7), 
            new THREE.MeshBasicMaterial({ color: color })
        );
        this.mesh.position.set(x, y, z);
        scene.add(this.mesh);
        this.vY = 0;
        this.dir = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        this.timer = 0;
        this.isHostile = isHostile;
    }

    update(blocks, playerPos) {
        this.timer++;
        if(this.timer > 120) {
            if(this.isHostile && this.mesh.position.distanceTo(playerPos) < 10) {
                // Persegue o jogador
                this.dir.subVectors(playerPos, this.mesh.position).normalize();
            } else {
                this.dir.set(Math.random()-0.5, 0, Math.random()-0.5).normalize();
            }
            this.timer = 0;
        }

        const speed = this.isHostile ? 0.04 : 0.02;
        this.mesh.position.x += this.dir.x * speed;
        this.mesh.position.z += this.dir.z * speed;

        this.vY -= 0.01;
        this.mesh.position.y += this.vY;

        // Colisão simples do Mob com o chão
        if(this.mesh.position.y < 1.1) {
            this.mesh.position.y = 1.1;
            this.vY = 0;
            if(Math.random() < 0.01) this.vY = 0.15; // Pulo aleatório
        }
        this.mesh.lookAt(this.mesh.position.clone().add(this.dir));
    }
}

const mobs = [];

// --- 4. MUNDO ---
const blocks = [];
function addB(x, y, z, type) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), type === 'grass' ? mats.grass : mats[type]);
    b.position.set(x, y, z);
    scene.add(b);
    blocks.push(b);
}

// Chão Otimizado (Plataforma 15x15)
for(let x=-7; x<=7; x++) {
    for(let z=-7; z<=7; z++) {
        addB(x, 0, z, 'grass');
        addB(x, -1, z, 'dirt');
        addB(x, -2, z, 'stone');
    }
}

// Adicionar Mobs de teste
mobs.push(new Mob(3, 2, 3, 0x00ff00, true)); // Zumbi Verde
mobs.push(new Mob(-3, 2, -3, 0xffcccc, false)); // Porco Rosa

// --- 5. JOGADOR ---
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.5, -0.6, -0.7);
camera.add(arm);
scene.add(camera);

const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({ transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
crackMesh.visible = false;
scene.add(crackMesh);

// --- 6. CONTROLES ---
let input = { f:0, b:0, l:0, r:0, sneak: false };
let yaw = 0, pitch = 0, vY = 0, onG = false, selBlock = 'none';

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

// --- 7. FÍSICA E LOOP ---
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

// --- INTERAÇÃO ---
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
        lookId = null; bBlock = null; bProg = 0;
        crackMesh.visible = false;
    }
});

function animate() {
    requestAnimationFrame(animate);
    updatePhysics();
    
    // Mobs
    mobs.forEach(m => m.update(blocks, camera.position));

    // Quebra
    if(!moved && bBlock && Date.now() - tStart > 250) {
        bProg += 2.5;
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
