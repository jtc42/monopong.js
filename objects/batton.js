import {
    Vector
} from './vector.js'
import {
    keyClass
} from '../logic/keyboard.js'
import * as basics from '../logic/basics.js'

//Define batton as an object, reading radius and angle
export class Batton {
    constructor(r, t, playarea) {
        this.playarea = playarea
        this.position = new Vector(basics.GetX(r, t, this.playarea.x0), basics.GetY(r, t, this.playarea.y0)); //Calculate position from radius and angle
        
        this.ri = r;
        this.ti = t;
        this.radius = r; //Add radius as a function of a batton object
        this.angle = t; //Add angle as a function of a batton object

        this.direction = 0; //Initial angular velocity
        this.lastKey = 0;
        this.size = 0.2 * Math.PI;

        this.left = keyClass("ArrowLeft");
        this.right = keyClass("ArrowRight");

        this.left.press = () => {
            this.direction = 1;
        };
        this.right.press = () => {
            this.direction = -1;
        }
        this.left.release = () => {
            if (!this.right.isDown) {
                this.direction = 0;
            } else {
                this.direction = -1
            }
        };
        this.right.release = () => {
            if (!this.left.isDown) {
                this.direction = 0;
            } else {
                this.direction = 1
            }
        };
    }
    //Batton Move
    move() {
        this.angle += this.direction * this.playarea.speedScale * 0.02 * Math.PI; //Add angular velocity to angle
        //Fold the user-controlled angle into -pi to pi, to match the angle-space of the ball
        this.angle = basics.foldAngle(this.angle);
        this.updatePosition()

    }
    updatePosition() {
        //GET BATTON VECTOR
        this.position = basics.GetVector(this.radius, this.angle); //Get batton position from radius and angle
    }
    reset() {
        this.radius = this.ri;
        this.angle = this.ti;
        this.updatePosition();
    }
}