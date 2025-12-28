import * as THREE from 'three';

// ─── SETUP ───
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── TEXTURAS ───
const loader = new THREE.TextureLoader();
function loadT(f) {
    const t = loader.load(`./textures/${f}`);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    return t;
}

const crackTexs = [];
for(let i=0; i<10; i++) crackTexs.push(loadT(`crack_${i}.png`));

const mats = {
    grass: [loadT('grass_side.png'), loadT('grass_side.png'), loadT('grass_top.png'), loadT('dirt.png'), loadT('grass_side.png'), loadT('grass_side.png')].map(t => new THREE.MeshBasicMaterial({map:t})),
    stone: new THREE.MeshBasicMaterial({map: loadT('stone.png')}),
    dirt: new THREE.MeshBasicMaterial({map: loadT('dirt.png')}),
    wood: new THREE.MeshBasicMaterial({map: loadT('wood.png')})
};

const crackMesh = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), new THREE.MeshBasicMaterial({transparent: true, polygonOffset: true, polygonOffsetFactor: -1}));
crackMesh.visible = false; scene.add(crackMesh);

// ─── MUNDO ───
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addB(x, y, z, type) {
    const m = mats[type] || mats.stone;
    const b = new THREE.Mesh(geo, m);
    b.position.set(x, y, z);
    scene.add(b); blocks.push(b);
}
for(let x=-8; x<8; x++) for(let z=-8; z<8; z++) addB(x, 0, z, 'grass');

// ─── CONTROLES ───
const input = { f:0, b:0, l:0, r:0, shift: false };
let yaw = 0, pitch = 0, vY = 0, onG = false, selected = 'none';

// Mapeamento dos botões
const bind = (id, k) => {
    const el = document.getElementById(id);
    el.onpointerdown = (e) => {
        e.preventDefault();
        if(k === 'shift') { 
            input.shift = !input.shift; 
            el.classList.toggle('active', input.shift);
        } else input[k] = 1;
    };
    el.onpointerup = () => { if(k !== 'shift') input[k] = 0; };
};
bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r'); bind('btn-shift','shift');
document.getElementById('btn-jump').onpointerdown = () => { if(onG) vY = 0.2; };

// ─── QUEBRA DE BLOCO ───
let bBlock = null, bProg = 0;
const bBar = document.getElementById('breaking-bar-container');
const bProgIn = document.getElementById('breaking-bar-progress');

function updateBreak() {
    if(bBlock) {
        bProg += 1.5;
        bBar.style.display = 'block';
        bProgIn.style.width = bProg + '%';
        crackMesh.visible = true; crackMesh.position.copy(bBlock.position);
        crackMesh.material.map = crackTexs[Math.min(Math.floor(bProg/10), 9)];
        if(bProg >= 100) {
            scene.remove(bBlock);
            blocks.splice(blocks.indexOf(bBlock),1);
            bBlock = null; bProg = 0;
        }
    } else { bBar.style.display = 'none'; crackMesh.visible = false; }
}

// ─── LOOP ───
function animate() {
    requestAnimationFrame(animate);
    updateBreak();

    let speed = input.shift ? 0.05 : 0.12;
    let move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));

    // Colisão simples
    let nextX = camera.position.x + move.x * speed;
    let nextZ = camera.position.z + move.z * speed;
    
    const check = (nx, nz) => {
        for(let b of blocks) {
            if(Math.abs(nx - b.position.x) < 0.7 && Math.abs(nz - b.position.z) < 0.7 && Math.abs((camera.position.y-0.8) - b.position.y) < 1) return true;
        }
        return false;
    };

    if(!check(nextX, camera.position.z)) camera.position.x = nextX;
    if(!check(camera.position.x, nextZ)) camera.position.z = nextZ;

    vY -= 0.01; camera.position.y += vY;
    onG = false;
    for(let b of blocks) {
        if(Math.abs(camera.position.x - b.position.x) < 0.6 && Math.abs(camera.position.z - b.position.z) < 0.6 && (camera.position.y - 1.7) < b.position.y + 0.5 && (camera.position.y - 1.7) > b.position.y - 0.5) {
            camera.position.y = b.position.y + 0.5 + 1.7;
            vY = 0; onG = true;
        }
    }
    renderer.render(scene, camera);
}

// --- TOUCH (OLHAR E AGIR) ---
let lookId = null, lastX, lastY, tStart;
window.addEventListener('pointerdown', e => {
    if(e.target.closest('.mc-btn') || e.target.closest('.slot')) return;
    if(e.clientX < window.innerWidth/2) { lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY; }
    else {
        const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0,0), camera);
        const hits = ray.intersectObjects(blocks);
        if(hits.length > 0 && hits[0].distance < 5) {
            bBlock = hits[0].object; tStart = Date.now();
            setTimeout(() => {
                if(bBlock && Date.now() - tStart < 200) {
                    if(selected !== 'none') {
                        const p = hits[0].object.position.clone().add(hits[0].face.normal);
                        addB(p.x, p.y, p.z, selected);
                    }
                    bBlock = null; bProg = 0;
                }
            }, 200);
        }
    }
});
window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch - (e.clientY - lastY) * 0.005));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', () => { lookId = null; bBlock = null; bProg = 0; });

document.querySelectorAll('.slot').forEach(s => {
    s.onpointerdown = () => {
        document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
        s.classList.add('selected');
        selected = s.dataset.block;
    };
});

camera.position.set(0, 5, 5);
animate();
