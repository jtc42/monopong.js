export var monoDB = (function() {
    var mDB = {};
    var datastore = null;

    mDB.open = function(callback) {
        // Database version.
        var version = 1;

        console.log("Opening IndexedDB database")
      
        // Open a connection to the datastore.
        var request = indexedDB.open('monopongScores', version);
      
        // Handle datastore upgrades.
        request.onupgradeneeded = function(e) {
          var db = e.target.result;
      
          e.target.transaction.onerror = mDB.onerror;
      
          // Delete the old datastore.
          if (db.objectStoreNames.contains('scores')) {
            db.deleteObjectStore('scores');
          }
      
          // Create a new datastore.
          var store = db.createObjectStore('scores', {
            keyPath: 'position'
          });
        };
      
        // Handle successful datastore access.
        request.onsuccess = function(e) {
          // Get a reference to the DB.
          datastore = e.target.result;
      
          // Execute the callback.
          callback();
        };
      
        // Handle errors when opening the datastore.
        request.onerror = mDB.onerror;
    };

    mDB.fetchScore = function(id, callback) {
        var db = datastore;
        var transaction = db.transaction(['scores'], 'readwrite');
        var objStore = transaction.objectStore('scores');

        var request = objStore.get(id);

        var score = 0;

        transaction.oncomplete = function(e) {
            // Execute the callback function.
            callback(score);
        };

        request.onsuccess = function(e) {
            if (request.result === undefined) {
                mDB.createScore(id, 0, function() { // Create zero high score
                    mDB.fetchScore(id, callback) // Call back to fetch again
                })  
            } else {
                score = request.result.score;
                console.log("Fetched score:")
                console.log(score)
            }
        }
    }

    mDB.updateScore = function(id, hits, callback) {
        var db = datastore;
        var transaction = db.transaction(['scores'], 'readwrite');
        var objStore = transaction.objectStore('scores');

        var request = objStore.get(id);

        request.onsuccess = function(e) {
            var data = e.target.result;

            data.score = hits;

            // Put this updated object back into the database.
            var requestUpdate = objStore.put(data);
            requestUpdate.onerror = function(e) {
                // TODO: Do something with the error
            };
            requestUpdate.onsuccess = function(e) {
                // Execute the callback function.
                callback();
            };
        }
    }

    mDB.createScore = function(id, hits, callback) {
        console.log("Creating new high score")

        // Get a reference to the db.
        var db = datastore;
      
        // Initiate a new transaction.
        var transaction = db.transaction(['scores'], 'readwrite');
      
        // Get the datastore.
        var objStore = transaction.objectStore('scores');
      
        // Create an object for the todo item.
        var score = {
          'score': hits,
          'position': id
        };
      
        // Create the datastore request.
        var request = objStore.put(score);
      
        // Handle a successful datastore put.
        request.onsuccess = function(e) {
          // Execute the callback function.
          callback();
        };
      
        // Handle errors.
        request.onerror = mDB.onerror;
    };

    mDB.deleteScore = function(id, callback) {
        var db = datastore;
        var transaction = db.transaction(['scores'], 'readwrite');
        var objStore = transaction.objectStore('scores');
      
        var request = objStore.delete(id);
      
        request.onsuccess = function(e) {
          callback();
        }
      
        request.onerror = function(e) {
          console.log(e);
        }
    };
  
    // Export the mDB object.
    return mDB;
}());