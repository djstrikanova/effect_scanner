const { Client, Events, GatewayIntentBits, Collection} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

class EffectDiscord{

    client

    async initEffectDiscord(discord_token) {

        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

        // await this.initDiscordCommands();
        // await this.initDiscordEvents();

        await this.client.login(discord_token);
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
        await this.client.destroy();
    }

    async sendForceNotifToChannels(channels, message){
        for (const channel of channels) {
            // console.log(channel)
            this.client.channels.cache.get(channel).send(message);
        }
    }


}

module.exports = EffectDiscord
