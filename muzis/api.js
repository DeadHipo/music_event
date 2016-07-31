const similarUrl = 'http://muzis.ru/api/similar_performers.api';
const searchUrl = 'http://muzis.ru/api/search.api';
const audioUrl = 'http://muzis.ru/api/stream_from_obj.api';

var search = function(param, callback) {

	var formData = {
		"q_performer": param.name,
		"size": 1
	}

	request.post(searchUrl, { form: formData }, function(error, res, body) { 
		if (!error && res.statusCode == 200) {
			var json = JSON.parse(body);
			if (json.head) {
				console.log(json.error);
				callback('error');
			} else {
				callback(null, json.performers);
			}
		} else {
			return callback('error');
		}
	});
}

var similar = function(param, callback) {

	var formData = {
		performer_id: param.id
	}

	request.post(similarUrl, { form: formData }, function(error, res, body) {
		if (!error && res.statusCode == 200) {
			var json = JSON.parse(body);
			if (json.head) {
				console.log(json.error);
				return callback('error');
			}
			return callback(null, json.performers);
		} else {
			return callback('error');
		}
	});
}

var audio = function(param, callback) {
	search({ name: param.name }, function(error, performers) {
		if (error) {
			callback(error);
		} else if (performers.length == 0) {
			callback(null, null);
		} else {
			var formData = {
				type: 3,
				id: performers[0].id,
				size: 1
			}

			request.post(audioUrl, { form: formData }, function(error, res, body) {
				if (!error && res.statusCode == 200) {
					var json = JSON.parse(body);
					if (json.head) {
						console.log(json.error);
						callback('error');
					} else {
						callback(null, json.songs[0].file_mp3);
					}
				} else {
					return callback('error');
				}
			});
		}
	});
}

var findSimilar = function(param, callback) {
	if (param.name.length < 2) {
		return callback(null, null);
	}

	search({ name: param.name }, function(error, performers) {
		if (error) {
			callback(error);
		} else if (performers.length == 0) {
			callback(null, null);
		} else {
			similar({ id: performers[0].id }, function(error, artists) {
				if (error) {
					callback(error);
				} else if (artists.length == 0) {
					callback(null, null);
				} else {
					callback(null, artists);
				}
			});
		}
	});
}

module.exports = findSimilar;
module.exports.mp3 = audio;