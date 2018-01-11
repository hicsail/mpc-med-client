/**
 * Simulator for validating and evaluating a candidate routing solution.
 */

if (typeof(Number.prototype.toRad) === "undefined") {
  Number.prototype.toRad = function() { return this * Math.PI / 180; };
}
function distance(lat1, lon1, lat2, lon2) {
  var a = 6378137, b = 6356752.314245,  f = 1/298.257223563;
  var L = (lon2-lon1).toRad();
  var U1 = Math.atan((1-f) * Math.tan(lat1.toRad()));
  var U2 = Math.atan((1-f) * Math.tan(lat2.toRad()));
  var sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  var sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  var lambda = L, lambdaP, iterLimit = 100;
  do {
    var sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
    var sinSigma = Math.sqrt((cosU2*sinLambda) * (cosU2*sinLambda) + (cosU1*sinU2-sinU1*cosU2*cosLambda) * (cosU1*sinU2-sinU1*cosU2*cosLambda));
    if (sinSigma==0)
      return 0;
    var cosSigma = sinU1*sinU2 + cosU1*cosU2*cosLambda;
    var sigma = Math.atan2(sinSigma, cosSigma);
    var sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    var cosSqAlpha = 1 - sinAlpha*sinAlpha;
    var cos2SigmaM = cosSigma - 2*sinU1*sinU2/cosSqAlpha;
    if (isNaN(cos2SigmaM))
      cos2SigmaM = 0;
    var C = f/16*cosSqAlpha*(4+f*(4-3*cosSqAlpha));
    lambdaP = lambda;
    lambda = L + (1-C) * f * sinAlpha * (sigma + C*sinSigma*(cos2SigmaM+C*cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)));
  } while (Math.abs(lambda-lambdaP) > 1e-12 && --iterLimit>0);

  if (iterLimit==0) return NaN;

  var uSq = cosSqAlpha * (a*a - b*b) / (b*b);
  var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
  var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));
  var deltaSigma = B*sinSigma*(cos2SigmaM+B/4*(cosSigma*(-1+2*cos2SigmaM*cos2SigmaM)-B/6*cos2SigmaM*(-3+4*sinSigma*sinSigma)*(-3+4*cos2SigmaM*cos2SigmaM)));
  var s = b*A*(sigma-deltaSigma);
  return s;
}

function simulation_validation_error(s) {
  clusterize.append(['<tr><td style="color:firebrick;">' + s + '</td></tr>']);
}

function simulation_evaluation_success(s) {
  clusterize.append(['<tr><td style="color:green;">' + s + '</td></tr>']);
}

function simulate(workbook_js) {
  //console.log(workbook_js);
  var buses = {}, stops = {}, students = [];

  clusterize.clear();
  var today = new Date();
  var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  clusterize.append(['<tr><td>Starting simulation on ' + date + ' at ' + time + '.</td></tr>']);

  simulate_prepare(workbook_js, buses, stops, students);
}

function simulate_prepare(workbook_js, buses, stops, students) {
  clusterize.append(['<tr><td>Building <b>Buses</b> data structure.</td></tr>']);
  for (var i = 0; i < workbook_js['Book']['Buses'].length; i++) {
    var bus = workbook_js['Book']['Buses'][i];
    buses[bus['Bus ID']] = {
      'distance': 0.0,
      'lat': bus['Bus Latitude'],
      'lon': bus['Bus Longitude'],
      'yard': {'lat': bus['Bus Latitude'], 'lon': bus['Bus Longitude']},
      'capacity': bus['Bus Capacity'],
      'students': [],
      'overloaded': false
    };
  }

  clusterize.append(['<tr><td>Building <b>Stops</b> data structure.</td></tr>']);
  for (var i = 0; i < workbook_js['Book']['Stop-Assignments'].length; i++) {
    var stop = workbook_js['Book']['Stop-Assignments'][i],
        stop_id = stop['Stop Longitude']+','+stop['Stop Latitude'];
    if (!(stop_id in stops))
        stops[stop_id] = {'students': []};
    var student = {
        'boarded': false,
        'arrived': false,
        'bus_id': stop['Bus ID'],
        'school': stop['School Longitude']+','+stop['School Latitude'],
        'hash': stop['Student Longitude'].toString().concat(stop['Student Latitude']  , stop['School Longitude'].toString().substring(0,9) , stop['School Latitude'].toString().substring(0,8))
      };
    students.push(student);
    stops[stop_id].students.push(student);

  }

  //check here to match student ids and return if error

  simulate_routes(workbook_js, buses, stops, students);
}

