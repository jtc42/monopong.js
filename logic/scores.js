import {
    monoDB
} from '../db.js'

//Refresh score variables
export function refreshScores(playarea) {
    monoDB.fetchScore("01", function (score) { //Fetch score stored in position "01" (high score)
        playarea.topScore = score; //Write DB response to topScore variable
    });
}