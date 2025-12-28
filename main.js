import * as THREE from 'three';

// 1. CENA E RENDERER
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('game-container').appendChild(renderer.domElement);

// 2. TEXTURAS (Pixel Art)
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
function loadTex(file) {
    const tex = textureLoader.load(`./textures/${file}`);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

const mats = {
    grass: [loadTex('grass_side.png'), loadTex('grass_side.png'), loadTex('grass_top.png'), loadTex('dirt.png'), loadTex('grass_side.png'), loadTex('grass_side.png')].map(t => new THREE.MeshBasicMaterial({map: t})),
    dirt: new THREE.MeshBasicMaterial({ map: loadTex('dirt.png') }),
    stone: new THREE.MeshBasicMaterial({ map: loadTex('stone.png') }),
    wood: new THREE.MeshBasicMaterial({ map: loadTex('wood.png') }),
    leaf: new THREE.MeshBasicMaterial({ map: loadTex('leaf.png'), transparent: true, alphaTest: 0.5 })
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

// Criar plataforma de teste com um buraco no meio
for(let x = -5; x <= 5; x++) {
    for(let z = -5; z <= 5; z++) {
        if (Math.abs(x) < 2 && Math.abs(z) < 2) continue; // Buraco para testar a borda
        addBlock(x, 0, z, 'grass');
    }
}

// 4. PLAYER E CONTROLES
const input = { f: 0, b: 0, l: 0, r: 0, shift: false };
let yaw = 0, pitch = 0, velocityY = 0, onGround = false;
camera.position.set(3, 3, 3);

// Função essencial: Checa se existe um bloco sólido em uma coordenada X, Z específica abaixo do player
function isBlockAt(x, z) {
    const playerY = camera.position.y - 1.6; // Nível dos pés
    for (const b of blocks) {
        // Verifica se a posição X,Z está dentro dos limites de algum bloco (0.5 de raio)
        if (Math.abs(b.position.x - x) < 0.5 && Math.abs(b.position.z - z) < 0.5) {
            // Verifica se o bloco está logo abaixo dos pés
            if (b.position.y < camera.position.y && b.position.y > playerY - 1) return true;
        }
    }
    return false;
}

// Setup dos botões (Toggle para Shift)
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

// 5. LOOP DE ANIMAÇÃO COM FÍSICA DE BORDA
function animate() {
    requestAnimationFrame(animate);

    const speed = input.shift ? 0.04 : 0.12;
    const direction = new THREE.Vector3(input.r - input.l, 0, input.b - input.f).normalize();
    direction.applyEuler(new THREE.Euler(0, yaw, 0));

    let moveX = direction.x * speed;
    let moveZ = direction.z * speed;

    let nextX = camera.position.x + moveX;
    let nextZ = camera.position.z + moveZ;

    // LÓGICA DE BORDA TIPO MINECRAFT
    if (input.shift && onGround) {
        // Tenta mover no X. Se não houver bloco sob a nova posição X, cancela X.
        if (!isBlockAt(nextX, camera.position.z)) {
            nextX = camera.position.x;
        }
        // Tenta mover no Z. Se não houver bloco sob a nova posição Z, cancela Z.
        if (!isBlockAt(camera.position.x, nextZ)) {
            nextZ = camera.position.z;
        }
    }

    camera.position.x = nextX;
    camera.position.z = nextZ;

    // Gravidade simples
    velocityY -= 0.01;
    camera.position.y += velocityY;

    // Colisão com chão
    onGround = false;
    let groundY = -10;
    for(const b of blocks) {
        if (Math.abs(b.position.x - camera.position.x) < 0.6 && Math.abs(b.position.z - camera.position.z) < 0.6) {
            const top = b.position.y + (input.shift ? 1.4 : 1.8);
            if (camera.position.y <= top && camera.position.y > b.position.y) {
                groundY = Math.max(groundY, top);
                onGround = true;
            }
        }
    }

    if (camera.position.y <= groundY) {
        camera.position.y = groundY;
        velocityY = 0;
    }

    renderer.render(scene, camera);
}

// Controle de visão (Mouse/Touch)
window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && e.clientX < window.innerWidth / 2) return;
    if (e.buttons > 0 || e.pointerType === 'touch') {
        yaw -= e.movementX * 0.005;
        pitch -= e.movementY * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
});

animate();
