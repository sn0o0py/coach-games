// ============================================================
// Virtual Gamepad (mimics Phaser Gamepad interface)
// ============================================================

class VirtualPad {
    constructor(slotIndex) {
        this.index = slotIndex;
        this.connected = true;
        this._axes = [0, 0, 0, 0];
        this.axes = [
            { getValue: () => this._axes[0] },
            { getValue: () => this._axes[1] },
            { getValue: () => this._axes[2] },
            { getValue: () => this._axes[3] }
        ];
        this.buttons = [];
        for (let i = 0; i < 17; i++) {
            this.buttons.push({ pressed: false, value: 0 });
        }
    }

    updateState(axes, buttons) {
        if (axes) {
            for (let i = 0; i < 4; i++) this._axes[i] = axes[i] || 0;
        }
        if (buttons) {
            for (let i = 0; i < 17; i++) {
                const pressed = buttons[i] ? true : false;
                this.buttons[i].pressed = pressed;
                this.buttons[i].value = pressed ? 1 : 0;
            }
        }
    }
}
