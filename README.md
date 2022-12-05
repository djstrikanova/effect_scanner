# effect_scanner
This is a simple scanner that checks if the list of batches of a campaign have changed since the last scan. Intended for use with Telegram and Discord to make a notification bot.

# This uses Knex
https://knexjs.org/

https://knexjs.org/guide/migrations.html

# Initial Setup
```
npm install
knex migrate:up
```
# Test script
```
node .\scan_simple.js
```
For testing, I use the program DB Browser for SQLite. Knex allows us to change databases later if we want, but I find SQLlite easiest to test with.
https://sqlitebrowser.org/

The logic of the scan is simple, an array of all batches is stored in SQLite DB. If on a new scan the new batch array is larger than the one in the database, that means there was a new batch added. So select all the unique batches in the new batch array and send a message. 

# ENV Variables

So far, only ones I set are
```
NODE_ENV=sqlite3
BURNER_PRIVATE_KEY=<my_BSC_burner_wallet_private_key>
DISCORD_TOKEN=<private token given for your Discord App>
DISCORD_GUILD_ID=<target server id>
DISCORD_CLIENT_ID=<discord bot client ID>
DISCORD_TARGET_CHANNEL_ID=<target channel ID>
```
Enable Discord Dev Mode to copy and paste necessary ID's.

Create Discord App: https://discord.com/developers/applications
