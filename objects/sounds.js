function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function () {
        this.sound.play();
    }
    this.stop = function () {
        this.sound.pause();
    }
}

export const soundHit = new sound("./ping_pong_8bit_plop.wav");
export const soundShallow = new sound("./ping_pong_8bit_beeep.wav");
export const soundMiss = new sound("./ping_pong_8bit_peeeeeep.wav");
