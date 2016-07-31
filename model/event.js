const mongoose = require('mongoose');
const util = require('util');
const async = require('async');



const user = require('./user');

const eventUrl = 'http://api.cultserv.ru/jtransport/partner/get_events?category=10&exclude=dates&session=%s';

const EventSchema = new mongoose.Schema({
	_id: { type: Number, index: true },
	title: String,
	date_time: Date,
	event: {
		_id: { type: Number, index: true },
		title: String,
		alias: { type: String, index: true },
		link: String
	},
	venue: {
		_id: { type: Number, index: true },
		title: String,
		address: String
	},
	ticket: {
		min: Number,
		max: Number,
		count: Number
	},
	original_image: String
});

const EventModel = mongoose.model('event', EventSchema);

// EventModel.remove({}, function(err) { 
//    console.log('collection removed') 
// });

var Event = function(event) {
	this.data = {
		_id: event.id,
		title: event.title,
		date_time: event.date,
		event: {
			_id: event.event.id,
			title: event.event.title,
			alias: event.event.alias,
			link: event.event.link
		},
		venue: {
			_id: event.venue.id,
			title: event.venue.title,
			address: event.venue.address
		},
		ticket: {
			min: event.min_price,
			max: event.max_price,
			count: event.ticket_count
		},
		original_image: event.original_image
	};
}

Event.prototype.data = {};

Event.prototype.save = function(callback) {
	var e = new EventModel(this.data);
	e.save(function(error, event) {
		if (error) {
			return callback(error);
		}
		callback(null, event);
	});
}

Event.fetchEvents = function(callback) {
	var url = util.format(eventUrl, CONFIG.CULTSERV_API_TOKEN);
	
	var fetchedEvents = [];

	request(url, function(error, res, body) {
		var json = JSON.parse(body);
		if (json.code == 1) {
			async.each(json.message, function(event, callback) {
				var e = new Event(event);
				e.save(function(error, event) {
					if (error) {
						if (error.code !== 11000) {
							callback(error);
						} else {
							callback();
						}
					} else {
						fetchedEvents.push(event);
						callback();
					}
				});
			}, function(error) {
				if (error) {
					return callback(error);
				}
				callback(null, fetchedEvents);
			});	
		}
	});
}

Event.correctUserSearch = function(artist, callback) {	
	
	var query = {
		$or: 
		[
			{ "event.alias": /*{ $regex: "" + */artist.name/* + "" }*/ },
			{ "event.title": /*{ $regex: "" + */artist.title/* + "" }*/ }
		]
	}
	EventModel.find(query, function(error, events) {
		if (error) {
			return callback(error);
		}
		callback(null, events);
	});
}

Event.similarUserSearch = function(artist, callback) {	
	
	var query = { "event.alias": /*{ $regex: "" + */artist.name/* + "" }*/ }
	EventModel.find(query, function(error, events) {
		if (error) {
			return callback(error);
		}
		callback(null, events);
	});
}


Event.correctUserSearchRegx = function(artist, callback) {	
	
	var query = {
		$or: 
		[
			{ "event.alias": { $regex: ".*" + artist.name + ".*",  $options: "is" } },
			{ "title": { $regex: ".*" + artist.title +  ".*", $options: "is" } },
			{ "event.title": { $regex: $regex: ".*" + artist.title +  ".*", $options: "is" } }
		
	}
	EventModel.find(query, function(error, events) {
		if (error) {
			return callback(error);
		}
		callback(null, events);
	});
}

Event.similarUserSearchRegx = function(artist, callback) {	
	
	var query = { "event.alias": { $regex: ".*" + artist.name + ".*", $options: "is" } }
	EventModel.find(query, function(error, events) {
		if (error) {
			return callback(error);
		}
		callback(null, events);
	});
}


module.exports = Event;