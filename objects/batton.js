import { Vector } from './vector.js'
import * as basics from '../logic/basics.js'

//Define batton as an object, reading radius and angle
export class Batton {
    constructor(r, t, playarea) {
        this.playarea = playarea
        this.position = new Vector(basics.GetX(r, t, this.playarea.x0), basics.GetY(r, t, this.playarea.y0)); //Calculate position from radius and angle
        this.radius = r; //Add radius as a function of a batton object
        this.angle = t; //Add angle as a function of a batton object
        this.direction = 0; //Initial angular velocity
        this.lastKey = 0;
        this.size = 0.2 * Math.PI;
    }
    //Batton Move
    move() {
        //Reset direction
        this.direction = 0;
        if (this.direction != 1 && basics.leftKeyID in this.playarea.keysDown && !(basics.rightKeyID in this.playarea.keysDown)) { // Left only down
            this.direction = 1;
            this.lastKey = 1;
        }
        else if (this.direction != -1 && basics.rightKeyID in this.playarea.keysDown && !(basics.leftKeyID in this.playarea.keysDown)) { // Right only down
            this.direction = -1;
            this.lastKey = -1;
        }
        else if (basics.rightKeyID in this.playarea.keysDown && basics.leftKeyID in this.playarea.keysDown) { // Both directions down
            if (this.lastKey == 1) { //If left was started first
                this.direction = -1; //Move right
            }
            else if (this.lastKey == -1) { //If right was started first
                this.direction = 1; //Move left
            }
            else { //If left and right were somehow pressed at the exact same time
                this.direction = 0;
            }
        }
        else { //No directions down
            this.direction = 0;
            this.lastKey = 0;
        }
        this.angle += this.direction * this.playarea.speedScale * 0.02 * Math.PI; //Add angular velocity to angle
        //Fold the user-controlled angle into -pi to pi, to match the angle-space of the ball
        this.angle = basics.foldAngle(this.angle);
        //GET BATTON VECTOR
        this.position = basics.GetVector(this.radius, this.angle); //Get batton position from radius and angle
    }
}