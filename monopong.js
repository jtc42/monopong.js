var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

var scale = 1;  //Animation scalar

var x0 = 0.5*canvas.width;  //Centre x
var y0 = 0.5*canvas.height;  //Centre y
var R = 250;  //Circle Radius
var s = 0.2*Math.PI;  //Batton size
var w = 0;  //Initial angular frequency of batton

var gamestart = 0; //Game active
var gameover = 0; //Has gameover occured
var hits = 0; //Hit count
var level = 0; //Iterates every 10 hits
var topscore = 0; //High score

// HANDLE KEYBOARD 
var keysDown = {}; //Array of keys down

addEventListener("keydown", function (e) {
    keysDown[e.keyCode] = true; //Add key to array
}, false);

addEventListener("keyup", function (e) {
    delete keysDown[e.keyCode]; //Remove key from array
}, false);

// HANDLE AUDIO
function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    this.play = function(){
        this.sound.play();
    }
    this.stop = function(){
        this.sound.pause();
    }
}

sound_hit = new sound("./ping_pong_8bit_plop.wav");
sound_shallow = new sound("./ping_pong_8bit_beeep.wav");
sound_miss = new sound("./ping_pong_8bit_peeeeeep.wav");

// BASIC FUNCTIONS
function square(x) { //Square a value
    return x*x;
}

function cube(x) { //Cube a value, requires square
    return x*square(x);
}

function fourth(x) { //Fourth a value, requires cube
    return x*cube(x);
}

function absolute(x) { //Get Modulus
    a = square(x); //Square input
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
    return Math.sqrt((this.x-x0) * (this.x-x0) + (this.y-y0) * (this.y-y0)); //Get absolute accounting for relative to centre of circle
};

Vector.prototype.getAngle = function () { //Add as function of particular vector property eg something.vector.getAngle
    return Math.atan2((y0-this.y),(this.x-x0)); //Get arctan accounting for relative to centre of circle
};


//Velocity to polar
Vector.prototype.getMagnitude = function () { //Add as function of particular vector property eg something.vector.getMagnitude
    return Math.sqrt((this.x) * (this.x) + (this.y) * (this.y)); //Get absolute not accounting for relative to centre of circle
};

Vector.prototype.getAnglev = function () { //Add as function of particular vector property eg something.vector.getAnglev
    return Math.atan2(this.y,this.x); //Get arctan not accounting for relative to centre of circle
};



//BATTON
//Define batton as an object, reading radius and angle
function Batton(r, t) { 
    this.position = new Vector(Getx(r,t), Gety(r,t)); //Calculate position from radius and angle
    this.radius = r; //Add radius as a function of a batton object
    this.angle = t; //Add angle as a function of a batton object
    this.b_angle = 0;
}

//Batton Move
Batton.prototype.move = function() { //Add move as a function unique to each batton
    
    w=0; //Reset angular velocity to zero
    
    //KEYBOARD CONTROL (Tidy up, shift condition once that adds a scalar to left and right)
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
    this.position = GetVector(this.radius, this.angle); //Get batton position from radius and angle
    this.b_angle = Math.asin(Math.sin(this.angle)); //Set b_angle to arcsin of sin of angle (Keeps +ve and -ve in check)
    
};


//BALL
//Define ball as an object, reading position and velocity vectors
function Ball(position, velocity, batton) {
    this.position = position || new Vector(x0,y0); //Set ball.position to given vector, or default to centre
    this.velocity = velocity || new Vector(0,0); //Set ball.velocity to given vector, or default to zero
    
    this.radius = 0; //Initial radius
    this.pangle = 0; //Initial position angle
    
    this.vmag = 0; //Initial velocity magnitude
    this.vangle = 0; //Initial velocity angle

    this.batton = batton; //Attached batton object
}


