var TelegramBot = require('node-telegram-bot-api');
const util = require('util');
const async = require('async');

const hash = require('../helper/hash');
const user = require('../model/user');

const token = CONFIG.TELEGRAM_BOT_TOKEN;
const botOptions = {
    polling: true
};

const loginUrl = CONFIG.URL + '/api/oauth?id=%s&hash=%s';

var Bot = function() {
    this.botApi = new TelegramBot(token, botOptions);
    this.setup();
}

Bot.prototype.botApi = {}

Bot.prototype.setup = function() {

    var send = this.sendMessageByBot;

    this.botApi.getMe().then(function(me)
    {
        console.log('Bot started');
    });
     
    this.botApi.on('text', function(msg)
    {
        var data = {
            id: msg.chat.id,
            name: msg.from.first_name
        }
     
        var commands = msg.text.trim().split(" ");

        switch (commands[0]) {

            case '/start':
                var url = util.format(loginUrl, data.id, hash(data.id));
                send(data.id, "[Авторизация](" + url + ")", 'Markdown');
            break;

            case '/top':
                user.topTeen(data.id, function(error, artists) {
                    var msg = '';
                    async.each(artists, function(artist, callback) {
                        msg += artist.name + ' ' + artist.count + '\n';
                        callback();
                    }, function() {
                        send(data.id, msg);
                    });
                });
            break;

            case '/similar':
                user.topTeenSimilar(data.id, function(error, similarArtist) {
                    var msg = '';
                    async.each(similarArtist, function(artist, callback) {
                        msg += artist.name + ' ' + artist.count + '\n';
                        callback();
                    }, function() {
                        send(data.id, msg);
                    });
                });
            break;
        }
        
        //console.log(msg);
    });

}

Bot.prototype.sendMessageByBot = function(id, message, parseMode, markup) {
    BOT.botApi.sendMessage(id, message, parseMode, markup);
}

module.exports = Bot;