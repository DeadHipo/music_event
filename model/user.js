const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	_id: { type: Number, index: true },
    code: { type: String, default: "0", index: true },
	mute: { type: Number, default: 0 },
    artists: [{
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

User.prototype.data = {}