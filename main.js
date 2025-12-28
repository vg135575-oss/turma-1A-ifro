import * as THREE from 'three';

// ─── 1. CONFIGURAÇÃO E CENA ───────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// ─── 2. ILUMINAÇÃO ───────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(10, 20, 10);
scene.add(sun);

// ─── 3. TEXTURAS E MATERIAIS ─────────────────────────
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

// ─── 4. SELECIONADOR (HIGHLIGHT) ─────────────────────
// Cria um cubo de linhas que mostra onde estamos a apontar
const selectionGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
const selectionMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
const selectionBox = new THREE.LineSegments(new THREE.EdgesGeometry(selectionGeo), selectionMat);
scene.add(selectionBox);

// ─── 5. NUVENS ───────────────────────────────────────
const clouds = [];
const cloudGeo = new THREE.BoxGeometry(5, 1, 8);
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

function spawnCloud() {
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    cloud.position.set(Math.random() * 100 - 50, 15, Math.random() * 100 - 50);
    scene.add(cloud);
    clouds.push(cloud);
}
for(let i=0; i<10; i++) spawnCloud();

// ─── 6. SISTEMA DE BLOCOS E ÁRVORES ──────────────────
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
    const yBase = Math.floor(Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5);
    for (let i = 1; i <= 4; i++) addBlock(x, yBase + i, z, 'wood'); // Tronco
    for (let lx = -2; lx <= 2; lx++) {
        for (let lz = -2; lz <= 2; lz++) {
            for (let ly = 4; ly <= 6; ly++) {
                if (Math.abs(lx) + Math.abs(lz) + Math.abs(ly-5) < 4) 
                    addBlock(x + lx, yBase + ly, z + lz, 'leaf');
            }
        }
    }
}

// Gerar Terreno e Árvores
for(let x = -10; x < 10; x++) {
    for(let z = -10; z < 10; z++) {
        const h = Math.floor(Math.sin(x * 0.3) * Math.cos(z * 0.3) * 1.5);
        addBlock(x, h, z, 'grass');
        addBlock(x, h - 1, z, 'dirt');
        if (Math.random() < 0.05 && x % 4 === 0) createTree(x, z);
    }
}

// ─── 7. INTERFACE E CONTROLES ────────────────────────
// (Mantém os teus binds de botões do HTML aqui...)
const input = { f: 0, b: 0, l: 0, r: 0 };
let yaw = 0, pitch = 0, vy = 0, onGround = false;

// Mira e Ações
const raycaster = new THREE.Raycaster();
let selectedBlockType = 'stone';

function updateSelection() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(blocks);
    if (hits.length > 0 && hits[0].distance < 6) {
        selectionBox.visible = true;
        selectionBox.position.copy(hits[0].object.position);
    } else {
        selectionBox.visible = false;
    }
}

// ─── 8. LOOP DE ANIMAÇÃO ─────────────────────────────
function animate(time) {
    requestAnimationFrame(animate);

    // Mover Nuvens
    clouds.forEach(c => {
        c.position.x += 0.01;
        if(c.position.x > 50) c.position.x = -50;
    });

    // Movimento do Jogador (Simplificado)
    const moveDir = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    moveDir.applyEuler(new THREE.Euler(0, yaw, 0));
    camera.position.addScaledVector(moveDir, 0.12);

    // Gravidade
    vy -= 0.012; camera.position.y += vy;
    if (camera.position.y < 3) { camera.position.y = 3; vy = 0; onGround = true; }

    updateSelection();
    renderer.render(scene, camera);
}
animate(0);

// Lembra-te de manter as funções de bind('btn-up', 'f'), etc, que já tinhas!
