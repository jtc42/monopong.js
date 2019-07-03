import {
    Ball
} from './ball.js'
import {
    Batton
} from './batton.js'
import {
    Vector
} from './vector.js'

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

        this.godMode = false; //Never lose god mode

        this.keysDown = {}

        // Game objects attached to playarea
        // TODO: Generalise to an array? Maybe just multiple battons and some non-mono ball logic?
        this.batton = new Batton(this.R, 0.5 * Math.PI, this);
        this.ball = new Ball(new Vector(this.x0, this.y0), new Vector(0, 0), this)
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
            monoDB.updateScore("01", this.hits, function () { //Update score stored in position "01" (high score)
                refreshScores()
            })
        }
        console.log("Stored score saved")
    }
    startgame() {
        this.ball.velocity = new Vector(0.0, -0.024 * this.R); //Give ball an initial velocity
        this.gameStarted = true; //Set game as started
        this.gameOver = false; //Clear gameOver flag
    }
}