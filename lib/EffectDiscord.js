const { Client, Events, GatewayIntentBits, Collection} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

class EffectDiscord{

    client

    constructor(){

        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

        // await this.initDiscordCommands();
        // await this.initDiscordEvents();
    }

    async login(discord_token){
        let login = await this.client.login(discord_token);
        //There is an issue where the client is not ready when the login promise resolves, rate limit? race condition? idk. waiting helps
        await this.sleep(1000)
        return login
    }

    async initDiscordCommands(){
        this.client.commands = new Collection();
        const commandsPath = path.join(__dirname, 'discord_commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            // Set a new item in the Collection with the key as the command name and the value as the exported module
            if ('data' in command && 'execute' in command) {
                this.client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    async initDiscordEvents(){
        const eventsPath = path.join(__dirname, 'discord_events');
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            if (event.once) {
                this.client.once(event.name, (...args) => event.execute(...args));
            } else {
                this.client.on(event.name, (...args) => event.execute(...args));
            }
        }
    }

    async logout(){
        return this.client.destroy();
    }

    //TODO: Add Resolve Reject
    async sendForceNotifToChannel(channel, message){

        const discord_channel = await this.client.channels.cache.get(channel)
        console.log('channel id: ', discord_channel)
        if(discord_channel){
            return await discord_channel.send(message);
        }

    }

    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}

module.exports = EffectDiscord