function simulate_routes_step(buses, stops, students, bus_id_last, step) {
  var bus_id = step['Bus ID'],
      bus = buses[bus_id],
      lat = step['Waypoint Latitude'],
      lon = step['Waypoint Longitude'],
      stop_id = lon+','+lat;

  // Starting a new bus.
  if (bus_id_last == null || bus_id != bus_id_last) {
    if (lat != bus.yard.lat || lon != bus.yard.lon) {
      simulation_validation_error('Bus ' + bus_id + ' does not begin its route at its bus yard!');
    }
  }

  // Switching to a route for another bus.
  if (bus_id_last != null && bus_id_last != bus_id) { 
    var bus_last = buses[bus_id_last];
    if (bus_last.lat != bus_last.yard.lat || bus_last.lon != bus_last.yard.lon)
      simulation_validation_error('Bus ' + bus_id_last + ' did not finish its route at its bus yard!');
    if (bus_last.students.length > 0)
      simulation_validation_error('Bus ' + bus_id_last + ' did not drop off ' + bus_last.students.length + ' students!');
  }

  // Pick up students at each stop.
  if (stop_id in stops) {
    var stop = stops[stop_id], students_keep = [];
    for (var j = 0; j < stop.students.length; j++) {
      var student = stop.students[j];
      if (student.bus_id == bus_id && !student.boarded) {
        bus.students.push(student);
        student.boarded = true;
      } else {
        students_keep.push(student);
      }
    }
    stop.students = students_keep;

    if (!bus.overloaded && bus.students.length > bus.capacity) {
      simulation_validation_error('Bus ' + bus_id + ' has a capacity of ' + bus.capacity + ' but has now picked up ' + bus.students.length + ' students (ignoring any further overloading for this bus).');
      bus.overloaded = true;
    }
  }

  // Drop off students that have arrived at a school.
  var students_keep = [];
  for (var j = 0; j < bus.students.length; j++) {
    var student = bus.students[j];
    if (student.school == stop_id)
      student.arrived = true;
    else
      students_keep.push(student);
  }
  bus.students = students_keep;

  // Add latest route step to current bus's distance traveled
  // and update its location.
  var dist = distance(bus.lat, bus.lon, lat, lon);
  bus.lat = lat;
  bus.lon = lon;
  bus.distance += dist;

  // Keep track of the last bus.
  return bus_id;
}

function simulate_routes(workbook_js, buses, stops, students) {
  clusterize.append(['<tr><td>Simulating <b>Routes</b>.</td></tr>']);
  var bus_id_last = null;

  for (var i = 0; i < workbook_js['Book']['Routes'].length; i++) {
    bus_id_last = simulate_routes_step(buses, stops, students, bus_id_last, workbook_js['Book']['Routes'][i]);
  }
  // Perform final checks.
  var bus_last = buses[bus_id_last];
  if (bus_last.lat != bus_last.yard.lat || bus_last.lon != bus_last.yard.lon)
    simulation_validation_error('Bus ' + bus_id_last + ' did not finish its route at its bus yard!');
  if (bus_last.students.length > 0)
    simulation_validation_error('Bus ' + bus_id_last + ' did not drop off ' + bus_id_last.students.length + ' students!');

  simulate_results(buses, stops, students);
}

function simulate_results(buses, stops, students) {
  var distance_total = 0, buses_used = 0;
  for (var bus_id in buses) {
    distance_total += buses[bus_id].distance;
    buses_used += (buses[bus_id].distance > 0) ? 1 : 0;
  }
  simulation_evaluation_success('Approximate total distance traveled by all buses: ' + (distance_total/1609.34).toFixed(2) + ' miles.');

  var students_not_boarded = 0, students_not_arrived = 0;
  for (var i = 0; i < students.length; i++) {
    students_not_boarded += students[i].boarded ? 0 : 1;
    students_not_arrived += students[i].arrived ? 0 : 1;
  }
  if (students_not_boarded > 0)
    simulation_validation_error('Did not pick up ' + students_not_boarded + ' students!');
  if (students_not_arrived > 0)
    simulation_validation_error('<b>Did not deliver a total of ' + students_not_arrived + ' students to their school(s)!</b>');
  
  var canSubmit = 1
  var jqxhr = $.getJSON( "student_hash.json", function(data) {

     $.each( students, function( key, val ) {
          if(data.student_hash.indexOf(students[key]['hash']) == -1){
            console.log(students[key]['hash'])
            simulation_validation_error('<b>There is a mismatch with the original student data.</b>');
            canSubmit = 0;
            return false;
          }
       },function(){
            $("#buses").html(numeral(buses_used).format('0,0'));
            $("#miles").html(numeral(distance_total.toFixed(3)).format('0,0.000'));
            $("#buses_submit").val(buses_used);
            $("#miles_submit").val(distance_total.toFixed(5));
          
            //Send event for ready for submission
            if(canSubmit){
              $( document ).trigger("submitReadyEvent"); 
            }
          });
  })

}

