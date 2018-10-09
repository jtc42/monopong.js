var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

var scale=1; //Animation scalar

var x0= 0.5*canvas.width; //Centre x
var y0= 0.5*canvas.height; //Centre y
var R= 250; //Circle Radius
var s=0.2*Math.PI; //Batton size
var w=0; //Initial angular frequency of batton

var ballstart = new Vector(x0,y0); //Start point of ball
var ballv = new Vector(0.0,-6); //Initial velocity of ball

var bangle=0; //Arcsine of Sine of batton angle (Keeps +ve and -ve in check)

var gamestart=0; //Game active
var hits=0; //Hit count
var level=0; //NOT CURRENTLY USED, WILL MEAN 10 HITS
var topscore=0; //High score



// Handle keyboard controls
var keysDown = {}; //Array of keys down

addEventListener("keydown", function (e) {
    keysDown[e.keyCode] = true; //Add key to array
}, false);

addEventListener("keyup", function (e) {
    delete keysDown[e.keyCode]; //Remove key from array
}, false);

            
function square(x) { //Square a value
    return x*x;
}

function cube(x) { //Cube a value, requires square
    return x*square(x);
}

function fourth(x) { //Fourth a value, requires cube
    return x*cube(x);
}

function GetMod(x) { //Get Modulus
    a=square(x); //Square input
    return Math.sqrt(a); //Root square
}


//Manage vectors
function Vector(x, y) {
        this.x = x || 0; //Add x to property
        this.y = y || 0; //Add y to property
}

Vector.prototype.add = function(vector) {
    this.x += vector.x; //Add x values
    this.y += vector.y; //Add y values
};



//Position to Vector (accounts for relative to centre of circle)
function Getx(r,t) { //Get x from R and angle
    return r*Math.cos(t) +x0;
}

function Gety(r,t) { //Get y from R and angle
    return y0 -r*Math.sin(t);
}

function GetVector(r,t) { //Combine Getx and Gety
    var x = Getx(r,t);
    var y = Gety(r,t);
    return new Vector(x,y); //Set x and y values
}


//Velocity to Vector (does not need to account for relative to centre of circle)
function Getvx(r,t) { //Get vx from R and angle
    return r*Math.cos(t);
}

function Getvy(r,t) { //Get vy from R and angle
    return r*Math.sin(t);
}

function GetVectorv(r,t) { //Combine Getvx and Getvy
    var x = Getvx(r,t);
    var y = Getvy(r,t);
    return new Vector(x,y); //Set x and y values
}



//Position to polar
Vector.prototype.getRadius = function () { //Add as function of particular vector property eg something.vector.getRadius
    return Math.sqrt((this.x-x0) * (this.x-x0) + (this.y-y0) * (this.y-y0)); //Get modulus accounting for relative to centre of circle
};

Vector.prototype.getAngle = function () { //Add as function of particular vector property eg something.vector.getAngle
    return Math.atan2((y0-this.y),(this.x-x0)); //Get arctan accounting for relative to centre of circle
};


//Velocity to polar
Vector.prototype.getMagnitude = function () { //Add as function of particular vector property eg something.vector.getMagnitude
    return Math.sqrt((this.x) * (this.x) + (this.y) * (this.y)); //Get modulus not accounting for relative to centre of circle
};

Vector.prototype.getAnglev = function () { //Add as function of particular vector property eg something.vector.getAnglev
    return Math.atan2(this.y,this.x); //Get arctan not accounting for relative to centre of circle
};



//BATTON
//Define batton as an object, reading radius and angle
function Batton(r, t) { 
    this.position= new Vector(Getx(r,t), Gety(r,t)); //Calculate position from radius and angle
    this.radius=r; //Add radius as a function of a batton object
    this.angle=t; //Add angle as a function of a batton object
}

