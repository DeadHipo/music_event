var md5 = require('md5');

const config = require('../config');

function getHash(telegramId) {
	var hash = telegramId.toString() + config.SECRET;
	return md5(hash);
}

module.exports = getHash;