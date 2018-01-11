/*
 * Submission scoreboard functionalities.
 */

var scoreboard_spinner; 

$(document).ready(function() {
  // Initialize firebase.
  /*var config = {
    apiKey: "AIzaSyCvVMjlA_Gsh2xqukgSNN5AdFevJjCv9lU",
    authDomain: "bps-scorer.firebaseapp.com",
    databaseURL: "https://bps-scorer.firebaseio.com",
    projectId: "bps-scorer",
    storageBucket: "bps-scorer.appspot.com",
    messagingSenderId: "473750220771"
  };*/
  var config = {
    apiKey: "AIzaSyA755g5_Ic74tNnjjC9J2-R0AzgAFwm-rs",
    authDomain: "bps-otc.firebaseapp.com",
    databaseURL: "https://bps-otc.firebaseio.com",
    projectId: "bps-otc",
    storageBucket: "bps-otc.appspot.com",
    messagingSenderId: "627522842012"
  };
  firebase.initializeApp(config);

  // Get a reference to the database service.
  database = firebase.database();
  var data = [];

  // Retrieve current scores and attach listener.
  firebase.database().ref('/bps-otc/').once('value').then(function(snapshot) {
    snapshot.forEach(function(childSnapshot) { data.push(childSnapshot.val()); });
    scoreboard_update(scoreboard, data); // Construct and show datatable.
  });

  scoreboard = scoreboard_create();
  $('#scoreboard_container').fadeTo(100, 0.5);
  scoreboard_spinner = new Spinner().spin(document.getElementById('scoreboard'));
});

function scoreboard_update(scoreboard, data) {
  scoreboard.clear();
  for (var i = 0 ; i < data.length; i++) {
    data[i]["name_team"] = data[i]["value_approved"] ? data[i]["name_team"]: "Pending Approval"
    data[i] = $.map(data[i], function(el) { return el });
  }
  scoreboard.rows.add(data);

  scoreboard.draw();
  $('#scoreboard_container').fadeTo(100, 1);
  scoreboard_spinner.stop();
}

function scoreboard_create() {
  var scoreboard = $('#scoreboard').DataTable({
    data: [],
    columns: [
      {title: "Date"},
      {title: "Submitter"},
      {title: "Number of Buses"},
      {title: "Total Distance Travelled by All Buses"}
    ],
    "order": [[3, "desc"]]
  });
  return scoreboard;
}

function scoreboard_add(submitter_name,buses, miles) {
  // Change this: https://console.firebase.google.com/project/bps-otc/database/rules if facing security issues.
  // { "rules": { ".read":true, ".write":true } }
  // Update table.
  firebase.database().ref().child('bps-otc').push({
    date: "2017-07-13",
    name_team: submitter_name,
    num_buses: buses,
    num_miles: miles,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    value_approved: false,
  }).then(function(snapshot) {
    // Read data to update table again.
    firebase.database().ref('/bps-otc/').once('value').then(function(snapshot) {
      var data = []
      snapshot.forEach(function(childSnapshot) {
        var childData = childSnapshot.val();
        data.push(childData);
      });
      scoreboard_update(scoreboard, data);
    });
  });
}

function prepareSubmitData(){
  if(($("#submit")[0]).classList.contains('disabled')){
    return;
  }
  console.log("preparing data to submit");
  var miles = $("#miles")[0].innerHTML;
  var buses = $("#buses")[0].innerHTML;
  var name = $("#submitter_name")[0].value;
  scoreboard_add(name, buses, miles);

}
