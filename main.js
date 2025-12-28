import * as THREE from 'three';

// ─── 1. CONFIGURAÇÃO DA CENA ───────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. ILUMINAÇÃO ─────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
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

// ─── 4. SELEÇÃO E BRAÇO ────────────────────────────────
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

// ─── 5. MUNDO (BLOCOS, ÁRVORES E NUVENS) ───────────────
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
            for(let ly=hBase+4; ly<=hBase+5; ly++) {
                if(lx === 0 && lz === 0 && ly === hBase+4) continue;
                addBlock(x+lx, ly, z+lz, 'leaf');
            }
        }
    }
}

const clouds = [];
for(let i=0; i<8; i++) {
    const cloud = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent:true, opacity:0.8 }));
    cloud.position.set(Math.random()*40-20, 15, Math.random()*40-20);
    scene.add(cloud);
    clouds.push(cloud);
}

// Gerar Terreno
for(let x=-10; x<10; x++) {
    for(let z=-10; z<10; z++) {
        const h = Math.floor(Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5);
        addBlock(x, h, z, 'grass');
        addBlock(x, h-1, z, 'dirt');
        if(Math.random() < 0.05) createTree(x, z);
    }
}

// ─── 6. CONTROLES E MOVIMENTO ──────────────────────────
const input = { f:0, b:0, l:0, r:0 };
let yaw = 0, pitch = 0, vy = 0, onGround = false;
let selected = 'none';

function setupControls() {
    const bind = (id, k) => {
        const el = document.getElementById(id);
        if(el) {
            el.onpointerdown = (e) => { e.preventDefault(); input[k] = 1; };
            el.onpointerup = () => input[k] = 0;
        }
    };
    bind('btn-up','f'); bind('btn-down','b'); bind('btn-left','l'); bind('btn-right','r');
    
    document.getElementById('btn-jump').onpointerdown = () => { if(onGround) vy = 0.22; };
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

// Olhar (Touch Lado Direito)
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

// ─── 7. LOOP DE ANIMAÇÃO ───────────────────────────────
function animate(time) {
    requestAnimationFrame(animate);
    
    // Nuvens
    clouds.forEach(c => { c.position.x += 0.01; if(c.position.x > 25) c.position.x = -25; });

    // Movimento
    const move = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    move.applyEuler(new THREE.Euler(0, yaw, 0));
    camera.position.addScaledVector(move, 0.12);

    // Gravidade
    vy -= 0.012; camera.position.y += vy;
    if(camera.position.y < 3) { camera.position.y = 3; vy = 0; onGround = true; }

    // Atualizar Seleção
    raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
    const hits = raycaster.intersectObjects(blocks);
    if(hits.length > 0 && hits[0].distance < 5) {
        selectionBox.visible = true;
        selectionBox.position.copy(hits[0].object.position);
    } else { selectionBox.visible = false; }

    renderer.render(scene, camera);
}

setupControls();
animate(0);
