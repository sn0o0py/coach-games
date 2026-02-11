// ============================================================
// QR Code Utility – Controller Join QR Code
// ============================================================

/**
 * Loads and displays a QR code for the controller join URL in a Phaser scene.
 * @param {Phaser.Scene} scene - The Phaser scene instance
 * @param {Object} options - Optional positioning and sizing options
 * @param {number} options.x - X position (default: calculated from right edge)
 * @param {number} options.y - Y position (default: 78% of screen height)
 * @param {number} options.desiredSize - Display size in pixels (default: 140)
 */
export function loadControllerQR(scene, options = {}) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const qrX = options.x !== undefined ? options.x : w - 100;
    const qrY = options.y !== undefined ? options.y : h * 0.78;
    const desiredSize = options.desiredSize !== undefined ? options.desiredSize : 140;

    fetch('/api/server-info')
        .then(r => r.json())
        .then(info => {
            // Scene may have changed while we were fetching
            if (!scene.scene.isActive()) return;

            const url = `http://${info.ip}:${info.port}/controller/`;

            // Generate QR using qrcode-generator
            const qr = qrcode(0, 'M');
            qr.addData(url);
            qr.make();

            // Render QR onto an offscreen canvas
            const cellSize = 4;
            const margin = 8;
            const moduleCount = qr.getModuleCount();
            const size = moduleCount * cellSize + margin * 2;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
            ctx.fillStyle = '#000000';
            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (qr.isDark(row, col)) {
                        ctx.fillRect(margin + col * cellSize, margin + row * cellSize, cellSize, cellSize);
                    }
                }
            }

            // Remove old texture if it exists (menu can be revisited)
            if (scene.textures.exists('qr_controller')) {
                scene.textures.remove('qr_controller');
            }
            scene.textures.addCanvas('qr_controller', canvas);

            // Position: bottom-right corner (or custom position)
            const qrSprite = scene.add.sprite(qrX, qrY, 'qr_controller')
                .setOrigin(0.5)
                .setScale(1);

            // Scale to desired display size
            qrSprite.setScale(desiredSize / size);

            // Label above QR
            scene.add.text(qrX, qrY - desiredSize / 2 - 16, 'Scan to join', {
                fontFamily: 'Arial', fontSize: '16px', color: '#aaaaaa',
                stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);

            // URL text below QR
            scene.add.text(qrX, qrY + desiredSize / 2 + 14, `${info.ip}:${info.port}`, {
                fontFamily: 'Arial', fontSize: '13px', color: '#666666',
                stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);
        })
        .catch(() => { /* server-info not available – skip QR */ });
}

