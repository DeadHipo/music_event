var TelegramBot = require('node-telegram-bot-api');
const util = require('util');

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
                this.sendMessageByBot(data.id, "[Авторизация](" + url + ")", 'Markdown');
            break;
        }
        
        console.log(msg);
    });

}

Bot.prototype.sendMessageByBot = function(id, message, parseMode, markup) {
    this.botApi.sendMessage(id, message, parseMode, markup);
}

module.exports = Bot;