//Ball Move
Ball.prototype.move = function () {
    
    this.radius = this.position.getRadius(); //Set radius calculated from position
    this.pangle = this.position.getAngle(); //Set position angle calculated from position
    
    this.vmag = this.velocity.getMagnitude(); //Set velocity magnitude calculated from velocity vector
    this.vangle = this.velocity.getAnglev(); //Set velocity angle calculated from velocity vector
    
    
    if (this.radius<R+(1.5*scale*this.vmag)){ //If within outer circle boundary (circle radius + maximum extra due to one frames worth of velocity)
        if (Math.asin(Math.sin(this.pangle)) > this.batton.b_angle-0.5*s && Math.asin(Math.sin(this.pangle)) < this.batton.b_angle+0.5*s && this.radius >=R) { //If within batton angle AND on our outside inner boundary (collision)

            if ((absolute(Math.cos(ball_main.vangle+ball_main.pangle))) > 0.5){ //For steep angles

                console.log("STEEP")
                sound_hit.play() //Play collision SFX

                //Calculate new physical velocity angle, plus component due to batton movement, plus small random component
                this.vangle = Math.PI - this.vangle - 2*this.pangle - w*0.3*cube(absolute(Math.cos(ball_main.vangle+ball_main.pangle))) +(Math.random()-0.5)*0.2*Math.PI; 
            } 
                            
            else { //For shallow angles

                console.log("SHALLOW")
                sound_shallow.play() //Play shallow collision SFX

                if (absolute(this.pangle) > 0.6*Math.PI){ //For left half
                    //Calculate new physical velocity angle, minus small random component opposing natural velocity (deflect away from edge)
                    this.vangle = Math.PI - this.vangle - 2*this.pangle -(this.vangle/absolute(this.vangle))*(Math.random()*0.5*Math.PI +0.3);
                } 
                else { //For right half
                    //Calculate new physical velocity angle, plus small random component opposing natural velocity (deflect away from edge)
                    this.vangle = Math.PI - this.vangle - 2*this.pangle +(this.vangle/absolute(this.vangle))*(Math.random()*0.5*Math.PI +0.3);
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
        sound_miss.play() //Play collision SFX
        if (gamestart=1) {
            gameover = 1; //Flag gameover
        }
    }
    

};

//FRAME RATE
var lastAnimationFrameTime = 0, lastFpsUpdateTime = 0;

function calculateFps(now) {
    var fps = 1000 / (now - lastAnimationFrameTime);
    lastAnimationFrameTime = now;

    if (now - lastFpsUpdateTime > 1000) {
        lastFpsUpdateTime = now;
    }
    
    return Math.round(fps); 
}

// Create objects for game
var batton_main = new Batton(R, 0.5*Math.PI); // Make a new batton at top of circle
var ball_main = new Ball(Vector(x0, y0), Vector(0,0), batton_main) // New ball

//ANIMATION SEQUENCE
function loop(now) {
    //Run main loop
    clear();
    update(ball_main, batton_main);
    draw(ball_main, batton_main);
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

function update(ball, batton) { 

    if (gamestart!=1) { //If game hasn't started
        if (13 in keysDown) { // If enter is in keysDown
            hits = 0; //Reset score
            ball.velocity = new Vector(0.0,-6); //Give ball an initial velocity
            gamestart = 1; //Set game as started
            gameover = 0; //Clear gameover flag
            sound_shallow.play() //Play shallow collision SFX (for lack of a dedicated SFX for game starting)
        }
    }
    
    else {  // If game has started
        if (gameover!=0) { //If game has started AND gameover
            ball.position.x=x0; //Reset x
            ball.position.y=y0; //Reset y
            
            ball.velocity.x=0; //Reset vx
            ball.velocity.y=0; //Reset vy
            
            batton_main.angle=0.5*Math.PI; //Reset Batton

            keysDown=[]; //Clear keys down

            gamestart = 0; //Stop game

            if (hits>topscore){ //If score beats current best
                topscore=hits; //Update topscore
            }
            
        }
        else {  //If game has started AND NOT gameover
            //BATTON MOTION
            batton.move(); //Move batton
            
            //BALL MOTION
            ball.move(); //Move ball
        }
    }
}

function draw(ball, batton) { //DRAW FRAME

    //Title
    if (gamestart!=1) { //If game hasn't started
        ctx.font = "normal 22px Verdana";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign="center"; 
        ctx.fillText("PRESS ENTER", x0, y0+60);
    }

    //Gameover screen
    if (gameover!=0) {
        ring_colour = '#FF0000';
        ctx.fillText("GAME OVER", x0, y0-80);
        ctx.fillText("SCORE: " + hits, x0, y0-50);
    }
    else {
        ring_colour = '#bc7a00';
    }
                    
    //Ring
    ctx.beginPath();
    ctx.arc(x0,y0,R,0,2*Math.PI);
    ctx.lineWidth = 2;
    ctx.strokeStyle = ring_colour;
    ctx.stroke();
    
    //Batton decoration
    ctx.beginPath();
    ctx.arc(x0, y0, R+2, batton.angle-s, batton.angle+s);
    ctx.lineWidth = 6;
    ctx.strokeStyle = ring_colour;
    ctx.stroke();

    //Batton
    ctx.beginPath();
    ctx.arc(x0, y0, R+4, -batton.angle-0.5*s, -batton.angle+0.5*s);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    //Ball
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(ball.position.x, ball.position.y, 8, 0, 2*Math.PI, false);
    ctx.fillRect(Math.round(ball.position.x), Math.round(ball.position.y), 2, 2);
    ctx.fill();
    
    //Score
    ctx.font = "normal 18px Verdana";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign="left"; 
    ctx.fillText("Hits: " + hits, 50, 50);
    ctx.fillText("Highscore: " + topscore, 50, 100);
    ctx.fillText("Level: " + level, 50, 150);
    
}

function queue() { //GET NEW FRAME
    window.requestAnimationFrame(loop);
}

// Start the game
loop(); //Run animation loop