//Batton Move
Batton.prototype.move = function() { //Add move as a function unique to each batton
    
    w=0; //Reset angular velocity to zero
    
    //KEYBOARD CONTROL (Tidy up, shift coniditon once that adds a scalar to left and right)
    if (37 in keysDown) { // Left down
        if (16 in keysDown) { //Shift down
            this.angle+=scale*0.04*Math.PI; //Add double angle
            w=2; //Set double w
        }
        else { //Shift not down
            this.angle+=scale*0.02*Math.PI; //Add single angle
            w=1; //Set single w
        }
    }
    
    if (39 in keysDown) { // Right down
        if (16 in keysDown) { //Shift down
            this.angle-=scale*0.04*Math.PI; //Add double angle
            w=-2; //Set double w
                }
        else {//Shift not down
            this.angle-=scale*0.02*Math.PI; //Add single angle
            w=-1; //Set single w
            }
    }
    
    
    //Reset batton angle every 2pi radians
    if (this.angle>=2*Math.PI) {
        this.angle= this.angle - 2*Math.PI;
    }
    if (this.angle<=-2*Math.PI) {
        this.angle= this.angle + 2*Math.PI;
    }
    
    
    //GET BATTON VECTOR
    this.position=GetVector(this.radius, this.angle); //Get batton position from radius and angle
    
    bangle= Math.asin(Math.sin(this.angle)); //Set bangle to arcsin of sin of angle (Keeps +ve and -ve in check)
    
};


//BALL
//Define ball as an object, reading position and velocity vectors
function Ball(position,velocity) {
    this.position = position || new Vector(x0,y0); //Set ball.position to given vector, or default to centre
    this.velocity = velocity || new Vector(0,0); //Set ball.velocity to given vector, or default to zero
    
    this.radius = 0; //Initial radius
    this.pangle = 0; //Initial position angle
    
    this.vmag = 0; //Initial velocity magnitude
    this.vangle = 0; //Initial velocity angle
}


//Ball Move
Ball.prototype.move = function () {
    
    this.radius = this.position.getRadius(); //Set radius calculated from position
    this.pangle = this.position.getAngle(); //Set position angle calculated from position
    
    this.vmag = this.velocity.getMagnitude(); //Set velocity magnitude calculated from velocity vector
    this.vangle = this.velocity.getAnglev(); //Set velocity angle calculated from velocity vector
    
    
    if (this.radius<R+(1.5*scale*this.vmag)){ //If within outer circle boundary (circle radius + maximum extra due to one frames worth of velocity)
        if (Math.asin(Math.sin(this.pangle)) > bangle-0.5*s && Math.asin(Math.sin(this.pangle)) < bangle+0.5*s && this.radius >=R) { //If within batton angle AND on our outside inner boundary (collision)
            
            if ((GetMod(Math.cos(Ball1.vangle+Ball1.pangle))) > 0.5){ //For steep angles
                //Calculate new physical velocity angle, plus component due to batton movement, plus small random component
                this.vangle = Math.PI - this.vangle - 2*this.pangle - w*0.3*cube(GetMod(Math.cos(Ball1.vangle+Ball1.pangle))) +(Math.random()-0.5)*0.2*Math.PI; 
            } 
                            
            else { //For shallow angles
                if (GetMod(this.pangle) > 0.6*Math.PI){ //For left half
                    //Calculate new physical velocity angle, minus small random component opposing natural velocity (deflect away from edge)
                    this.vangle = Math.PI - this.vangle - 2*this.pangle -(this.vangle/GetMod(this.vangle))*(Math.random()*0.5*Math.PI +0.3);
                } 
                else { //For right half
                    //Calculate new physical velocity angle, plus small random component opposing natural velocity (deflect away from edge)
                    this.vangle = Math.PI - this.vangle - 2*this.pangle +(this.vangle/GetMod(this.vangle))*(Math.random()*0.5*Math.PI +0.3);
                } 
                                
            }//For shallow angles
            
            this.velocity= GetVectorv(this.vmag,this.vangle); //Update velocity vector after collision, from magnitude and angle
            
            if (this.radius > R){ //If position is greater than inner boundary
                this.radius = R; //Set radius to within inner boundary (prevent getting stuck outside)
                this.position = GetVector(this.radius, this.pangle); //Set new position in x and y
            }
            
            hits+=1; //Add one hit on collision
        }
        
        //UPDATE POSITION (collision or not)
        //this.position.add(this.velocity);
        this.position.x+=scale*this.velocity.x;
        this.position.y+=scale*this.velocity.y;
        
        
            
    } 
    else { //If outside outer circle boundary
        console.log("Out of bounds");
        if (gamestart=1) {
        //RESET GAME
            this.position.x=x0; //Reset x
            this.position.y=y0; //Reset y
            
            this.velocity.x=0; //Reset vx
            this.velocity.y=0; //Reset vy
            
            Batton1.angle=0.5*Math.PI; //Reset Batton

            alert("You lose! Press Enter to restart."); //Lose alert
            keysDown=[]; //Clear keys down
            gamestart=0; //Stop game
            if (hits>topscore){ //If score beats current best
                topscore=hits; //Update topscore
            }
            hits=0; //Reset hit count
        }
    }
    

};

