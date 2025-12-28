import * as THREE from 'three';

// ─── 1. CENA ──────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Posição inicial segura
camera.position.set(0, 10, 5);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. ILUMINAÇÃO ────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

// ─── 3. TEXTURAS ──────────────────────────────────────
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

// ─── 4. OBJETOS DE AUXÍLIO ────────────────────────────
const selectionBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
    new THREE.LineBasicMaterial({ color: 0xffffff })
);
scene.add(selectionBox);

const armPivot = new THREE.Group();
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshStandardMaterial({ color: 0xffdbac }));
arm.position.set(0.6, -0.5, -0.7);
armPivot.add(arm);
camera.add(armPivot);
scene.add(camera);

// ─── 5. MUNDO E ÁRVORES ───────────────────────────────
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);

function addBlock(x, y, z, type) {
    if (type === 'none' || !mats[type]) return;
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

function createTree(x, z) {
    const hBase = Math.floor(Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5);
    for(let i=1; i<=4; i++) addBlock(x, hBase + i, z, 'wood');
    for(let lx=-1; lx<=1; lx++) {
        for(let lz=-1; lz<=1; lz++) {
            addBlock(x+lx, hBase+5, z+lz, 'leaf');
        }
    }
}

// Gerar Terreno
for(let x=-10; x<10; x++) {
    for(let z=-10; z<10; z++) {
        const h = Math.floor(Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5);
        addBlock(x, h, z, 'grass');
        addBlock(x, h-1, z, 'dirt');
        if(Math.random() < 0.04) createTree(x, z);
    }
}

// ─── 6. FÍSICA E COLISÃO ──────────────────────────────
function checkCollision(px, py, pz) {
    for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i].position;
        // Verifica se a câmera está dentro do volume do bloco (com margem de erro)
        if (Math.abs(px - b.x) < 0.7 && 
            Math.abs(pz - b.z) < 0.7 && 
            py >= b.y - 0.5 && py <= b.y + 1.8) {
            return true;
        }
    }
    return false;
}

// ─── 7. CONTROLES ─────────────────────────────────────
const input = { f:0, b:0, l:0, r:0 };
let yaw = 0, pitch = 0, vy = 0, onGround = false;
let selected = 'stone';

function setupControls() {
    const bind = (id, k) => {
        const el = document.getElementById(id);
        if(el) {
            el.onpointerdown = (e) => { e.preventDefault(); input[k] = 1; };
            el.onpointerup = () => input[k] = 0;
            el.onpointerleave = () => input[k] = 0;
        }
    };
    bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r');
    
    document.getElementById('btn-jump').onpointerdown = () => { if(onGround) vy = 0.2; };
    document.getElementById('btn-break').onpointerdown = () => action(false);
    document.getElementById('btn-place').onpointerdown = () => action(true);
    
    document.querySelectorAll('.slot').forEach(s => {
        s.onpointerdown = () => {
            document.querySelectorAll('.slot').forEach(x => x.classList.remove('selected'));
            s.classList.add('selected');
            selected = s.dataset.block;
        };
    });
}

// Olhar
let lookId = null, lastX = 0, lastY = 0;
window.addEventListener('pointerdown', e => {
    if(e.clientX > window.innerWidth/2) { lookId = e.pointerId; lastX = e.clientX; lastY = e.clientY; }
});
window.addEventListener('pointermove', e => {
    if(e.pointerId === lookId) {
        yaw -= (e.clientX - lastX) * 0.005;
        pitch -= (e.clientY - lastY) * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        lastX = e.clientX; lastY = e.clientY;
    }
});
window.addEventListener('pointerup', () => lookId = null);

const raycaster = new THREE.Raycaster();
function action(place) {
    raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = raycaster.intersectObjects(blocks);
    armPivot.rotation.x = -0.5; setTimeout(() => armPivot.rotation.x = 0, 100);
    if(hits.length > 0 && hits[0].distance < 5) {
        if(place && selected !== 'none') {
            const p = hits[0].object.position.clone().add(hits[0].face.normal);
            addBlock(p.x, p.y, p.z, selected);
        } else if(!place) {
            scene.remove(hits[0].object);
            blocks.splice(blocks.indexOf(hits[0].object), 1);
        }
    }
}

// ─── 8. LOOP PRINCIPAL ────────────────────────────────
function animate() {
    requestAnimationFrame(animate);

    // Movimento Horizontal
    const speed = 0.12;
    const move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));

    // Tenta mover no X
    const newX = camera.position.x + move.x * speed;
    if (!checkCollision(newX, camera.position.y, camera.position.z)) {
        camera.position.x = newX;
    }

    // Tenta mover no Z
    const newZ = camera.position.z + move.z * speed;
    if (!checkCollision(camera.position.x, camera.position.y, newZ)) {
        camera.position.z = newZ;
    }

    // Gravidade e Pulo
    vy -= 0.01;
    const newY = camera.position.y + vy;
    
    if (checkCollision(camera.position.x, newY, camera.position.z)) {
        if (vy < 0) onGround = true;
        vy = 0;
    } else {
        camera.position.y = newY;
        onGround = false;
    }

    // Fallback caso caia do mundo
    if (camera.position.y < -10) camera.position.set(0, 10, 0);

    // Seleção de blocos
    raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = raycaster.intersectObjects(blocks);
    if(hits.length > 0 && hits[0].distance < 5) {
        selectionBox.visible = true;
        selectionBox.position.copy(hits[0].object.position);
    } else { selectionBox.visible = false; }

    renderer.render(scene, camera);
}

setupControls();
animate();

window.onresize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};
