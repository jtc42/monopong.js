var VERSION = "gamma"

//PWA STUFF
//Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(function (registration) {
            console.log('Registration successful, scope is:', registration.scope);
        })
        .catch(function (error) {
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
var R = smallerDim / 2.3; //Circle Radius

var x0 = 0.5 * viewWidth; //Centre x
var y0 = 0.5 * viewHeight; //Centre y

//DEFINITIONS
var speedScale = 1; //Animation scalar

var gameStarted = false; //Game active
var gameOver = false; //Has gameOver occured
var gamePaused = false; //Game is paused

var hits = 0; //Hit count
var level = 0; //Iterates every 10 hits
var topScore = 0; //High score

var godMode = false; //Never lose god mode


//General pause function
function pauseGame() {
    soundShallow.play() //Play shallow collision SFX (for lack of a dedicated SFX for game pausing)
    gamePaused = true;
}

//Function to recalculate all dimensions
function resizeCanvas() {
    //Pause game immediately
    if (gameStarted && !gamePaused) {
        pauseGame()
    }

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
    R = smallerDim / 2.3; //Circle Radius

    x0 = 0.5 * viewWidth; //Centre x
    y0 = 0.5 * viewHeight; //Centre y
}

// Handle resize events
window.addEventListener('resize', resizeCanvas, false);

//HANDLE CONTEXT MENU OVERRIDE
if (document.addEventListener) {
    document.addEventListener('contextmenu', function (e) {
        console.log("You've tried to open context menu"); //here you draw your own menu
        e.preventDefault();
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();
        e.cancelBubble = true;
        e.returnValue = false;
    }, false);
} else {
    document.attachEvent('oncontextmenu', function () {
        console.log("You've tried to open context menu the other way");
        window.event.returnValue = false;
    });
}

// HANDLE CONTROLS

// Key IDs
var leftKeyID = 37;
var rightKeyID = 39;
var enterKeyID = 13;
var escKeyID = 27;

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
    } else {
        keysDown[rightKeyID] = true; //Add key to array (emulates a keyboard keypress)
    }

}, false);

