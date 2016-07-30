const mongoose = require('mongoose');
const async = require('async');

const urlencode = require('urlencode');
const util = require('util');

const hash = require('../helper/hash');
const muzis = require('../muzis/api');

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
    	count: { type: Number, index: true, default: 1}
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
    				var name = item.artist;
    				var artist = item.artist.trim().toLowerCase().replace(/ /g, '-');
    				artists[artist] = (artists[artist] || {
    					count: 0,
    					title: name
    				}).count + 1;
    				console.log(artists[artist]);
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
	});

	callback();
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

module.exports = User;