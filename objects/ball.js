import { Vector } from './vector.js'
import { soundHit, soundShallow, soundMiss } from './sounds.js'

//Define ball as an object, reading position and velocity vectors
export class Ball {
    constructor(position, velocity, playarea) {
        this.playarea = playarea

        this.position = position || new Vector(x0, y0); //Set ball.position to given vector, or default to centre
        this.velocity = velocity || new Vector(0, 0); //Set ball.velocity to given vector, or default to zero
        this.positionNormalised = new Vector(this.position.x, this.position.y);
        this.normalisePosition();

        this.velocityNormalised = new Vector(this.velocity.x, this.velocity.y);
        this.normaliseVelocity();

        this.positionRadius = 0; //Initial position radius
        this.positionAngle = 0; //Initial position angle
        this.size = 0.032 * this.playarea.R; //Ball size radius
        this.velocityRadius = 0; //Initial velocity magnitude
        this.velocityAngle = 0; //Initial velocity angle
    }
    //Ball Move
    move() {
        this.positionRadius = this.position.getRadius(this.playarea.x0, this.playarea.y0); //Set radius calculated from position
        this.positionAngle = this.position.getAngle(this.playarea.x0, this.playarea.y0); //Set position angle calculated from position
        this.velocityRadius = this.velocity.getMagnitude(); //Set velocity magnitude calculated from velocity vector
        this.velocityAngle = this.velocity.getAnglev(); //Set velocity angle calculated from velocity vector
        //Update position
        if (this.bounds()) {
            this.position.x += this.playarea.speedScale * this.velocity.x;
            this.position.y += this.playarea.speedScale * this.velocity.y;
        }
        //Normalised positions for rescaling canvas
        this.positionNormalised.x = (this.position.x - this.playarea.x0) / this.playarea.R;
        this.positionNormalised.y = (this.position.y - this.playarea.y0) / this.playarea.R;
        //Normalised velocities for rescaling canvas
        this.velocityNormalised.x = (this.velocity.x) / this.playarea.R;
        this.velocityNormalised.y = (this.velocity.y) / this.playarea.R;
    }
    //Renormalise position accounting for changes in the canvas size
    normalisePosition() {
        this.position.x = this.playarea.R * this.positionNormalised.x + this.playarea.x0;
        this.position.y = this.playarea.R * this.positionNormalised.y + this.playarea.y0;
    }
    //Renormalise velocity accounting for changes in the canvas size
    normaliseVelocity() {
        this.velocity.x = this.playarea.R * this.velocityNormalised.x;
        this.velocity.y = this.playarea.R * this.velocityNormalised.y;
        this.velocityRadius = this.velocity.getMagnitude();
    }
    // OUT OF BOUNDS HANDLING (GAME OVER)
    bounds() {
        //If not within outer circle boundary
        if (this.positionRadius > this.playarea.R + (1.5 * this.playarea.speedScale * this.velocityRadius)) {
            soundMiss.play() //Play collision SFX
            if (this.playarea.gameStarted = true) {
                this.playarea.gameOver = true; //Flag gameOver
            }
            return false
        } else {
            return true
        }
    }
}
