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
                //send(data.id, DICTIONARY.welcome);
                var url = util.format(loginUrl, data.id, hash(data.id));

                var replyMarkup = {
                    inline_keyboard: [[ { text: DICTIONARY.login, url: url }]]
                }

                send(data.id, DICTIONARY.welcome, null, replyMarkup);
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
                    console.log(event);
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
        //console.log(user);
        BOT.userEvents[id] = {
            page: 0,
            events: events[user]
        };

        console.log(BOT.userEvents[id]);

        if (BOT.userEvents[id].events.length == 1) {
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
    var prefix = (event.type == 1 ? '\n\n' + DICTIONARY.muzisList : '');
    var title = "🎤 " + event.event.title;
    var date = "🗓 " + new Date(event.event.date_time).toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(' ', ' в ');
    var tickets = "💸 " + (event.event.ticket.count > 0 ? 'Есть билеты в наличии!' : 'Билетов уже нет');

    var msg = title + '\n' + date + '\n' + tickets + prefix;

    if (BOT.userEvents[telegramId].page == 0) {
        var replyMarkup = {
            inline_keyboard: [[{ text: DICTIONARY.forward, callback_data: "next" }], [{ text: DICTIONARY.more, callback_data: "more" }]]
        }
        BOT.botApi.sendMessage(telegramId, msg, null, replyMarkup);
    } else if (BOT.userEvents[telegramId].page == BOT.userEvents[telegramId].events.length - 1) {
        var replyMarkup = {
            inline_keyboard: [[{ text: DICTIONARY.back, callback_data: "back" }], [{ text: DICTIONARY.more, callback_data: "more" }]]
        }
        BOT.botApi.sendMessage(telegramId, msg, null, replyMarkup);
    } else {
        var replyMarkup = {
            inline_keyboard: [[ { text: DICTIONARY.back, callback_data: "back" }, { text: DICTIONARY.forward, callback_data: "next" }], [{ text: DICTIONARY.more, callback_data: "more" }]]
        }

        BOT.botApi.sendMessage(telegramId, msg, null, replyMarkup);
    }
}

Bot.prototype.editEventMessage = function(chatId, messageId, event, parseMode, replyMarkup) {
    var prefix = (event.type == 1 ? '\n\n' + DICTIONARY.muzisList : '');
    var title = "🎤 " + event.event.title;
    var date = "🗓 " + new Date(event.event.date_time).toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(' ', ' в ');
    var tickets = "💸 " + (event.event.ticket.count > 0 ? 'Есть билеты в наличии!' : 'Билетов уже нет');

    var msg = title + '\n' + date + '\n' + tickets + prefix;


    if (BOT.userEvents[chatId].page == 0) {
        var replyMarkup = {
            inline_keyboard: [[{ text: DICTIONARY.forward, callback_data: "next" }], [{ text: DICTIONARY.more, callback_data: "more" }]]
        }
        BOT.botApi.editMessageText(chatId, messageId, msg,  null, replyMarkup); 
    } else if (BOT.userEvents[chatId].page == BOT.userEvents[chatId].events.length - 1) {
        var replyMarkup = {
            inline_keyboard: [[{ text: DICTIONARY.back, callback_data: "back" }], [{ text: DICTIONARY.more, callback_data: "more" }]]
        }
        BOT.botApi.editMessageText(chatId, messageId, msg,  null, replyMarkup); 
    } else {
        var replyMarkup = {
            inline_keyboard: [[ { text: DICTIONARY.back, callback_data: "back" }, { text: DICTIONARY.forward, callback_data: "next" }], [{ text: DICTIONARY.more, callback_data: "more" }]]
        }
        BOT.botApi.editMessageText(chatId, messageId, msg,  null, replyMarkup); 
    }
}

Bot.prototype.sendEventFull = function(telegramId, event) {
    var url = CONFIG.PONIMINALU_MAIN_URL + event.event.event.link + '?promote=9324844f08cc81d23bc0a995e1be2805';
    var prefix = (event.type == 1 ? '\n\n' + DICTIONARY.muzisList : '');
    var title = "🎤 " + event.event.title;
    var date = "🗓 " + new Date(event.event.date_time).toISOString().replace(/T/, ' ').replace(/\..+/, '').replace(' ', ' в ');
    var place = "📍 " + event.event.venue.title;
    var tickets = "💸 Стоимость билетов: от " + event.event.ticket.min + " до " + event.event.ticket.max;
    var photo = CONFIG.PONIMINALU_MEDIA_URL + event.event.original_image;

    var msg = title + '\n' + date + '\n' + place + '\n' + tickets + prefix + '\n\n' + photo;

    var replyMarkup = {
        inline_keyboard: [[ { text: DICTIONARY.tickets, url: url }]]
    }

    console.log(msg);

    BOT.botApi.sendMessage(telegramId, msg, 'Markdown', replyMarkup);
}

module.exports = Bot;