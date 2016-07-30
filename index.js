global.request = require('request');
global.CONFIG = require('./config');

global.BOT = new (require('./bot/telegram'))();

(require('mongoose')).connect('mongodb://localhost/db');

