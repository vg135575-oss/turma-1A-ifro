import * as THREE from 'three';

// 1. CONFIGURAÇÃO BÁSICA
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// 2. TEXTURAS
const textureLoader = new THREE.TextureLoader();
function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}`);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

const mats = {
    grass: [loadTex('grass_side.png'), loadTex('grass_side.png'), loadTex('grass_top.png'), loadTex('dirt.png'), loadTex('grass_side.png'), loadTex('grass_side.png')].map(t => new THREE.MeshBasicMaterial({map: t})),
    dirt: new THREE.MeshBasicMaterial({ map: loadTex('dirt.png') }),
    stone: new THREE.MeshBasicMaterial({ map: loadTex('stone.png') })
};

// 3. MUNDO
const blocks = [];
const geo = new THREE.BoxGeometry(1, 1, 1);
function addBlock(x, y, z, type) {
    const b = new THREE.Mesh(geo, type === 'grass' ? mats.grass : mats[type]);
    b.position.set(Math.round(x), Math.round(y), Math.round(z));
    scene.add(b);
    blocks.push(b);
}

// Criar plataforma de teste
for(let x = -3; x <= 3; x++) {
    for(let z = -3; z <= 3; z++) {
        addBlock(x, 0, z, 'grass');
    }
}

// 4. CONTROLES
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;
camera.position.set(0, 3, 0);

function bindBtn(id, key) {
    const el = document.getElementById(id);
    if(!el) return;
    if(key === 'shift') {
        el.onpointerdown = e => {
            e.stopPropagation();
            input.shift = !input.shift;
            el.classList.toggle('active', input.shift);
        };
    } else {
        el.onpointerdown = () => input[key] = 1;
        el.onpointerup = el.onpointerleave = () => input[key] = 0;
    }
}
bindBtn('btn-up', 'f'); bindBtn('btn-down', 'b');
bindBtn('btn-left', 'l'); bindBtn('btn-right', 'r');
bindBtn('btn-shift', 'shift');
document.getElementById('btn-jump').onpointerdown = () => { if(onGround) velocityY = 0.2; };

// 5. LÓGICA DE COLISÃO MELHORADA
const PLAYER_RADIUS = 0.3; // Largura do jogador

function isFloorAt(x, z) {
    const footY = camera.position.y - (input.shift ? 1.4 : 1.8);
    for (const b of blocks) {
        // Checa se o ponto (x, z) está dentro do quadrado do bloco (que vai de -0.5 a +0.5 do centro)
        if (x >= b.position.x - 0.5 && x <= b.position.x + 0.5 &&
            z >= b.position.z - 0.5 && z <= b.position.z + 0.5) {
            // Checa se o bloco está logo abaixo
            if (b.position.y < camera.position.y && b.position.y > footY - 0.5) return true;
        }
    }
    return false;
}

// Checa se o corpo do jogador caberia nessa posição (considerando sua largura)
function canStandAt(x, z) {
    // Para o Sneak, checamos se os 4 cantos da base do jogador ainda têm chão
    const points = [
        {x: x - PLAYER_RADIUS, z: z - PLAYER_RADIUS},
        {x: x + PLAYER_RADIUS, z: z - PLAYER_RADIUS},
        {x: x - PLAYER_RADIUS, z: z + PLAYER_RADIUS},
        {x: x + PLAYER_RADIUS, z: z + PLAYER_RADIUS}
    ];
    
    // Se QUALQUER um dos cantos do pé sair do bloco, o Sneak deve travar
    for(let p of points) {
        if (!isFloorAt(p.x, p.z)) return false;
    }
    return true;
}

// 6. LOOP DE ANIMAÇÃO
function animate() {
    requestAnimationFrame(animate);

    const speed = input.shift ? 0.05 : 0.12;
    const direction = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    direction.applyEuler(new THREE.Euler(0, yaw, 0));

    let nextX = camera.position.x + direction.x * speed;
    let nextZ = camera.position.z + direction.z * speed;

    if (input.shift && onGround) {
        // Tenta mover no X: se o novo X fizer um dos cantos do pé ficar sem chão, cancela X.
        if (!canStandAt(nextX, camera.position.z)) {
            nextX = camera.position.x;
        }
        // Tenta mover no Z: se o novo Z fizer um dos cantos do pé ficar sem chão, cancela Z.
        if (!canStandAt(camera.position.x, nextZ)) {
            nextZ = camera.position.z;
        }
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;

    // Gravidade e Colisão simples com chão
    velocityY -= 0.01;
    camera.position.y += velocityY;

    onGround = false;
    let targetHeight = input.shift ? 1.4 : 1.8;
    
    for(const b of blocks) {
        if (Math.abs(b.position.x - camera.position.x) < 0.7 && Math.abs(b.position.z - camera.position.z) < 0.7) {
            let topY = b.position.y + 0.5 + targetHeight;
            if (camera.position.y <= topY && camera.position.y > b.position.y) {
                camera.position.y = topY;
                velocityY = 0;
                onGround = true;
            }
        }
    }

    renderer.render(scene, camera);
}

// Rotação da câmera
window.addEventListener('pointermove', (e) => {
    if (e.buttons > 0 || e.pointerType === 'touch') {
        yaw -= e.movementX * 0.005;
        pitch -= e.movementY * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
});

animate();
