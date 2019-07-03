import {
    Vector
} from './objects/vector.js'
import {
    PlayArea
} from './objects/playarea.js'
import {
    soundHit,
    soundShallow,
    soundMiss
} from './objects/sounds.js'
import {
    leftKeyID,
    rightKeyID,
    enterKeyID,
    escKeyID,
    absolute,
    cube,
    difficulty,
    GetVector,
    GetVectorV,
    isEmpty
} from './logic/basics.js'
import {
    refreshScores
} from './logic/scores.js'

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

const playareaMain = new PlayArea(viewWidth, viewHeight)

//General pause function
function pauseGame(playarea) {
    soundShallow.play() //Play shallow collision SFX (for lack of a dedicated SFX for game pausing)
    playarea.gamePaused = true;
}

//Function to recalculate all dimensions
function resizeCanvas() {
    //Pause game immediately
    if (playareaMain.gameStarted && !playareaMain.gamePaused) {
        pauseGame(playareaMain)
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
    playareaMain.calculateDims(viewWidth, viewHeight);
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
addEventListener("keydown", function (e) {
    playareaMain.keysDown[e.keyCode] = true; //Add key to array
}, false);

addEventListener("keyup", function (e) {
    delete playareaMain.keysDown[e.keyCode]; //Remove key from array
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
        playareaMain.keysDown[leftKeyID] = true; //Add key to array (emulates a keyboard keypress)
    } else {
        playareaMain.keysDown[rightKeyID] = true; //Add key to array (emulates a keyboard keypress)
    }

}, false);

canvas.addEventListener("touchend", function (e) {
    if (mousePos['x'] < x0) {
        delete playareaMain.keysDown[leftKeyID]; //Remove key from array (emulates a keyboard key release)
    } else {
        delete playareaMain.keysDown[rightKeyID]; //Remove key from array (emulates a keyboard key release)
    }
}, false);

// BASIC FUNCTIONS


//Generic function to test for collision between a ball and a batton
// TODO: Move to playarea method?
function testCollision(playarea) {
    //If within batton angle AND on our outside inner boundary (collision)
    var battonLeft = playarea.batton.angle + 0.5 * playarea.batton.size;
    var battonRight = playarea.batton.angle - 0.5 * playarea.batton.size;

    if (battonLeft > Math.PI) { //If left of batton is over the pi-line
        var angleTest = (-Math.PI < playarea.ball.positionAngle && playarea.ball.positionAngle < battonLeft - 2 * Math.PI) || (battonRight < playarea.ball.positionAngle && playarea.ball.positionAngle < Math.PI)
    } else if (battonRight < -Math.PI) { //If right of batton is under the pi-line
        var angleTest = (-Math.PI < playarea.ball.positionAngle && playarea.ball.positionAngle < battonLeft) || (battonRight + 2 * Math.PI < playarea.ball.positionAngle && playarea.ball.positionAngle < Math.PI)
    } else { //If away from the pi-line
        var angleTest = battonRight < playarea.ball.positionAngle && playarea.ball.positionAngle < battonLeft;
    }

    var radiusTest = playarea.ball.positionRadius >= playarea.R - playarea.ball.size;

    if (!playarea.godMode) { //If not in god mode
        return (angleTest && radiusTest);
    } else { //If in god mode
        return radiusTest //Ignore angle test
    }
}



// COLLISION HANDLING
// TODO: Move to playarea method?
function collisionHandler(playarea) {

    if (testCollision(playarea)) { //If ball has colided with batton, or godMode is on

        console.log("Collision detected!")
        console.log(playarea.batton.direction)

        if ((playarea.hits + 1) % 10 == 0) { //If going up a level
            soundShallow.play() //Play shallow collision SFX
        } else {
            soundHit.play() //Play collision SFX
        }

        if ((absolute(Math.cos(playarea.ball.velocityAngle + playarea.ball.positionAngle))) > 0.5) { //For steep angles
            //Calculate new physical velocity angle, plus component due to batton movement, plus small random component
            console.log("Steep angle")
            playarea.ball.velocityAngle = Math.PI - playarea.ball.velocityAngle - 2 * playarea.ball.positionAngle - playarea.batton.direction * 0.3 * cube(absolute(Math.cos(playarea.ball.velocityAngle + playarea.ball.positionAngle))) + (Math.random() - 0.5) * 0.2 * Math.PI;
        } else { //For shallow angles
            console.log("Shallow angle")
            if (absolute(playarea.ball.positionAngle) > 0.6 * Math.PI) { //For left half
                //Calculate new physical velocity angle, minus small random component opposing natural velocity (deflect away from edge)
                playarea.ball.velocityAngle = Math.PI - playarea.ball.velocityAngle - 2 * playarea.ball.positionAngle - (playarea.ball.velocityAngle / absolute(playarea.ball.velocityAngle)) * (Math.random() * 0.5 * Math.PI + 0.3);
            } else { //For right half
                //Calculate new physical velocity angle, plus small random component opposing natural velocity (deflect away from edge)
                playarea.ball.velocityAngle = Math.PI - playarea.ball.velocityAngle - 2 * playarea.ball.positionAngle + (playarea.ball.velocityAngle / absolute(playarea.ball.velocityAngle)) * (Math.random() * 0.5 * Math.PI + 0.3);
            }

        } //For shallow angles

        console.log("Initial ball velocity: " + playarea.ball.velocity.vector())
        playarea.ball.velocity = GetVectorV(playarea.ball.velocityRadius, playarea.ball.velocityAngle); //Update velocity vector after collision, from magnitude and angle
        console.log("Final ball velocity: " + playarea.ball.velocity.vector())

        if (playarea.ball.positionRadius > playarea.R - playarea.ball.size) { //If position is greater than inner boundary
            playarea.ball.positionRadius = playarea.R - playarea.ball.size - playarea.ball.velocityRadius; //Set radius to within inner boundary (prevent getting stuck outside)
            playarea.ball.position = GetVector(playarea.ball.positionRadius, playarea.ball.positionAngle, playarea.x0, playarea.y0); //Set new position in x and y
        }

        playarea.hits += 1; //Add one hit on collision
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

//ANIMATION SEQUENCE
function loop(now) {

    //Run main loop
    clear();
    update(playareaMain); //Update all positions
    collisionHandler(playareaMain); //Handle ball-batton collisions
    draw(playareaMain); //Redraw in new positions

    queue();

    //Get FPS and speedScale
    var fps = calculateFps(now);
    var fpsScale = 60 / fps;
    playareaMain.level = Math.round((playareaMain.hits + 5) / 10);

    //Set speedScale by FPS and level increments
    playareaMain.speedScale = fpsScale * difficulty(playareaMain.level, 1.4, 0.3);

    //Check focus
    if (playareaMain.gameStarted && !playareaMain.gamePaused && (!document.hasFocus() || escKeyID in playareaMain.keysDown)) { //If started, not paused, and (not in focus or escape pressed)
        pauseGame(playareaMain);
    }
}

//CLEAR CANVAS ON EVERY FRAME
function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

//Update objects
// TODO: Move to playarea method?
function update(playarea) {

    if (!playarea.gameStarted) { //If game hasn't started

        if (!playarea.gameOver) { //If not on gameovger screen, keep recalculating ball center position
            playarea.ball.position.x = playarea.x0; //Reset x
            playarea.ball.position.y = playarea.y0; //Reset y
        }

        if (!playarea.gameStartable && isEmpty(playarea.keysDown)) { //If game isn't startable, wait for all keys to be released then make startable
            playarea.gameStartable = true; //Make game startable once all keys have been let go of
        }

        if (playarea.gameStartable && (enterKeyID in playarea.keysDown || leftKeyID in playarea.keysDown || rightKeyID in playarea.keysDown)) { // If game is startable AND any key is pressed

            //Reset game
            playarea.ball.position.x = playarea.x0; //Reset x
            playarea.ball.position.y = playarea.y0; //Reset y

            playarea.hits = 0; //Reset score

            playarea.batton.angle = 0.5 * Math.PI; //Reset Batton

            //Start timer
            if (!playarea.startTimerActive) { // If startTimer hasn't already started
                playarea.startGameTimer(3, 1000) //Start startTimer
            }
        }

    } else { // If game has started

        if (playarea.gameOver) { //If gameOver state is active
            playarea.gameOverHandler() // Run gameover function
        } else if (playarea.gamePaused) {
            if (playarea.gameStarted && (enterKeyID in playarea.keysDown || leftKeyID in playarea.keysDown || rightKeyID in playarea.keysDown)) { // If game has started AND any key is pressed 
                if (!playarea.pauseTimerActive) {
                    console.log("STARTING UNPAUSE TIMER")
                    playarea.resumeGameTimer(3, 500) //Start startTimer
                }
            }
        } else { //If not gameover, and not paused

            // DEATH MODE
            if (20 < playarea.level && playarea.level <= 30) { // If in stage 2
                playarea.batton.size = deathPaddle(playarea.level - 20, 0.01, 0.1);
            }

            //BATTON MOTION
            playarea.batton.move();
            //BALL MOTION
            playarea.ball.move();
        }

        //Rescale position and velocity if canvas dimensions change
        playarea.ball.normaliseVelocity();
        playarea.ball.normalisePosition();
        /*
        I'll be real here, the velocity rescaling works a treat if the game is paused when the resizing happens,
        but for some reason, and I've no idea why, it doesn't work at all if you rescale while the game is active.
        As a hacky solution that superficially looks like a feature, the resizeCanvas function, which gets
        called any time the window is resized, also pauses the game automatically. This is genuinely useful on 
        mobile, as screen rotation pauses the game, but that's a side effect of debugging laziness.
        */

    }
}

function draw(playarea) { //DRAW FRAME

    //Calculate text sizes
    var fontTitle = "normal " + 0.20 * playarea.R + "px monospace";
    var fontBig = "normal " + 0.15 * playarea.R + "px monospace";
    var fontMedium = "normal " + 0.08 * playarea.R + "px monospace";
    var fontSmall = "normal " + 0.062 * playarea.R + "px monospace";

    var ringColour = '#00bca6';

    //Recalculate ball size
    playarea.ball.size = 0.032 * playarea.R;

    //Set ring colour
    if (playarea.gameOver && !playarea.startTimerActive) { //If gameOver and startTimer not started
        // TODO: Ringcolour to playerea
        ringColour = '#FF0000';
    } else if (playarea.gamePaused && !playarea.pauseTimerActive) {
        ringColour = '#FFFFFF';
    } else if (playarea.startTimerActive || playarea.pauseTimerActive || (!playarea.gameOver && !playarea.gameStarted)) { //If any timer started, or not gameOver but game not started (ie first run)
        ringColour = '#bc7a00';
    } else { //If game is running
        if (playarea.level <= 5) {
            ringColour = '#00bca6';
        } else {
            ringColour = '#505050'; //Make decoration gray after level 10
        }
    }

    // Draw ring below level 6
    if (playarea.level <= 5) {
        ctx.beginPath();
        ctx.arc(playarea.x0, playarea.y0, playarea.R, 0, 2 * Math.PI);
        ctx.lineWidth = 0.01 * playarea.R;
        ctx.strokeStyle = ringColour;
        ctx.stroke();
    }

    //Draw batton decoration below level 11
    if (playarea.level <= 10) {
        ctx.beginPath();
        ctx.arc(playarea.x0, playarea.y0, 1.012 * playarea.R, playarea.batton.angle - 1.5 * playarea.batton.size, playarea.batton.angle + 1.5 * playarea.batton.size);
        ctx.lineWidth = 0.025 * playarea.R;
        ctx.strokeStyle = ringColour;
        ctx.stroke();
    }

    //Velocity indicator
    if (playarea.gamePaused) {
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(playarea.ball.position.x - 3 * playarea.ball.velocity.x, playarea.ball.position.y - 3 * playarea.ball.velocity.y, playarea.ball.size, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(playarea.ball.position.x - 6 * playarea.ball.velocity.x, playarea.ball.position.y - 6 * playarea.ball.velocity.y, playarea.ball.size, 0, 2 * Math.PI, false);
        ctx.fill();

        ctx.globalAlpha = 1.0;
    }

    //Ball
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(playarea.ball.position.x, playarea.ball.position.y, playarea.ball.size, 0, 2 * Math.PI, false);
    ctx.fill();

    //Batton
    ctx.beginPath();
    ctx.arc(playarea.x0, playarea.y0, 1.015 * playarea.R, -playarea.batton.angle - 0.5 * playarea.batton.size, -playarea.batton.angle + 0.5 * playarea.batton.size);
    ctx.lineWidth = 0.035 * playarea.R;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    //Title
    if (!playarea.gameStarted) { //If game hasn't started

        ctx.fillStyle = "#ffffff";

        if (!playarea.startTimerActive) { //If countdown hasn't started
            ctx.textAlign = "center";

            ctx.font = fontMedium;
            ctx.fillText("TOUCH/ENTER TO START", playarea.x0, playarea.y0 + (0.18 * playarea.R));

            if (!playarea.gameOver) {
                ctx.font = fontSmall;
                ctx.fillText("TOUCH LEFT/RIGHT OF DISPLAY", playarea.x0, playarea.y0 + (0.30 * playarea.R));
                ctx.fillText("OR USE LEFT/RIGHT KEYS TO MOVE", playarea.x0, playarea.y0 + (0.38 * playarea.R));

                ctx.font = fontTitle;
                ctx.fillText("MONOPONG", playarea.x0, playarea.y0 - (0.28 * playarea.R));
                ctx.font = fontMedium;
                ctx.fillText(VERSION, playarea.x0, playarea.y0 - (0.14 * playarea.R));
            }
        } else {
            ctx.font = fontTitle;
            ctx.textAlign = "center";
            ctx.fillText(playarea.timerValue, playarea.x0, playarea.y0 - (0.28 * playarea.R));
        }
    }

    //Gameover screen
    if (playarea.gameOver && !playarea.startTimerActive) {
        ctx.font = fontBig;
        ctx.fillText("GAME OVER", playarea.x0, playarea.y0 - (0.28 * playarea.R));

        ctx.font = fontMedium;
        ctx.fillText("SCORE: " + playarea.hits, playarea.x0, playarea.y0 - (0.14 * playarea.R));
    }

    //Pause screen
    if (playarea.gamePaused) {
        ctx.textAlign = "center";

        ctx.font = fontMedium;
        ctx.fillText("TOUCH/ENTER TO START", playarea.x0, playarea.y0 + (0.18 * playarea.R));

        if (playarea.pauseTimerActive) { //If unpause timer has started
            ctx.textAlign = "center";

            ctx.font = fontTitle;
            ctx.fillText(playarea.timerValue, playarea.x0, playarea.y0 - (0.28 * playarea.R));
        } else { //If paused, and unpause timer not started
            ctx.font = fontBig;
            ctx.fillText("PAUSED", playarea.x0, playarea.y0 - (0.28 * playarea.R));
        }
    }

    //Score
    ctx.font = fontSmall;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText("Level: " + playarea.level, (0.18 * playarea.R), (0.18 * playarea.R));
    ctx.fillText("Hits: " + playarea.hits, (0.18 * playarea.R), (0.30 * playarea.R));
    ctx.fillText("Highscore: " + playarea.topScore, (0.18 * playarea.R), (0.42 * playarea.R));

    // Debug
    ctx.fillText("Batton: " + playarea.batton.angle, (0.18 * playarea.R), (0.54 * playarea.R));
    ctx.fillText("Ball: " + playarea.ball.positionAngle + ", " + playarea.ball.positionRadius, (0.18 * playarea.R), (0.66 * playarea.R));
}

function queue() { //GET NEW FRAME
    window.requestAnimationFrame(loop);
}

window.onload = function () {
    loop(); //Run animation loop
}