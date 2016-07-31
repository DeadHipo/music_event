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
    var sendEvent = this.sendEvent;
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

                    userEvents[data.id] = {
                        page: 0,
                        events: events
                    };

                    sendEvent(data.id, events[0]);
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
    }).on('callback_query', function(d) {
        console.log(d);

        var id = d.from.id;
        var msgId = d.message.message_id;

        if (BOT.userEvents[id]) {
            var cmd = d.data;

            switch (cmd) {
                case 'next':
                    BOT.userEvents[id].page += 1;
                    var event = BOT.userEvents[id].events[BOT.userEvents[id].page];
                    BOT.editEventMessage(id, msgId, event, null, null);
                break;

                case 'back':
                    BOT.userEvents[id].page -= 1;
                    var event = BOT.userEvents[id].events[BOT.userEvents[id].page];
                    BOT.editEventMessage(id, msgId, event, null, null);
                break;

                case 'more':
                    var event = BOT.userEvents[id].events[BOT.userEvents[id].page];
                    BOT.sendEventFull(id, event);
                break;
            }

            BOT.botApi.answerCallbackQuery(d.id);

        } else {
            BOT.botApi.answerCallbackQuery(d.id);
        }
    });
}

Bot.prototype.setEvents = function(events) {
    var userIds = Object.keys(events);

    userIds.forEach(function(user) {
        var id = user.replace('user', '');

        BOT.userEvents[id] = {
            page: 0,
            events: events[user]
        };

        console.log(BOT.userEvents[id].events.lengh);

        if (BOT.userEvents[id].events.lengh == 1) {
            BOT.sendEventFull(id, BOT.userEvents[id].events[0]);
        } else {
            BOT.sendEvent(id, BOT.userEvents[id].events[0]);
        }
    });

}

Bot.prototype.sendMessageByBot = function(id, message, parseMode, markup) {
    BOT.botApi.sendMessage(id, message, parseMode, markup);
}

Bot.prototype.sendEvent = function(telegramId, event) {
    var title = "🎤 " + event.title;
    var date = "🗓 " + new Date(event.date_time).toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(' ', ' в ');
    var tickets = "💸 " + (event.ticket.count > 0 ? 'Есть билеты в наличии!' : 'Билетов уже нет');

    var msg = title + '\n' + date + '\n' + tickets;

    var replyMarkup = {
        inline_keyboard: [[ { text: "Назад", callback_data: "back" }, { text: "Вперед", callback_data: "next" }], [{ text: "Подробнее", callback_data: "more" }]]
    }

    console.log(telegramId);

    BOT.botApi.sendMessage(telegramId, msg, null, replyMarkup);
}

Bot.prototype.editEventMessage = function(chatId, messageId, event, parseMode, replyMarkup) {
    var title = "🎤 " + event.title;
    var date = "🗓 " + new Date(event.date_time).toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(' ', ' в ');
    var tickets = "💸 " + (event.ticket.count > 0 ? 'Есть билеты в наличии!' : 'Билетов уже нет');
    var msg = title + '\n' + date + '\n' + tickets;
    var replyMarkup = {
        inline_keyboard: [[ { text: "Назад", callback_data: "back" }, { text: "Вперед", callback_data: "next" }], [{ text: "Подробнее", callback_data: "more" }]]
    }

    BOT.botApi.editMessageText(chatId, messageId, msg,  null, replyMarkup); 
}

Bot.prototype.sendEventFull = function(telegramId, event) {
    var url = CONFIG.PONIMINALU_MAIN_URL + event.event.link + '?promote=9324844f08cc81d23bc0a995e1be2805';
    var title = "🎤 " + event.title;
    var date = "🗓 " + new Date(event.date_time).toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(' ', ' в ');
    var place = "📍 " + event.venue.title;
    var tickets = "💸 Стоимость билетов от " + event.ticket.min + " до " + event.ticket.max;
    var photo = CONFIG.PONIMINALU_MEDIA_URL + event.original_image;

    var replyMarkup = {
        inline_keyboard: [[ { text: "Купить билеты", url: url }]]
    }

    var msg = title + '\n' + date + '\n' + place + '\n' + tickets + '\n' + photo;

    BOT.botApi.sendMessage(telegramId, msg, 'Markdown', replyMarkup);
}

module.exports = Bot;