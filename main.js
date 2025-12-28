// ─── OLHAR E INTERAÇÃO (TOUCH DINÂMICO) ─────────────────
let pitch = 0, yaw = 0, lookId = null, lastX = 0, lastY = 0;
let touchStartTime = 0;
let isLongPress = false;
let longPressTimeout;

window.addEventListener('pointerdown', e => {
    // Se o clique for no lado direito da tela
    if (e.clientX > window.innerWidth / 2 && lookId === null) {
        lookId = e.pointerId;
        lastX = e.clientX;
        lastY = e.clientY;
        
        touchStartTime = Date.now();
        isLongPress = false;

        // Inicia o timer para detectar o "Segurar" (500ms)
        longPressTimeout = setTimeout(() => {
            isLongPress = true;
            action(false); // QUEBRA o bloco (Long Press)
            // Feedback visual opcional: vibração se o celular permitir
            if(navigator.vibrate) navigator.vibrate(50); 
        }, 500);
    }
});

window.addEventListener('pointermove', e => {
    if (e.pointerId === lookId) {
        let deltaX = e.clientX - lastX;
        let deltaY = e.clientY - lastY;

        // Se o dedo se mover muito, cancela o "Colocar" para não confundir com o olhar
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            clearTimeout(longPressTimeout);
        }

        yaw -= deltaX * 0.005;
        pitch -= deltaY * 0.005;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
        
        lastX = e.clientX;
        lastY = e.clientY;
    }
});

window.addEventListener('pointerup', e => {
    if (e.pointerId === lookId) {
        clearTimeout(longPressTimeout); // Cancela o timer de quebrar
        
        let touchDuration = Date.now() - touchStartTime;

        // Se soltou rápido (menos de 300ms) e não era um movimento longo de câmera
        if (!isLongPress && touchDuration < 300) {
            action(true); // COLOCA o bloco (Click rápido)
        }

        lookId = null;
    }
});