// Create objects
var Batton1 = new Batton(R, 0.5*Math.PI); //Make a new batton at top of circle
var Ball1 = new Ball(ballstart,0); //New ball at ballstart position (variables at top) and zero velocity



//FRAME RATE
var lastAnimationFrameTime = 0,
    lastFpsUpdateTime = 0;

function calculateFps(now) {
    var fps = 1000 / (now - lastAnimationFrameTime);
    lastAnimationFrameTime = now;

    if (now - lastFpsUpdateTime > 1000) {
        lastFpsUpdateTime = now;
    }
    
    return Math.round(fps); 
}



//ANIMATION SEQUENCE
function loop(now) {

    //Run main loop
    clear();
    update();
    draw();
    queue();
    //Get FPS and scale
    fps = calculateFps(now);
    fpscale=60/fps;
    level=Math.round((hits+5)/10);
    scale=fpscale*(1+0.15*(level-1));
}

function clear() { //CLEAR CANVAS ON EVERY FRAME
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function update() { //UPDATE OBJECT DATA

    //New game condition
    if (gamestart!=1) { //If game hasn't started
        if (13 in keysDown) { // If space is in keysDown
            Ball1.velocity=ballv; //Give ball velocity
            gamestart=1; //Set game as started
        }
    }
    
    //BATTON MOTION
    Batton1.move(); //Move batton
    
    //BALL MOTION
    Ball1.move(); //Move ball
    
}

function draw() { //DRAW FRAME
                    
    //Ring
    ctx.beginPath();
    ctx.arc(x0,y0,R,0,2*Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFA500';
    ctx.stroke();
    
    //Batton
    //ctx.beginPath();
    //ctx.arc(Batton1.position.x, Batton1.position.y, 5, 0, 2 * Math.PI, false);
    //ctx.fillStyle = 'blue';
    //ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x0,y0,R+2,Batton1.angle -s,Batton1.angle +s);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#FFA500';
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x0,y0,R+4,-Batton1.angle -0.5*s,-Batton1.angle +0.5*s);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    //Ball
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(Ball1.position.x, Ball1.position.y, 8, 0, 2 * Math.PI, false);
    ctx.fillRect(Math.round(Ball1.position.x), Math.round(Ball1.position.y), 2, 2);
    ctx.fill();
    
    //Score
    ctx.font      = "normal 18px Verdana";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Hits: "+ hits, 50, 50);
    ctx.fillText("Highscore: " +topscore, 50, 100);
    
    
    ctx.font      = "normal 18px Verdana";
    ctx.fillStyle = "#ffffff";
    //ctx.fillText(gamestart, 200, 50);
    //ctx.fillText(Math.round(fps,), 250, 50);
    ctx.fillText("Level: " +level, 50, 150);
    
    /*
    Debug
    ctx.font      = "normal 18px Verdana";
    ctx.fillStyle = "#000000";
    ctx.fillText(Math.round(Ball1.position.x), 50, 50);
    ctx.fillText(Math.round(Ball1.position.y), 50, 100);
    ctx.fillText(Math.round(Ball1.radius), 50, 200);
    ctx.fillText(Math.asin(Math.sin(Ball1.pangle)), 50, 250);
    ctx.fillText(Ball1.vangle, 50, 300);
    ctx.fillText(Math.round(Ball1.vmag), 50, 350);
    ctx.fillText(GetMod(Math.cos(Ball1.vangle+Ball1.pangle)), 50, 400);
    ctx.fillText(bangle, 50, 500);
    ctx.fillText(w, 50, 450);
    
    Dev Line
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(Batton1.position.x, Batton1.position.y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#cccccc';
    ctx.stroke();
        
    Centre dot
    ctx.beginPath();
    ctx.arc(x0, y0, 5, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'gray';
    ctx.fill();
    */
    
}

function queue() { //GET NEW FRAME
    window.requestAnimationFrame(loop);
}

console.log("Entering game")
loop(); //Run animation loop