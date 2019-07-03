import {
    monoDB
} from '../db.js'
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
    leftKeyID,
    rightKeyID,
    enterKeyID,
    absolute,
    cube,
    GetVector,
    GetVectorV,
    isEmpty
} from '../logic/basics.js'
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
    pauseGame() {
        soundShallow.play() //Play shallow collision SFX (for lack of a dedicated SFX for game pausing)
        this.gamePaused = true;
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
    //Generic function to test for collision between a ball and a batton
    testCollision() {
        //If within batton angle AND on our outside inner boundary (collision)
        var battonLeft = this.batton.angle + 0.5 * this.batton.size;
        var battonRight = this.batton.angle - 0.5 * this.batton.size;

        if (battonLeft > Math.PI) { //If left of batton is over the pi-line
            var angleTest = (-Math.PI < this.ball.positionAngle && this.ball.positionAngle < battonLeft - 2 * Math.PI) || (battonRight < this.ball.positionAngle && this.ball.positionAngle < Math.PI)
        } else if (battonRight < -Math.PI) { //If right of batton is under the pi-line
            var angleTest = (-Math.PI < this.ball.positionAngle && this.ball.positionAngle < battonLeft) || (battonRight + 2 * Math.PI < this.ball.positionAngle && this.ball.positionAngle < Math.PI)
        } else { //If away from the pi-line
            var angleTest = battonRight < this.ball.positionAngle && this.ball.positionAngle < battonLeft;
        }

        var radiusTest = this.ball.positionRadius >= this.R - this.ball.size;

        if (!this.godMode) { //If not in god mode
            return (angleTest && radiusTest);
        } else { //If in god mode
            return radiusTest //Ignore angle test
        }
    }
    collisionHandler() {
        if (this.testCollision()) { //If ball has colided with batton, or godMode is on

            if ((this.hits + 1) % 10 == 0) { //If going up a level
                soundShallow.play() //Play shallow collision SFX
            } else {
                soundHit.play() //Play collision SFX
            }

            if ((absolute(Math.cos(this.ball.velocityAngle + this.ball.positionAngle))) > 0.5) { //For steep angles
                //Calculate new physical velocity angle, plus component due to batton movement, plus small random component
                console.log("Steep angle")
                this.ball.velocityAngle = Math.PI - this.ball.velocityAngle - 2 * this.ball.positionAngle - this.batton.direction * 0.3 * cube(absolute(Math.cos(this.ball.velocityAngle + this.ball.positionAngle))) + (Math.random() - 0.5) * 0.2 * Math.PI;
            } else { //For shallow angles
                console.log("Shallow angle")
                if (absolute(this.ball.positionAngle) > 0.6 * Math.PI) { //For left half
                    //Calculate new physical velocity angle, minus small random component opposing natural velocity (deflect away from edge)
                    this.ball.velocityAngle = Math.PI - this.ball.velocityAngle - 2 * this.ball.positionAngle - (this.ball.velocityAngle / absolute(this.ball.velocityAngle)) * (Math.random() * 0.5 * Math.PI + 0.3);
                } else { //For right half
                    //Calculate new physical velocity angle, plus small random component opposing natural velocity (deflect away from edge)
                    this.ball.velocityAngle = Math.PI - this.ball.velocityAngle - 2 * this.ball.positionAngle + (this.ball.velocityAngle / absolute(this.ball.velocityAngle)) * (Math.random() * 0.5 * Math.PI + 0.3);
                }

            } //For shallow angles

            console.log("Initial ball velocity: " + this.ball.velocity.vector())
            this.ball.velocity = GetVectorV(this.ball.velocityRadius, this.ball.velocityAngle); //Update velocity vector after collision, from magnitude and angle
            console.log("Final ball velocity: " + this.ball.velocity.vector())

            if (this.ball.positionRadius > this.R - this.ball.size) { //If position is greater than inner boundary
                this.ball.positionRadius = this.R - this.ball.size - this.ball.velocityRadius; //Set radius to within inner boundary (prevent getting stuck outside)
                this.ball.position = GetVector(this.ball.positionRadius, this.ball.positionAngle, this.x0, this.y0); //Set new position in x and y
            }

            this.hits += 1; //Add one hit on collision
        }
    }
    // Update all playarea objects as one step has passed
    update() {
        if (!this.gameStarted) { //If game hasn't started

            if (!this.gameOver) { //If not on gameovger screen, keep recalculating ball center position
                this.ball.position.x = this.x0; //Reset x
                this.ball.position.y = this.y0; //Reset y
            }

            if (!this.gameStartable && isEmpty(this.keysDown)) { //If game isn't startable, wait for all keys to be released then make startable
                this.gameStartable = true; //Make game startable once all keys have been let go of
            }

            if (this.gameStartable && (enterKeyID in this.keysDown || leftKeyID in this.keysDown || rightKeyID in this.keysDown)) { // If game is startable AND any key is pressed

                //Reset game
                this.ball.position.x = this.x0; //Reset x
                this.ball.position.y = this.y0; //Reset y

                this.hits = 0; //Reset score

                this.batton.angle = 0.5 * Math.PI; //Reset Batton

                //Start timer
                if (!this.startTimerActive) { // If startTimer hasn't already started
                    this.startGameTimer(3, 1000) //Start startTimer
                }
            }

        } else { // If game has started

            if (this.gameOver) { //If gameOver state is active
                this.gameOverHandler() // Run gameover function
            } else if (this.gamePaused) {
                if (this.gameStarted && (enterKeyID in this.keysDown || leftKeyID in this.keysDown || rightKeyID in this.keysDown)) { // If game has started AND any key is pressed 
                    if (!this.pauseTimerActive) {
                        console.log("STARTING UNPAUSE TIMER")
                        this.resumeGameTimer(3, 500) //Start startTimer
                    }
                }
            } else { //If not gameover, and not paused

                // DEATH MODE
                if (20 < this.level && this.level <= 30) { // If in stage 2
                    this.batton.size = deathPaddle(this.level - 20, 0.01, 0.1);
                }

                //BATTON MOTION
                this.batton.move();
                //BALL MOTION
                this.ball.move();
            }

            //Rescale position and velocity if canvas dimensions change
            this.ball.normaliseVelocity();
            this.ball.normalisePosition();
            /*
            I'll be real here, the velocity rescaling works a treat if the game is paused when the resizing happens,
            but for some reason, and I've no idea why, it doesn't work at all if you rescale while the game is active.
            As a hacky solution that superficially looks like a feature, the resizeCanvas function, which gets
            called any time the window is resized, also pauses the game automatically. This is genuinely useful on 
            mobile, as screen rotation pauses the game, but that's a side effect of debugging laziness.
            */

        }
    }
}