canvas.addEventListener("touchend", function (e) {
    if (mousePos['x'] < x0) {
        delete keysDown[leftKeyID]; //Remove key from array (emulates a keyboard key release)
    } else {
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
    this.play = function () {
        this.sound.play();
    }
    this.stop = function () {
        this.sound.pause();
    }
}

soundHit = new sound("./ping_pong_8bit_plop.wav");
soundShallow = new sound("./ping_pong_8bit_beeep.wav");
soundMiss = new sound("./ping_pong_8bit_peeeeeep.wav");

// BASIC FUNCTIONS

function foldAngle(angle) { //Fold an arbitrary angle into -pi to pi
    if (angle >= Math.PI) {
        return angle - 2 * Math.PI;
    } else if (angle < -Math.PI) {
        return angle + 2 * Math.PI;
    } else {
        return angle
    }
}

function isEmpty(obj) { //Test for empty arrays
    return Object.keys(obj).length === 0;
}

function sigmoid(t) { //Pure sigmoid
    return 1 / (1 + Math.pow(Math.E, -t));
}

function difficulty(t, a, b) { //Sigmoidal difficulty curve
    return a * (sigmoid(b * (t - 1)) - 0.5) + 1;
}

function deathPaddle(t, a, b) { //Value of s for linearly decreasing paddle size in death mode
    return Math.PI * (-a * (t - 10) + b);
}

function square(x) { //Square a value
    return x * x;
}

function cube(x) { //Cube a value, requires square
    return x * square(x);
}

function fourth(x) { //Fourth a value, requires cube
    return x * cube(x);
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

Vector.prototype.add = function (vector) {
    this.x += vector.x; //Add x values
    this.y += vector.y; //Add y values
};



//Position to Vector (accounts for relative to centre of circle)
function GetX(r, t) { //Get x from R and angle
    return r * Math.cos(t) + x0;
}

function GetY(r, t) { //Get y from R and angle
    return y0 - r * Math.sin(t);
}

function GetVector(r, t) { //Combine GetX and GetY
    var x = GetX(r, t);
    var y = GetY(r, t);
    return new Vector(x, y); //Set x and y values
}


//Velocity to Vector (does not need to account for relative to centre of circle)
function GetVX(r, t) { //Get vx from R and angle
    return r * Math.cos(t);
}

function GetVY(r, t) { //Get vy from R and angle
    return r * Math.sin(t);
}

function GetVectorV(r, t) { //Combine GetVX and GetVY
    var x = GetVX(r, t);
    var y = GetVY(r, t);
    return new Vector(x, y); //Set x and y values
}



//Position to polar
Vector.prototype.getRadius = function () { //Add as function of particular vector property eg something.vector.getRadius
    return Math.sqrt((this.x - x0) * (this.x - x0) + (this.y - y0) * (this.y - y0)); //Get absolute accounting for relative to centre of circle
};

Vector.prototype.getAngle = function () { //Add as function of particular vector property eg something.vector.getAngle
    return Math.atan2((y0 - this.y), (this.x - x0)); //Get arctan accounting for relative to centre of circle
};


//Velocity to polar
Vector.prototype.getMagnitude = function () { //Add as function of particular vector property eg something.vector.getMagnitude
    return Math.sqrt((this.x) * (this.x) + (this.y) * (this.y)); //Get absolute not accounting for relative to centre of circle
};

Vector.prototype.getAnglev = function () { //Add as function of particular vector property eg something.vector.getAnglev
    return Math.atan2(this.y, this.x); //Get arctan not accounting for relative to centre of circle
};



//BATTON
//Define batton as an object, reading radius and angle
function Batton(r, t) {
    this.position = new Vector(GetX(r, t), GetY(r, t)); //Calculate position from radius and angle
    this.radius = r; //Add radius as a function of a batton object
    this.angle = t; //Add angle as a function of a batton object

    this.direction = 0; //Initial angular velocity

    this.lastKey = 0;

    this.size = 0.2 * Math.PI;
}

//Batton Move
Batton.prototype.move = function () { //Add move as a function unique to each batton

    //Reset direction
    this.direction = 0;

    if (this.direction != 1 && leftKeyID in keysDown && !(rightKeyID in keysDown)) { // Left only down
        this.direction = 1;
        this.lastKey = 1;
    } else if (this.direction != -1 && rightKeyID in keysDown && !(leftKeyID in keysDown)) { // Right only down
        this.direction = -1;
        this.lastKey = -1;
    } else if (rightKeyID in keysDown && leftKeyID in keysDown) { // Both directions down
        if (this.lastKey == 1) { //If left was started first
            this.direction = -1; //Move right
        } else if (this.lastKey == -1) { //If right was started first
            this.direction = 1; //Move left
        } else { //If left and right were somehow pressed at the exact same time
            this.direction = 0;
        }
    } else { //No directions down
        this.direction = 0;
        this.lastKey = 0;
    }

    this.angle += this.direction * speedScale * 0.02 * Math.PI; //Add angular velocity to angle

    //Fold the user-controlled angle into -pi to pi, to match the angle-space of the ball
    this.angle = foldAngle(this.angle);

    //GET BATTON VECTOR
    this.position = GetVector(this.radius, this.angle); //Get batton position from radius and angle

};


//BALL
//Define ball as an object, reading position and velocity vectors
function Ball(position, velocity, batton) {
    this.position = position || new Vector(x0, y0); //Set ball.position to given vector, or default to centre
    this.velocity = velocity || new Vector(0, 0); //Set ball.velocity to given vector, or default to zero

    this.positionNormalised = new Vector(this.position.x, this.position.y);
    this.normalisePosition();
    this.velocityNormalised = new Vector(this.velocity.x, this.velocity.y);
    this.normaliseVelocity();

    this.positionRadius = 0; //Initial position radius
    this.positionAngle = 0; //Initial position angle

    this.size = 0.032 * R; //Ball size radius

    this.velocityRadius = 0; //Initial velocity magnitude
    this.velocityAngle = 0; //Initial velocity angle

    this.batton = batton; //Attached batton object
}

//Generic function to test for collision between a ball and a batton
function testCollision(ball, batton) {
    //If within batton angle AND on our outside inner boundary (collision)
    var battonLeft = batton.angle + 0.5 * batton.size;
    var battonRight = batton.angle - 0.5 * batton.size;

    if (battonLeft > Math.PI) { //If left of batton is over the pi-line
        var angleTest = (-Math.PI < ball.positionAngle && ball.positionAngle < battonLeft - 2 * Math.PI) || (battonRight < ball.positionAngle && ball.positionAngle < Math.PI)
    } else if (battonRight < -Math.PI) { //If right of batton is under the pi-line
        var angleTest = (-Math.PI < ball.positionAngle && ball.positionAngle < battonLeft) || (battonRight + 2 * Math.PI < ball.positionAngle && ball.positionAngle < Math.PI)
    } else { //If away from the pi-line
        var angleTest = battonRight < ball.positionAngle && ball.positionAngle < battonLeft;
    }

    var radiusTest = ball.positionRadius >= R - ball.size;

    if (!godMode) { //If not in god mode
        return (angleTest && radiusTest);
    } else { //If in god mode
        return radiusTest //Ignore angle test
    }
}

//Ball Move
Ball.prototype.move = function () {

    this.positionRadius = this.position.getRadius(); //Set radius calculated from position
    this.positionAngle = this.position.getAngle(); //Set position angle calculated from position
    this.velocityRadius = this.velocity.getMagnitude(); //Set velocity magnitude calculated from velocity vector
    this.velocityAngle = this.velocity.getAnglev(); //Set velocity angle calculated from velocity vector

    //Update position
    if (bounds(this)) {
        this.position.x += speedScale * this.velocity.x;
        this.position.y += speedScale * this.velocity.y;
    }

    //Normalised positions for rescaling canvas
    this.positionNormalised.x = (this.position.x - x0) / R;
    this.positionNormalised.y = (this.position.y - y0) / R;

    //Normalised velocities for rescaling canvas
    this.velocityNormalised.x = (this.velocity.x) / R;
    this.velocityNormalised.y = (this.velocity.y) / R;

};

//Renormalise position accounting for changes in the canvas size
Ball.prototype.normalisePosition = function () {
    this.position.x = R * this.positionNormalised.x + x0;
    this.position.y = R * this.positionNormalised.y + y0;
}

//Renormalise velocity accounting for changes in the canvas size
Ball.prototype.normaliseVelocity = function () {
    this.velocity.x = R * this.velocityNormalised.x;
    this.velocity.y = R * this.velocityNormalised.y;
    this.velocityRadius = this.velocity.getMagnitude()
}

// OUT OF BOUNDS HANDLING (GAME OVER)
function bounds(ball) {
    //If not within outer circle boundary
    if (ball.positionRadius > R + (1.5 * speedScale * ball.velocityRadius)) {
        soundMiss.play() //Play collision SFX
        if (gameStarted = true) {
            gameOver = true; //Flag gameOver
        }
        return false
    } else {
        return true
    }
}

// COLLISION HANDLING
function collisions(ball, batton) {

    if (testCollision(ball, batton)) { //If ball has colided with batton, or godMode is on

        console.log(batton.direction)

        if ((hits + 1) % 10 == 0) { //If going up a level
            soundShallow.play() //Play shallow collision SFX
        } else {
            soundHit.play() //Play collision SFX
        }

        if ((absolute(Math.cos(ball.velocityAngle + ball.positionAngle))) > 0.5) { //For steep angles
            //Calculate new physical velocity angle, plus component due to batton movement, plus small random component
            ball.velocityAngle = Math.PI - ball.velocityAngle - 2 * ball.positionAngle - batton.direction * 0.3 * cube(absolute(Math.cos(ball.velocityAngle + ball.positionAngle))) + (Math.random() - 0.5) * 0.2 * Math.PI;
        } else { //For shallow angles
            if (absolute(ball.positionAngle) > 0.6 * Math.PI) { //For left half
                //Calculate new physical velocity angle, minus small random component opposing natural velocity (deflect away from edge)
                ball.velocityAngle = Math.PI - ball.velocityAngle - 2 * ball.positionAngle - (ball.velocityAngle / absolute(ball.velocityAngle)) * (Math.random() * 0.5 * Math.PI + 0.3);
            } else { //For right half
                //Calculate new physical velocity angle, plus small random component opposing natural velocity (deflect away from edge)
                ball.velocityAngle = Math.PI - ball.velocityAngle - 2 * ball.positionAngle + (ball.velocityAngle / absolute(ball.velocityAngle)) * (Math.random() * 0.5 * Math.PI + 0.3);
            }

        } //For shallow angles

        ball.velocity = GetVectorV(ball.velocityRadius, ball.velocityAngle); //Update velocity vector after collision, from magnitude and angle

        if (ball.positionRadius > R - ball.size) { //If position is greater than inner boundary
            ball.positionRadius = R - ball.size - ball.velocityRadius; //Set radius to within inner boundary (prevent getting stuck outside)
            ball.position = GetVector(ball.positionRadius, ball.positionAngle); //Set new position in x and y
        }

        hits += 1; //Add one hit on collision
    }
}

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

// Create objects for game
var battonMain = new Batton(R, 0.5 * Math.PI); // Make a new batton at top of circle
var ballMain = new Ball(Vector(x0, y0), Vector(0, 0), battonMain) // New ball

//ANIMATION SEQUENCE
function loop(now) {

    //Run main loop
    clear();
    update(ballMain, battonMain); //Update all positions
    collisions(ballMain, battonMain); //Handle ball-batton collisions
    draw(ballMain, battonMain); //Redraw in new positions

    queue();

    //Get FPS and speedScale
    fps = calculateFps(now);
    fpsScale = 60 / fps;
    level = Math.round((hits + 5) / 10);

    //Set speedScale by FPS and level increments
    speedScale = fpsScale * difficulty(level, 1.4, 0.3);

    //Check focus
    if (gameStarted && !gamePaused && (!document.hasFocus() || escKeyID in keysDown)) { //If started, not paused, and (not in focus or escape pressed)
        pauseGame();
    }
}

//CLEAR CANVAS ON EVERY FRAME
function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//STARTS GAME
function startgame(ball) {
    ball.velocity = new Vector(0.0, -0.024 * R); //Give ball an initial velocity
    gameStarted = 1; //Set game as started
    gameOver = 0; //Clear gameOver flag
}

//START GAME TIMER
function startTimer(delay, step, ball, batton) {
    startTimerValue = delay;
    soundHit.play() //Play collision SFX

    console.log("STARTING TIMER")
    startTimerActive = true; //Flag startTimer as started

    var startTimer = setInterval(function () {
        startTimerValue--;
        if (startTimerValue <= 0) { //If at zero
            startTimerActive = false; //Stop startTimer
            soundMiss.play() //Play shallow collision SFX (for lack of a dedicated SFX for game starting)

            startgame(ball, batton)
            console.log("PLAY")
            clearInterval(startTimer);
        } else { //If not zero
            console.log(startTimerValue)
            soundHit.play() //Play collision SFX
        }
    }, step);
}

var startTimerActive = false; //Has countdown started
var startTimerValue = 0; //Countdown value

//UNPAUSE TIMER
function pauseTimer(delay, step) {
    pauseTimerValue = delay;
    soundHit.play() //Play collision SFX

    console.log("STARTING UNPAUSE TIMER")
    pauseTimerActive = true; //Flag startTimer as started

    var pauseTimer = setInterval(function () {
        pauseTimerValue--;
        if (pauseTimerValue <= 0) { //If at zero
            pauseTimerActive = false; //Stop pauseTimer
            soundMiss.play() //Play shallow collision SFX (for lack of a dedicated SFX for game starting)

            gamePaused = false; //Unpause
            console.log("PLAY")
            clearInterval(pauseTimer);
        } else { //If not zero
            console.log(pauseTimerValue)
            soundHit.play() //Play collision SFX
        }
    }, step);
}

var pauseTimerActive = false; //Has countdown started
var pauseTimerValue = 0; //Countdown value

var gameStartable = true; //Can the game be started? (After gameOver, all keys must be released for this to be 1)

//Refresh score variables
function refreshScores() {
    monoDB.fetchScore("01", function (score) { //Fetch score stored in position "01" (high score)
        topScore = score; //Write DB response to topScore variable
    });
}

//Handle gameover
function gameover(ball, batton) {
    //Stop ball motion
    ball.velocity.x = 0; //Reset vx
    ball.velocity.y = 0; //Reset vy

    //Clear keys down
    keysDown = {};

    //Clear flags
    gameStarted = false; //Stop game
    gameStartable = false; //Lock game out of starting

    if (hits > topScore) { //If score beats current best
        monoDB.updateScore("01", hits, function () { //Update score stored in position "01" (high score)
            refreshScores()
        })
        //topScore = hits; //Update topScore
    }
}

//Update objects
function update(ball, batton) {

    if (!gameStarted) { //If game hasn't started

        if (!gameOver) { //If not on gameovger screen, keep recalculating ball center position
            ball.position.x = x0; //Reset x
            ball.position.y = y0; //Reset y
        }

        if (!gameStartable && isEmpty(keysDown)) { //If game isn't startable, wait for all keys to be released then make startable
            console.log("Making game startable")
            gameStartable = true; //Make game startable once all keys have been let go of
        }

        if (gameStartable && (enterKeyID in keysDown || leftKeyID in keysDown || rightKeyID in keysDown)) { // If game is startable AND any key is pressed

            //Reset game
            ball.position.x = x0; //Reset x
            ball.position.y = y0; //Reset y

            hits = 0; //Reset score

            battonMain.angle = 0.5 * Math.PI; //Reset Batton

            //Start timer
            if (!startTimerActive) { // If startTimer hasn't already started
                startTimer(3, 1000, ball, batton) //Start startTimer
            }
        }
    } else { // If game has started

        if (gameOver) { //If gameOver
            gameover(ball, batton)
        } else if (gamePaused) {
            if (gameStarted && (enterKeyID in keysDown || leftKeyID in keysDown || rightKeyID in keysDown)) { // If game has started AND any key is pressed 
                if (!pauseTimerActive) {
                    console.log("STARTING UNPAUSE TIMER")
                    pauseTimer(3, 500) //Start startTimer
                }
            }
        } else { //If not gameover, and not paused

            // DEATH MODE
            if (20 < level && level <= 30) { // If in stage 2
                batton.size = deathPaddle(level - 20, 0.01, 0.1);
            }

            //BATTON MOTION
            batton.move();
            //BALL MOTION
            ball.move();
        }

        //Rescale position and velocity if canvas dimensions change
        ball.normaliseVelocity();
        ball.normalisePosition();
        /*
        I'll be real here, the velocity rescaling works a treat if the game is paused when the resizing happens,
        but for some reason, and I've no idea why, it doesn't work at all if you rescale while the game is active.
        As a hacky solution that superficially looks like a feature, the resizeCanvas function, which gets
        called any time the window is resized, also pauses the game automatically. This is genuinely useful on 
        mobile, as screen rotation pauses the game, but that's a side effect of debugging laziness.
        */

    }
}

function draw(ball, batton) { //DRAW FRAME

    //Calculate text sizes
    fontTitle = "normal " + 0.20 * R + "px monospace";
    fontBig = "normal " + 0.15 * R + "px monospace";
    fontMedium = "normal " + 0.08 * R + "px monospace";
    fontSmall = "normal " + 0.062 * R + "px monospace";

    //Recalculate ball size
    ball.size = 0.032 * R;

    //Set ring colour
    if (gameOver && !startTimerActive) { //If gameOver and startTimer not started
        ringColour = '#FF0000';
    } else if (gamePaused && !pauseTimerActive) {
        ringColour = '#FFFFFF';
    } else if (startTimerActive || pauseTimerActive || (!gameOver && !gameStarted)) { //If any timer started, or not gameOver but game not started (ie first run)
        ringColour = '#bc7a00';
    } else { //If game is running
        if (level <= 5) {
            ringColour = '#00bca6';
        } else {
            ringColour = '#505050'; //Make decoration gray after level 10
        }
    }

    // Draw ring below level 6
    if (level <= 5) {
        ctx.beginPath();
        ctx.arc(x0, y0, R, 0, 2 * Math.PI);
        ctx.lineWidth = 0.01 * R;
        ctx.strokeStyle = ringColour;
        ctx.stroke();
    }

    //Draw batton decoration below level 11
    if (level <= 10) {
        ctx.beginPath();
        ctx.arc(x0, y0, 1.012 * R, batton.angle - 1.5 * batton.size, batton.angle + 1.5 * batton.size);
        ctx.lineWidth = 0.025 * R;
        ctx.strokeStyle = ringColour;
        ctx.stroke();
    }

    //Velocity indicator
    if (gamePaused) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(ball.position.x - 3 * ball.velocity.x, ball.position.y - 3 * ball.velocity.y, ball.size, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(ball.position.x - 6 * ball.velocity.x, ball.position.y - 6 * ball.velocity.y, ball.size, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.globalAlpha = 1.0;
    }

    //Ball
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(ball.position.x, ball.position.y, ball.size, 0, 2 * Math.PI, false);
    ctx.fill();

    //Batton
    ctx.beginPath();
    ctx.arc(x0, y0, 1.015 * R, -batton.angle - 0.5 * batton.size, -batton.angle + 0.5 * batton.size);
    ctx.lineWidth = 0.035 * R;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    //Title
    if (!gameStarted) { //If game hasn't started

        ctx.fillStyle = "#ffffff";

        if (!startTimerActive) { //If countdown hasn't started
            ctx.textAlign = "center";

            ctx.font = fontMedium;
            ctx.fillText("TOUCH/ENTER TO START", x0, y0 + (0.18 * R));

            if (!gameOver) {
                ctx.font = fontSmall;
                ctx.fillText("TOUCH LEFT/RIGHT OF DISPLAY", x0, y0 + (0.30 * R));
                ctx.fillText("OR USE LEFT/RIGHT KEYS TO MOVE", x0, y0 + (0.38 * R));

                ctx.font = fontTitle;
                ctx.fillText("MONOPONG", x0, y0 - (0.28 * R));
                ctx.font = fontMedium;
                ctx.fillText(VERSION, x0, y0 - (0.14 * R));
            }
        } else {
            ctx.font = fontTitle;
            ctx.textAlign = "center";
            ctx.fillText(startTimerValue, x0, y0 - (0.28 * R));
        }
    }

    //Gameover screen
    if (gameOver && !startTimerActive) {
        ctx.font = fontBig;
        ctx.fillText("GAME OVER", x0, y0 - (0.28 * R));

        ctx.font = fontMedium;
        ctx.fillText("SCORE: " + hits, x0, y0 - (0.14 * R));
    }

    //Pause screen
    if (gamePaused) {
        ctx.textAlign = "center";

        ctx.font = fontMedium;
        ctx.fillText("TOUCH/ENTER TO START", x0, y0 + (0.18 * R));

        if (pauseTimerActive) { //If unpause timer has started
            ctx.textAlign = "center";

            ctx.font = fontTitle;
            ctx.fillText(pauseTimerValue, x0, y0 - (0.28 * R));
        } else { //If paused, and unpause timer not started
            ctx.font = fontBig;
            ctx.fillText("PAUSED", x0, y0 - (0.28 * R));
        }
    }

    //Score
    ctx.font = fontSmall;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText("Level: " + level, (0.18 * R), (0.18 * R));
    ctx.fillText("Hits: " + hits, (0.18 * R), (0.30 * R));
    ctx.fillText("Highscore: " + topScore, (0.18 * R), (0.42 * R));
}

function queue() { //GET NEW FRAME
    window.requestAnimationFrame(loop);
}

window.onload = function () {
    // Start the game
    monoDB.open(refreshScores);
    loop(); //Run animation loop
}