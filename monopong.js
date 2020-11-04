import {
    PlayArea
} from './objects/playarea.js'
import {
    leftKeyID,
    rightKeyID,
    escKeyID,
    difficulty
} from './logic/basics.js'

var VERSION = "delta"

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

//Function to recalculate all dimensions
function resizeCanvas() {
    //Pause game immediately
    if (playareaMain.gameStarted && !playareaMain.gamePaused) {
        playareaMain.pauseGame()
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
    playareaMain.update(); //Update all positions
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
        playareaMain.pauseGame();
    }
}

//CLEAR CANVAS ON EVERY FRAME
function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function regularPolygon(ctx, x, y, radius, sides) {
    if (sides < 3) return;
    ctx.beginPath();
    var a = ((Math.PI * 2)/sides);
    ctx.translate(x,y);
    ctx.moveTo(radius,0);
    for (var i = 1; i < sides; i++) {
        ctx.lineTo(radius*Math.cos(a*i),radius*Math.sin(a*i));
    }
    ctx.closePath();
    ctx.translate(-x,-y);
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
        ringColour = '#FF0000';
    } else if (playarea.gamePaused && !playarea.pauseTimerActive) {
        ringColour = '#FFFFFF';
    } else if (playarea.startTimerActive || playarea.pauseTimerActive || (!playarea.gameOver && !playarea.gameActive)) { //If any timer started, or not gameOver but game not started (ie first run)
        ringColour = '#ff7700';
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
        ctx.shadowColor = ringColour;
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
    ctx.arc(playarea.x0, playarea.y0, 1.012 * playarea.R, -playarea.batton.angle - 0.5 * playarea.batton.size, -playarea.batton.angle + 0.5 * playarea.batton.size);
    ctx.lineWidth = 0.035 * playarea.R;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    //Title
    if (!playarea.gameActive) { //If game hasn't started

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
    // ctx.fillText("Batton: " + playarea.batton.angle, (0.18 * playarea.R), (0.54 * playarea.R));
    // ctx.fillText("Ball: " + playarea.ball.positionAngle + ", " + playarea.ball.positionRadius, (0.18 * playarea.R), (0.66 * playarea.R));
}

function queue() { //GET NEW FRAME
    window.requestAnimationFrame(loop);
}

window.onload = function () {
    loop(); //Run animation loop
}
