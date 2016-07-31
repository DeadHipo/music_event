const mongoose = require('mongoose');
const async = require('async');

const urlencode = require('urlencode');
const util = require('util');

const hash = require('../helper/hash');
const muzis = require('../muzis/api');
const event = require('./event');

const redirectUrl =  CONFIG.URL + '/api/login?id=%s&hash=%s';
const tokenUrl = 'https://oauth.vk.com/access_token?client_id=' + CONFIG.VK_APP_ID + '&client_secret=' + CONFIG.VK_APP_SECRET + '&redirect_uri=%s&code=%s';
const audioUrl = 'https://api.vk.com/method/audio.get?v=' + CONFIG.VK_API_VERSION + '&access_token=%s'

const UserSchema = new mongoose.Schema({
	_id: { type: Number, index: true },
    code: { type: String, default: "0", index: true },
	mute: { type: Number, default: 0 },
    artists: [{
  		title: { type: String, index: true },
    	name: { type: String, index: true },
    	count: { type: Number, index: true, default: 1}
    }],
    similar_artists: [{
    	name: { type: String, index: true },
    	count: { type: Number, index: true, default: 1},
    	mp3: String
    }],
    artists_ready: { type: Number, default: 0 },
    similar_ready: { type: Number, default: 0 }
});

const UserModel = mongoose.model('user', UserSchema);

var User = function(telegramId, vkCode) {
	this.data = {
		_id: telegramId,
		code: vkCode
	}
}

User.prototype.data = {}

User.prototype.save = function(callback) {
	var u = new UserModel(this.data);
	u.save()
	.then(function() {
		callback();
	})
	.catch(function(error) {
		callback(error);
	});
}

User.prototype.getVkToken = function(callback) {

	var redirect = urlencode(util.format(redirectUrl, this.data._id, hash(this.data._id)));
	var url = util.format(tokenUrl, redirect, this.data.code);

	request(url, function(error, res, body) {
		if (!error && res.statusCode == 200) {
    		var json = JSON.parse(body);

    		if (json.error) {
    			return callback(json);
    		}
    		return callback(null, json.access_token);
  		}
	});
}

User.prototype.fetchArtist = function(callback) {
	console.log('fetch');

	var id = this.data._id;
	var user = this;

	this.getVkToken(function(error, token) {

		if (error) {
			return callback(error);
		}

		var url = util.format(audioUrl, token);

		request(url, function(error, res, body) {
			if (!error && res.statusCode == 200) {

    			var json = JSON.parse(body);
    			if (json.error) {
    				return callback(json);
    			}

    			var items = json.response.items;

    			var artists = [];
    			var similarArtist = [];

    			async.each(items, function(item, callback) {
    				var name = item.artist.trim();
    				var artist = item.artist.trim().toLowerCase().replace(/ /g, '-');
    				
    				var obj = {
    					count: 1,
    					title: name
    				}
					
    				if (artists[artist]) {
    					artists[artist].count += 1;
    				} else {
    					artists[artist] = obj;
    				}

    				callback();
    			}, function(error) {
    				console.log("artists save");
	    			user.insertArtist(artists, function() {
	   					callback(null, 1);
	    			});
    			});

    			async.each(Object.keys(artists), function(item, artistcallback) {
    				muzis({ name: item }, function(error, similar) {
    					if (error && !similar) {
    						artistcallback();
    					} else if (similar) {
    						async.each(similar, function(item, similarcallback) {
    							var  artist_name = item.title.trim().toLowerCase().replace(/ /g, '-');
    							if (!artists.hasOwnProperty(artist_name)) {
    								similarArtist[artist_name] = (similarArtist[artist_name] || 0) + 1;
    							}
    							similarcallback();
    						});
    						artistcallback();
    					} else {
    						artistcallback();
    					}
    				});
    			}, function(error) {
					console.log("similarArtist save", error);
	    			user.insertSimilarArtist(similarArtist, function() {
						callback(null, 2);
	    			});
    			});
  			}
		});
	});
}

User.prototype.insertArtist = function(artists, callback) {
	var query = { _id: this.data._id }
	var options = {}

	async.each(Object.keys(artists), function(audio, asynccallback) {
		var update = { 
			$push: {
				artists: {
					name: audio,
					title: artists[audio].title,
					count: artists[audio].count
				}	
			}
		}
		
		UserModel.update(query, update, options, function(error) {
			if (error) {
				console.log(error);
			}
			asynccallback();
		});
	});

	callback();
}

