const async = require('async');

var event = require('../model/event');
var user = require('../model/user');

const DELAY = /*24 * 60 * */60 * 1000;
const ERROR_DELAY = 1 * 60 * 60 * 1000;
const START_DELAY = 1000;

var globalEvents = {}

var fetch = function() {
	event.fetchEvents(function(error, events) {
		if (error) {
			console.error(error);
			fetchTimer = setTimeout(fetch, ERROR_DELAY);
		} else {
			globalEvents = events;

			async.parallel({
				vk: function(callback) {
					user.findCorrect(globalEvents, function(error, user) {
						if (error) {
							callback(error)
						} else {
							callback(null, user);
						}
					});

				},
				muzis: function(callback) {
					user.findSimilar(globalEvents, function(error, user) {
						if (error) {
							callback(error)
						} else {
							callback(null, user);
						}
					});
				}
			}, function (err, result) {
				var concatArray = [];

				async.each(Object.keys(result.vk), function(id, callback) {
					concatArray[id] = result.vk[id];
					callback();
				}, function() {
					async.each(Object.keys(result.muzis), function(id, callback) {
						if (concatArray[id]) {
							concatArray[id] = concatArray[id].concat(result.muzis[id]);
						}
						callback();
					}, function() {
						BOT.setEvents(concatArray);
					});

				});

			});

			fetchTimer = setTimeout(fetch, DELAY);
		}
	});
}

var fetchTimer = setTimeout(fetch, START_DELAY);