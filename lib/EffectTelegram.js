const { Telegraf } = require('telegraf');

class EffectTelegram {

    bot

    constructor(bot_token) {
        this.bot = new Telegraf(bot_token);
    }

    async start_chat_service(){
        // await this.bot.launch();

        // Enable graceful stop
        // process.once('SIGINT', () => this.bot.stop('SIGINT'));
        // process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    async send_channel_message(channel, message){
        console.log("Sending message to Telegram channel: ", channel)
        let result = await this.bot.telegram.sendMessage(channel, message)
        return result
    }

    async end_chat_service(){
        return await this.bot.stop()
    }
}

module.exports = EffectTelegram;
