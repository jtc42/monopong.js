//TODO: Try and override long press vibration on mobile
//TODO: Scale text, batton, and ring line to ring radius
//TODO: Improve collision detection, because it is quite bad
//TODO: Add savedata system
//TODO: Shiny up

//PWA STUFF
//Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    .then(function(registration) {
        console.log('Registration successful, scope is:', registration.scope);
    })
    .catch(function(error) {
        console.log('Service worker registration failed, error:', error);
    });
}

//SET UP CANVAS
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

//Store view sizes
var viewWidth = document.body.clientWidth;
var viewHeight = document.body.clientHeight;

// Set display size (css pixels).
canvas.style.width = viewWidth + "px";
canvas.style.height = viewHeight + "px";

// Set actual size in memory (scaled to account for extra pixel density).
var scale = window.devicePixelRatio;
canvas.width = viewWidth * scale;
canvas.height = viewHeight * scale;

// Normalize coordinate system to use css pixels.
ctx.scale(scale, scale);

// Canvas-scaled dimensions
var smallerDim = Math.min(viewWidth, viewHeight);
var R = smallerDim /2.4;  //Circle Radius

var x0 = 0.5*viewWidth;  //Centre x
var y0 = 0.5*viewHeight;  //Centre y

//Function to recalculate all dimensions
function resizeCanvas() {
    //Update view sizes
    viewWidth = document.body.clientWidth;
    viewHeight = document.body.clientHeight;

    // Update display size (css pixels).
    canvas.style.width = viewWidth + "px";
    canvas.style.height = viewHeight + "px";

    // Set actual size in memory (scaled to account for extra pixel density).
    scale = window.devicePixelRatio;
    canvas.width = viewWidth * scale;
    canvas.height = viewHeight * scale;

    // Normalize coordinate system to use css pixels.
    ctx.scale(scale, scale);   

    // Canvas-scaled dimensions
    smallerDim = Math.min(viewWidth, viewHeight);
    R = smallerDim /2.4;  //Circle Radius

    x0 = 0.5*viewWidth;  //Centre x
    y0 = 0.5*viewHeight;  //Centre y
}

//DEFINITIONS
var scale = 1;  //Animation scalar

var s = 0.2*Math.PI;  //Batton angular size
var w = 0;  //Initial angular frequency of batton

var gameStart = false; //Game active
var gameOver = false; //Has gameOver occured

var hits = 0; //Hit count
var level = 0; //Iterates every 10 hits
var topScore = 0; //High score

var godMode = false; //Never lose god mode




// Handle resize events
window.addEventListener('resize', resizeCanvas, false);


//HANDLE CONTEXT MENU OVERRIDE
if (document.addEventListener) {
    document.addEventListener('contextmenu', function(e) {
        console.log("You've tried to open context menu"); //here you draw your own menu
        e.preventDefault();
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();
        e.cancelBubble = true;
        e.returnValue = false;
    }, false);
} else {
    document.attachEvent('oncontextmenu', function() {
        console.log("You've tried to open context menu the other way");
        window.event.returnValue = false;
    });
}

// HANDLE CONTROLS

// Key IDs
var leftKeyID = 37;
var rightKeyID = 39;
var enterKeyID = 13;

var keysDown = {}; //Array of keys down

addEventListener("keydown", function (e) {
    keysDown[e.keyCode] = true; //Add key to array
}, false);

addEventListener("keyup", function (e) {
    delete keysDown[e.keyCode]; //Remove key from array
}, false);


// HANDLE TOUCH EVENTS

// Get the position of a touch relative to the canvas
function getTouchPos(canvasDom, touchEvent) {
    var rect = canvasDom.getBoundingClientRect();
    return {
      x: touchEvent.touches[0].clientX - rect.left,
      y: touchEvent.touches[0].clientY - rect.top
    };
  }

canvas.addEventListener("touchstart", function (e) {
    mousePos = getTouchPos(canvas, e);
    if (mousePos['x'] < x0) {
        keysDown[leftKeyID] = true; //Add key to array (emulates a keyboard keypress)
    }
    else {
        keysDown[rightKeyID] = true; //Add key to array (emulates a keyboard keypress)
    }

}, false);

