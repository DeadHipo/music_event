var event = require('../model/event');
var user = require('../model/user');

const DELAY = 24 * 60 * 60 * 1000;
const ERROR_DELAY = 1 * 60 * 60 * 1000;
const START_DELAY = 1000;

var fetch = function() {
	event.fetchEvents(function(error, events) {
		if (error) {
			console.error(error);
			fetchTimer = setTimeout(fetch, ERROR_DELAY);
		} else {
			user.findSimilar(events, function(error, users) {
				if (error) {
					console.error(error);
				} else {
					//console.log(users);
					BOT.setEvents(users);
				}
			});
			fetchTimer = setTimeout(fetch, DELAY);
		}
	});
}

var fetchTimer = setTimeout(fetch, START_DELAY);