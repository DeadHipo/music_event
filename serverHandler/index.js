var express = require('express');

const util = require('util');
const urlencode = require('urlencode');

const hash = require('../helper/hash');
const user = require('../model/user');

const loginUrl = 'https://oauth.vk.com/authorize?client_id=' + CONFIG.VK_APP_ID + '&redirect_uri=%s&scope=audio,offline&response_type=code&v=' + CONFIG.VK_API_VERSION;
const redirectUrl = CONFIG.URL + '/api/login?id=%s&hash=%s';

var HandleServer = function() {
	this.express = express();
	this.setup();
	this.start();
}

HandleServer.prototype.telegramBot = {}
HandleServer.prototype.express = {}


HandleServer.prototype.setup = function() {

	this.express.get('/api', function (req, res) {
		res.send('Hello from music server api!');
	});

	this.express.get('/api/login', function(req, res) {

		var data = {
			id: req.query.id,
			hash: req.query.hash,
			code: req.query.code
		}

		if (dataIsEmpty(data.id) || dataIsEmpty(data.hash) || dataIsEmpty(data.code)) {
			return res.json( { error: { msg: 'Some data is empty' } } );
		}

		if (hash(data.id) !== data.hash) {
			return res.json( { error: { msg: 'Some data is incorrect' } } );
		}

		var u = new user(data.id, data.code);
		u.save(function(error) {
			if (error) {
				console.log(error);
				return res.json( { error: { msg: 'Some is happened' } } );
			}			
			u.fetchArtist(function(error, what) {
				if (error) {
					console.log(error);
					return;
				}
				if (what == 1) {
					BOT.sendMessageByBot(data.id, 'Artsts save', null, null);
				} else if (what == 2) {
					BOT.sendMessageByBot(data.id, 'Similar artists save', null, null);
				} else {
					BOT.sendMessageByBot(data.id, '?!', null, null);
				}
			});
			res.redirect('tg://resolve?domain=musiceventbot');
		});
	});

	this.express.get('/api/oauth', function(req, res) {
		var data = {
			id: req.query.id,
			hash: req.query.hash
		}

		if (dataIsEmpty(data.id) || dataIsEmpty(data.hash)) {
			return res.json( { error: { msg: 'Some data is empty' } } );
		}

		if (hash(data.id) !== data.hash) {
			return res.json( { error: { msg: 'Some data is incorrect' } } );
		}

		var redirect = util.format(loginUrl, urlencode(util.format(redirectUrl, data.id, data.hash)));
		res.redirect(redirect);
	});
}

HandleServer.prototype.start = function() {
	this.express.listen(CONFIG.SERVER_PORT, function(error) {
		if (error) {
			throw 'Start error';
		}
		console.log('Server started');
	});	
}

function dataIsEmpty(data) {
	if (data === undefined || data === null) {
		return true
	}
	return false
}

module.exports = HandleServer;