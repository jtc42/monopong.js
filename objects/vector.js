export class Vector {
    constructor(x, y) {
        this.x = x || 0; //Add x to property
        this.y = y || 0; //Add y to property
    }
    add(vector) {
        this.x += vector.x; //Add x values
        this.y += vector.y; //Add y values
    }
    //Position to polar
    getRadius(x0, y0) {
        return Math.sqrt((this.x - x0) * (this.x - x0) + (this.y - y0) * (this.y - y0)); //Get absolute accounting for relative to centre of circle
    }
    getAngle(x0, y0) {
        return Math.atan2((y0 - this.y), (this.x - x0)); //Get arctan accounting for relative to centre of circle
    }
    //Velocity to polar
    getMagnitude() {
        return Math.sqrt((this.x) * (this.x) + (this.y) * (this.y)); //Get absolute not accounting for relative to centre of circle
    }
    getAnglev() {
        return Math.atan2(this.y, this.x); //Get arctan not accounting for relative to centre of circle
    }
    vector() {
        return this.x, this.y
    }
}