canvas.addEventListener("touchend", function (e) {
    if (mousePos['x'] < x0) {
        delete keysDown[leftKeyID]; //Remove key from array (emulates a keyboard key release)
    }
    else {
        delete keysDown[rightKeyID]; //Remove key from array (emulates a keyboard key release)
    }
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

soundHit = new sound("./ping_pong_8bit_plop.wav");
soundShallow = new sound("./ping_pong_8bit_beeep.wav");
soundMiss = new sound("./ping_pong_8bit_peeeeeep.wav");

// BASIC FUNCTIONS
function isEmpty(obj) { //Test for empty arrays
    return Object.keys(obj).length === 0;
}

function sigmoid(t) { //Pure sigmoid
    return 1/(1+Math.pow(Math.E, -t));
}

function difficulty(t, a, b) { //Sigmoidal difficulty curve
    return a*(sigmoid(b*(t - 1)) - 0.5) + 1;
}

function deathPaddle(t, a, b) { //Value of s for linearly decreasing paddle size in death mode
    return Math.PI*(-a*t + b);
}

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
function GetX(r,t) { //Get x from R and angle
    return r*Math.cos(t) +x0;
}

function GetY(r,t) { //Get y from R and angle
    return y0 -r*Math.sin(t);
}

function GetVector(r,t) { //Combine GetX and GetY
    var x = GetX(r,t);
    var y = GetY(r,t);
    return new Vector(x,y); //Set x and y values
}


//Velocity to Vector (does not need to account for relative to centre of circle)
function GetVX(r,t) { //Get vx from R and angle
    return r*Math.cos(t);
}

function GetVY(r,t) { //Get vy from R and angle
    return r*Math.sin(t);
}

function GetVectorV(r,t) { //Combine GetVX and GetVY
    var x = GetVX(r,t);
    var y = GetVY(r,t);
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
    this.position = new Vector(GetX(r,t), GetY(r,t)); //Calculate position from radius and angle
    this.radius = r; //Add radius as a function of a batton object
    this.angle = t; //Add angle as a function of a batton object
    this.b_angle = 0;
}

//Batton Move
Batton.prototype.move = function() { //Add move as a function unique to each batton
    
    w=0; //Reset angular velocity to zero
    
    //KEYBOARD CONTROL (Tidy up, shift condition once that adds a scalar to left and right)
    if (leftKeyID in keysDown) { // Left down
        if (16 in keysDown) { //Shift down
            this.angle+=scale*0.04*Math.PI; //Add double angle
            w=2; //Set double w
        }
        else { //Shift not down
            this.angle+=scale*0.02*Math.PI; //Add single angle
            w=1; //Set single w
        }
    }
    
    if (rightKeyID in keysDown) { // Right down
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
function Ball(position, velocity, size, batton) {
    this.position = position || new Vector(x0,y0); //Set ball.position to given vector, or default to centre
    this.velocity = velocity || new Vector(0,0); //Set ball.velocity to given vector, or default to zero
    
    this.pradius = 0; //Initial position radius
    this.pangle = 0; //Initial position angle

    this.size = size; //Ball size radius
    
    this.vmag = 0; //Initial velocity magnitude
    this.vangle = 0; //Initial velocity angle

    this.batton = batton; //Attached batton object
}

//Generic function to test for collision between a ball and a batton
function testCollision(ball, batton) {
    //TODO: Split test conditions, and add debug mode to log the cause of a miss
    //If within batton angle AND on our outside inner boundary (collision)
    var angletest = Math.asin(Math.sin(ball.pangle)) > batton.b_angle-0.5*s && Math.asin(Math.sin(ball.pangle)) < batton.b_angle+0.5*s;
    var radiustest = ball.pradius >= R - ball.size;

    if (!godMode){ //If not in god mode
        return (angletest && radiustest);
    }
    else { //If in god mode
        return radiustest //Ignore angle test
    }
}

//Ball Move
Ball.prototype.move = function () {
    
    this.pradius = this.position.getRadius(); //Set radius calculated from position
    this.pangle = this.position.getAngle(); //Set position angle calculated from position
    
    this.vmag = this.velocity.getMagnitude(); //Set velocity magnitude calculated from velocity vector
    this.vangle = this.velocity.getAnglev(); //Set velocity angle calculated from velocity vector

    //Update position
    if (bounds(this)) {
        this.position.x+=scale*this.velocity.x;
        this.position.y+=scale*this.velocity.y;
    }
};

// OUT OF BOUNDS HANDLING (GAME OVER)
function bounds(ball) {
    //If not within outer circle boundary
    if (ball.pradius > R + (1.5*scale*ball.vmag)) { 
        soundMiss.play() //Play collision SFX
        if (gameStart = true) {
            gameOver = true; //Flag gameOver
        }
        return false
    }
    else {
        return true
    }
}

// COLLISION HANDLING
function collisions(ball, batton) {

    if (testCollision(ball, batton)) { //If ball has colided with batton, or godMode is on

        if ((absolute(Math.cos(ball.vangle + ball.pangle))) > 0.5){ //For steep angles
            soundHit.play() //Play collision SFX

            //Calculate new physical velocity angle, plus component due to batton movement, plus small random component
            ball.vangle = Math.PI - ball.vangle - 2*ball.pangle - w*0.3*cube(absolute(Math.cos(ball.vangle+ball.pangle))) +(Math.random()-0.5)*0.2*Math.PI; 
        } 
                        
        else { //For shallow angles
            soundShallow.play() //Play shallow collision SFX

            if (absolute(ball.pangle) > 0.6*Math.PI){ //For left half
                //Calculate new physical velocity angle, minus small random component opposing natural velocity (deflect away from edge)
                ball.vangle = Math.PI - ball.vangle - 2*ball.pangle - (ball.vangle/absolute(ball.vangle))*(Math.random()*0.5*Math.PI +0.3);
            } 
            else { //For right half
                //Calculate new physical velocity angle, plus small random component opposing natural velocity (deflect away from edge)
                ball.vangle = Math.PI - ball.vangle - 2*ball.pangle + (ball.vangle/absolute(ball.vangle))*(Math.random()*0.5*Math.PI +0.3);
            } 
                            
        } //For shallow angles
        
        ball.velocity = GetVectorV(ball.vmag, ball.vangle); //Update velocity vector after collision, from magnitude and angle
        
        if (ball.pradius > R - ball.size){ //If position is greater than inner boundary
            ball.pradius = R - ball.size - ball.vmag; //Set radius to within inner boundary (prevent getting stuck outside)
            ball.position = GetVector(ball.pradius, ball.pangle); //Set new position in x and y
        }
        
        hits+=1; //Add one hit on collision
    }
}

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
var ball_main = new Ball(Vector(x0, y0), Vector(0,0), 0.032*R, batton_main) // New ball

//ANIMATION SEQUENCE
function loop(now) {
    //Run main loop
    clear();
    update(ball_main, batton_main); //Update all positions
    collisions(ball_main, batton_main); //Handle ball-batton collisions
    draw(ball_main, batton_main); //Redraw in new positions
    
    queue();

    //Get FPS and scale
    fps = calculateFps(now);
    fpscale = 60/fps;
    level = Math.round((hits+5)/10);
    
    //Set scale by FPS and level increments
    scale = fpscale * difficulty(level, 3.8, 0.18);
}

//CLEAR CANVAS ON EVERY FRAME
function clear() { 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//STARTS GAME
function startgame(ball) {
    ball.velocity = new Vector(0.0, -0.024*R); //Give ball an initial velocity
    gameStart = 1; //Set game as started
    gameOver = 0; //Clear gameOver flag
    soundShallow.play() //Play shallow collision SFX (for lack of a dedicated SFX for game starting)
}

//START GAME TIMER
function timer(delay, ball, batton) {
    timervalue = delay;
    soundHit.play() //Play collision SFX

    var startTimer = setInterval(function(){
        timervalue--;
        if(timervalue <= 0) { //If at zero
            console.log("DONE")
            timerstarted = 0; //Stop timer
            startgame(ball, batton)
            console.log("CLEAR")
            clearInterval(startTimer);
        }
        else { //If not zero
            console.log(timervalue)
            soundHit.play() //Play collision SFX
        }
    },1000);
}

var timerstarted = 0; //Has countdown started
var timervalue = 0; //Countdown value

var game_startable = true; //Can the game be started? (After gameOver, all keys must be released for this to be 1)

function update(ball, batton) { 

    if (!gameStart) { //If game hasn't started

        // Updated ball resting position (in case of canvas resize)
        ball.position.x = x0; //Reset x
        ball.position.y = y0; //Reset y

        if (!game_startable && isEmpty(keysDown)) { //If game isn't startable, wait for all keys to be released then make startable
            console.log("Making game startable")
            game_startable = true; //Make game startable once all keys have been let go of
        }

        if (game_startable && (enterKeyID in keysDown || leftKeyID in keysDown || rightKeyID in keysDown)) { // If game is startable AND any key is pressed
            if (!timerstarted){ // If timer hasn't already started
                console.log("STARTING TIMER")
                timerstarted = true; //Flag timer as started
                hits = 0; //Reset score
                timer(3, ball, batton) //Start timer
            }
        }
    }
    
    else {  // If game has started
        if (gameOver) { //If game has started AND gameOver
            ball.position.x = x0; //Reset x
            ball.position.y = y0; //Reset y
            
            ball.velocity.x = 0; //Reset vx
            ball.velocity.y = 0; //Reset vy
            
            batton_main.angle=0.5*Math.PI; //Reset Batton

            keysDown = {}; //Clear keys down

            gameStart = false; //Stop game
            game_startable = false; //Lock game out of starting

            if (hits>topScore){ //If score beats current best
                topScore = hits; //Update topScore
            }
            
        }
        else {  //If game has started AND NOT gameOver
            // DEATH MODE
            if (20 <= level && level <= 30) { // If between levels 20 and 30
                s = deathPaddle(level, 0.01, 0.4);
            }

            //BATTON MOTION
            batton.move(); //Move batton
            
            //BALL MOTION
            ball.move(); //Move ball
        }
    }
}

function draw(ball, batton) { //DRAW FRAME

    //Title
    if (!gameStart) { //If game hasn't started

        ctx.fillStyle = "#ffffff";

        if (!timerstarted) { //If countdown hasn't started
            ctx.font = "normal 22px monospace";
            ctx.textAlign="center"; 
            ctx.fillText("TOUCH/ENTER TO START", x0, y0+60);

            if (!gameOver) {
                ctx.font = "normal 52px monospace";
                ctx.fillText("MONOPONG", x0, y0-80);
            }
        }
        else {
            ctx.font = "normal 52px monospace";

            ctx.textAlign="center"; 
            ctx.fillText(timervalue, x0, y0-80);
        }
    }

    //Gameover screen
    if (gameOver && !timerstarted) {
        ctx.font = "normal 42px monospace";
        ctx.fillText("GAME OVER", x0, y0-80);
        ctx.font = "normal 22px monospace";
        ctx.fillText("SCORE: " + hits, x0, y0-50);
    }

    
    //Ring
    if (gameOver && !timerstarted) { //If gameOver and timer not started
        ring_colour = '#FF0000';
    }
    else if (timerstarted || (!gameOver && !gameStart)) { //If timer started, or not gameOver but game not started (ie first run)
        ring_colour = '#bc7a00';
    }
    else { //If game is running
        ring_colour = '#00bca6';
    }

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
    ctx.arc(ball.position.x, ball.position.y, ball.size, 0, 2*Math.PI, false);
    ctx.fill();
    
    //Score
    ctx.font = "normal 18px monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign="left"; 
    ctx.fillText("Level: " + level, 50, 50);
    ctx.fillText("Hits: " + hits, 50, 100);
    ctx.fillText("Highscore: " + topScore, 50, 150);
}

function queue() { //GET NEW FRAME
    window.requestAnimationFrame(loop);
}

// Start the game
loop(); //Run animation loop