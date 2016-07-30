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
Bot.prototype.userEvents = [];

Bot.prototype.setup = function() {

    var send = this.sendMessageByBot;
    var userEvents = this.userEvents;

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

            case '/events': 
                user.serachEvents(data.id, function(error, events) {
                    if (error) {
                        return console.log(error);
                    }
                    userEvents[data.id] = events;
                    console.log(userEvents);
                    send(data.id, userEvents[data.id]);
                });
            break;

            case '/top':
                user.topTeen(data.id, function(error, artists) {
                    var msg = '';
                    async.each(artists, function(artist, callback) {
                        msg += artist.title + ' ' + artist.count + '\n';
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

            case '/test':
            send(data.id, "*bold text*\n" +
                        "_italic text_\n" +
                        "[text](URL)\n" +
                        "`inline fixed-width code`\n" +
                        "```text\n" +
                        "pre-formatted fixed-width code block\n" +
                        "```", "Markdown");
            break;
        }
        
        //console.log(msg);
    });

}

Bot.prototype.sendMessageByBot = function(id, message, parseMode, markup) {
    BOT.botApi.sendMessage(id, message, parseMode, markup);
}

module.exports = Bot;