import {
    Ball
} from './ball.js'
import {
    Batton
} from './batton.js'
import {
    Vector
} from './vector.js'
import {
    soundHit,
    soundShallow,
    soundMiss
} from './sounds.js'
import {
    refreshScores
} from '../logic/scores.js'

export class PlayArea {
    constructor(viewWidth, viewHeight) {
        this.calculateDims(viewWidth, viewHeight)

        this.speedScale = 1; //Animation scalar

        this.gameStartable = true; //Can the game be started? (After gameOver, all keys must be released for this to be 1)
        this.gameStarted = false; //Game active
        this.gameOver = false; //Has gameOver occured
        this.gamePaused = false; //Game is paused

        this.hits = 0; //Hit count
        this.level = 0; //Iterates every 10 hits
        this.topScore = 0; //High score

        this.timerValue = 0; // Value of any countdown timer
        this.startTimerActive = false;
        this.pauseTimerActive = false;

        this.godMode = false; //Never lose god mode

        this.keysDown = {}

        // Game objects attached to playarea
        // TODO: Generalise to an array? Maybe just multiple battons and some non-mono ball logic?
        this.batton = new Batton(this.R, 0.5 * Math.PI, this);
        this.ball = new Ball(new Vector(this.x0, this.y0), new Vector(0, 0), this)

        // Update scores
        monoDB.open(() => refreshScores(this));
    }
    calculateDims(viewWidth, viewHeight) {
        this.smallerDim = Math.min(viewWidth, viewHeight);
        this.R = this.smallerDim / 2.3; //Circle Radius
        this.x0 = 0.5 * viewWidth; //Centre x
        this.y0 = 0.5 * viewHeight; //Centre y
    }
    gameOverHandler() {
        //Stop ball motion
        this.ball.velocity.x = 0; //Reset vx
        this.ball.velocity.y = 0; //Reset vy

        //Clear keys down
        this.keysDown = {};

        //Clear flags
        this.gameStarted = false; //Stop game
        this.gameStartable = false; //Lock game out of starting

        console.log("Updating stored scores")
        if (this.hits > this.topScore) { //If score beats current best
            monoDB.updateScore("01", this.hits, () => refreshScores(this))
        }
        console.log("Stored score saved")
    }
    startGame() {
        this.ball.velocity = new Vector(0.0, -0.024 * this.R); //Give ball an initial velocity
        this.gameStarted = true; //Set game as started
        this.gameOver = false; //Clear gameOver flag
    }
    startGameTimer(delay, step) {
        this.timerValue = delay;
        soundHit.play() //Play collision SFX

        console.log("STARTING TIMER")
        this.startTimerActive = true; //Flag startTimer as started

        var startTimer = setInterval(() => {
            this.timerValue--;
            if (this.timerValue <= 0) { //If at zero
                this.startTimerActive = false; //Stop startTimer
                soundMiss.play() //Play shallow collision SFX (for lack of a dedicated SFX for game starting)

                this.startGame()
                console.log("PLAY")
                clearInterval(startTimer);
            } else { //If not zero
                console.log(this.timerValue)
                soundHit.play() //Play collision SFX
            }
        }, step);
    }
    resumeGameTimer(delay, step) {
        this.timerValue = delay;
        soundHit.play() //Play collision SFX

        console.log("STARTING UNPAUSE TIMER")
        this.pauseTimerActive = true; //Flag startTimer as started

        var pauseTimer = setInterval(() => {
            this.timerValue--;
            if (this.timerValue <= 0) { //If at zero
                this.pauseTimerActive = false; //Stop pauseTimer
                soundMiss.play() //Play shallow collision SFX (for lack of a dedicated SFX for game starting)

                this.gamePaused = false; //Unpause
                console.log("PLAY")
                clearInterval(pauseTimer);
            } else { //If not zero
                console.log(this.timerValue)
                soundHit.play() //Play collision SFX
            }
        }, step);
    }
}