User.prototype.insertSimilarArtist = function(artists, callback) {
	var query = { _id: this.data._id }
	var options = {}

	async.each(Object.keys(artists), function(artist, asynccallback) {
		
		//muzis.mp3(artist, function(error, song) {

		//	var update = {}

		//	if (!error) {
		//		var update = { 
		//			$push: {
		//				similar_artists: {
		//					name: artist,
		//					count: artists[artist],
		// 					mp3: song
		// 				}	
		// 			}
		// 		}

		// 		UserModel.update(query, update, options, function(error) {
		// 			if (error) {
		// 				console.log(error);
		// 			}
		// 			asynccallback();
		// 		});
		// 	} else {
		var update = { 
			$push: {
				similar_artists: {
					name: artist,
					count: artists[artist]
				}	
			}
		}
		UserModel.update(query, update, options, function(error) {
			if (error) {
				console.log(error);
			}
			asynccallback();
		});
		
	}, function() {
		callback();
	});
}

User.exist = function(id) {

	UserModel.findById(id).exec()
	.then(function(user) {
		if (user == null) {
			return false;
		} else {
			return true;
		}
	})
	.catch(function(error) {
		console.log(error);
		throw error;
	});
}

User.topTeen = function(telegramId, callback) {
	UserModel.aggregate
	(
		[
			{
				$match: {
					_id: telegramId
				}
			},
			{
				$unwind: "$artists"
			},
			{
				$project: {
					_id: 0,
					name: "$artists.name",
					title: "$artists.title",
					count: "$artists.count"
				}
			},
			{
				$sort: {
					count: -1
				}
			},
			{
				$limit: 10
			}
		], 
		function (error, result) {
        	if (error) {
            	console.log(error);
            	return callback(error);
       		}
        	callback(null, result);
    	}
	);
}

User.topTeenSimilar = function(telegramId, callback) {
	UserModel.aggregate
	(
		[
			{
				$match: {
					_id: telegramId
				}
			},
			{
				$unwind: "$similar_artists"
			},
			{
				$project: {
					_id: 0,
					name: "$similar_artists.name",
					count: "$similar_artists.count"
				}
			},
			{
				$sort: {
					count: -1
				}
			},
			{
				$limit: 10
			}
		], 
		function (error, result) {
        	if (error) {
            	console.log(error);
            	return callback(error);
       		}
        	callback(null, result);
    	}
	);
}

User.getUser = function(telegramId, callback) {
	UserModel.findById(telegramId).exec()
	.then(function(user) {
		if (user == null) {
			return callback('null', null);
		} else {
			return callback(null, user);
		}
	})
	.catch(function(error) {
		console.log(error);
		throw error;
	});
}

User.serachEvents = function(telegramId, callback) {

	var userEvents = [];

	User.getUser(telegramId, function(error, user) {
		if (error) {
			return callback(error);
		}
		console.log(user._id);


		async.parallel({
			vk: function(callback) {

				async.each(user.artists, function(artist, artistCallback) {

					event.correctUserSearch(artist, function(error, events) {

						async.each(events, function(event, eventCallback) {

							var obj = {
								type: 0,
								event: event
							}

							userEvents.pushIfNotExist(obj, function(e) {
								console.log(e.event._id, obj.event._id);
								return e.event._id === obj.event._id;
							});
							eventCallback();

						}, function() {
							artistCallback();
						});
					});

				}, function() {
					callback();
				});
			},

			muzis: function(callback) {
				async.each(user.similar_artists, function(artist, artistCallback) {
					event.similarUserSearch(artist, function(error, events) {
						async.each(events, function(event, eventCallback) {

						var obj = {
							type: 1,
							event: event
						}

						userEvents.pushIfNotExist(obj, function(e) {
							return e.event._id === obj.event._id;
						});
						eventCallback();

						}, function() {
							artistCallback();
						});
					});
				}, function() {
					callback();
				});
			}
		}, function() {
			callback(null, userEvents);
		});
	});
}

User.findSimilar = function(events, callback) {
	var eventForUser = [];
	async.each(events, function(event, eventHandle) {
		var query = { "similar_artists.name": event.event.alias }
		var progection = {"_id" : 1 }

		UserModel.find(query, progection, function(error, users) {
			if (error) {
				return eventHandle(error);
			}
			async.each(users, function(user, userHandle) {
				var id =  "user" + user._id.toString();
				(eventForUser[id] || (eventForUser[id] = new Array())).push({
					type: 1,
					event: event
				});
				userHandle();
			}, function() {
				eventHandle();
			});
		});
	}, function(error) {
		if (error) {
			return callback(error);
		}
		callback(null, eventForUser);
	});
}

User.findCorrect = function(events, callback) {
	var eventForUser = [];
	async.each(events, function(event, eventHandle) {
		var query = { "artists.name": event.event.alias }
		var progection = {"_id" : 1 }

		UserModel.find(query, progection, function(error, users) {
			if (error) {
				return eventHandle(error);
			}
			async.each(users, function(user, userHandle) {
				var id =  "user" + user._id.toString();
				(eventForUser[id] || (eventForUser[id] = new Array())).push({
					type: 0,
					event: event
				});
				userHandle();
			}, function() {
				eventHandle();
			});
		});
	}, function(error) {
		if (error) {
			return callback(error);
		}
		callback(null, eventForUser);
	});
}

module.exports = User;