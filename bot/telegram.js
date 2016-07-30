var TelegramBot = require('node-telegram-bot-api');

const token = CONFIG.TELEGRAM_BOT_TOKEN;

const botOptions = {
    polling: true
};

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
        var messageChatId = msg.chat.id;
        var messageText = msg.text;
        var messageDate = msg.date;
        var messageUsr = msg.from.username;
     

        var commands = msg.text.trim().split(" ");

        switch (commands[0]) {
            case '/start':

            break;
        }
        
        console.log(msg);
    });

}

Bot.prototype.sendMessageByBot = function(id, message, parseMode, markup) {
    this.botApi.sendMessage(id, message, parseMode, markup);
}

module.exports = Bot;