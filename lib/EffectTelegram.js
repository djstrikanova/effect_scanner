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
        const bot = this.bot
        return new Promise(async function(resolve, reject) {
           try{
               resolve(bot.telegram.sendMessage(channel, message))
           }catch(error){
               console.log(error)
               resolve("Error Sending Telegram Message")
           }
        })

    }

    async edit_channel_message(channel, message_id, message){
        const bot = this.bot

        return new Promise(async function(resolve, reject) {
            try {
                resolve(bot.telegram.editMessageText(channel, message_id, null, message))
            }catch (error) {
                console.log(error)
                resolve("Error Editing Telegram Message")
            }
        })
    }

    async end_chat_service(){
        return await this.bot.stop()
    }
}

module.exports = EffectTelegram;
