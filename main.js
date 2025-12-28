import * as THREE from 'three';

// --- 1. SETUP COM VERIFICAÇÃO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1);
const container = document.getElementById('game-container');

if (container) {
    container.appendChild(renderer.domElement);
} else {
    console.error("Erro: game-container não encontrado!");
}

// --- 2. CARREGAMENTO SEGURO DE TEXTURAS ---
const loader = new THREE.TextureLoader();
function loadT(f, fallbackColor) {
    return loader.load(`./textures/${f}`, 
        (tex) => { tex.magFilter = THREE.NearestFilter; }, 
        undefined, 
        () => { console.warn(`Erro ao carregar ${f}. Usando cor básica.`); }
    );
}

const mats = {
    grass: [
        new THREE.MeshBasicMaterial({ map: loadT('grass_side.png'), color: 0x7cfc00 }),
        new THREE.MeshBasicMaterial({ map: loadT('grass_side.png'), color: 0x7cfc00 }),
        new THREE.MeshBasicMaterial({ map: loadT('grass_top.png'), color: 0x7cfc00 }),
        new THREE.MeshBasicMaterial({ map: loadT('dirt.png'), color: 0x8b4513 }),
        new THREE.MeshBasicMaterial({ map: loadT('grass_side.png'), color: 0x7cfc00 }),
        new THREE.MeshBasicMaterial({ map: loadT('grass_side.png'), color: 0x7cfc00 })
    ],
    stone: new THREE.MeshBasicMaterial({ map: loadT('stone.png'), color: 0x888888 }),
    dirt: new THREE.MeshBasicMaterial({ map: loadT('dirt.png'), color: 0x8b4513 }),
    wood: new THREE.MeshBasicMaterial({ map: loadT('wood.png'), color: 0x5d4037 }),
    leaf: new THREE.MeshBasicMaterial({ map: loadT('leaf.png'), color: 0x228b22, transparent: true, alphaTest: 0.5 })
};

// --- 3. MUNDO E MOBS ---
const blocks = [];
function addB(x, y, z, type) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(x, y, z);
    scene.add(b);
    blocks.push(b);
}

// Gerar plataforma 10x10 para evitar lag inicial
for(let x=-5; x<=5; x++) {
    for(let z=-5; z<=5; z++) {
        addB(x, 0, z, 'grass');
        addB(x, -1, z, 'dirt');
        addB(x, -2, z, 'stone');
    }
}

// Classe Mob simples
class Mob {
    constructor(x, y, z, color) {
        this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), new THREE.MeshBasicMaterial({ color: color }));
        this.mesh.position.set(x, y, z);
        scene.add(this.mesh);
        this.vY = 0;
    }
    update() {
        this.vY -= 0.01;
        this.mesh.position.y += this.vY;
        if(this.mesh.position.y < 1.1) { this.mesh.position.y = 1.1; this.vY = 0; }
    }
}
const mobs = [new Mob(2, 2, 2, 0x00ff00)];

// --- 4. CONTROLOS ---
const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0xffdbac }));
arm.position.set(0.5, -0.6, -0.7);
camera.add(arm);
scene.add(camera);

let yaw = 0, pitch = 0;
let input = { f:0, b:0, l:0, r:0 };

// Lógica de Tela Cheia corrigida
const fsBtn = document.getElementById('btn-fullscreen');
if(fsBtn) {
    fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
        } else {
            document.exitFullscreen();
        }
    });
}

// --- 5. LOOP DE RENDERIZAÇÃO ---
function animate() {
    requestAnimationFrame(animate);
    
    // Movimento simples
    if(input.f) camera.position.z -= 0.1;
    if(input.b) camera.position.z += 0.1;

    mobs.forEach(m => m.update());
    renderer.render(scene, camera);
}

camera.position.set(0, 5, 5);
camera.lookAt(0, 0, 0);
animate();

console.log("Jogo iniciado!");
