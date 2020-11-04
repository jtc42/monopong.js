import { Vector } from "../objects/vector.js";

export var leftKeyID = 37;
export var rightKeyID = 39;
export var enterKeyID = 13;
export var escKeyID = 27;

export function foldAngle(angle) {
  //Fold an arbitrary angle into -pi to pi
  if (angle >= Math.PI) {
    return angle - 2 * Math.PI;
  } else if (angle < -Math.PI) {
    return angle + 2 * Math.PI;
  } else {
    return angle;
  }
}

export function isEmpty(obj) {
  //Test for empty arrays
  return Object.keys(obj).length === 0;
}

export function sigmoid(t) {
  //Pure sigmoid
  return 1 / (1 + Math.pow(Math.E, -t));
}

export function difficulty(t, a, b) {
  //Sigmoidal difficulty curve
  return a * (sigmoid(b * (t - 1)) - 0.5) + 1;
}

export function deathPaddle(t, a, b) {
  //Value of s for linearly decreasing paddle size in death mode
  return Math.PI * (-a * (t - 10) + b);
}

export function square(x) {
  //Square a value
  return x * x;
}

export function cube(x) {
  //Cube a value, requires square
  return x * square(x);
}

export function absolute(x) {
  //Get Modulus
  return Math.sqrt(square(x)); //Root square
}

//Position to Vector (accounts for relative to centre of circle)
export function GetX(r, t, x0) {
  //Get x from R and angle
  return r * Math.cos(t) + x0;
}

export function GetY(r, t, y0) {
  //Get y from R and angle
  return y0 - r * Math.sin(t);
}

export function GetVector(r, t, x0, y0) {
  //Combine GetX and GetY
  var x = GetX(r, t, x0);
  var y = GetY(r, t, y0);
  return new Vector(x, y); //Set x and y values
}

//Velocity to Vector (does not need to account for relative to centre of circle)
export function GetVX(r, t) {
  //Get vx from R and angle
  return r * Math.cos(t);
}

export function GetVY(r, t) {
  //Get vy from R and angle
  return r * Math.sin(t);
}

export function GetVectorV(r, t) {
  //Combine GetVX and GetVY
  var x = GetVX(r, t);
  var y = GetVY(r, t);
  return new Vector(x, y); //Set x and y values
}
