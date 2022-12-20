# effect_scanner
This is a simple scanner to do notifications for Effect Workers on Discord and Telegram when a new batch of tasks is available. It will also update that message when that batch data is updated, so workers will be able to see which batches have been completed and which still have tasks available.

# This uses Knex
https://knexjs.org/

https://knexjs.org/guide/migrations.html

* On linux you may need a direct path set for SQLITE_DB_LOCATION for it to work properly.

# Initial Setup
```
npm install
knex migrate:up

## On linux you may need to do (don't forget to set env vars)

npx knex migrate:up

```
# Test script (Node 18+ required for Discordjs)
```
node .\scan_simple.js
```
For testing, I use the program DB Browser for SQLite. Knex allows us to change databases later if we want, but I find SQLlite easiest to test with.
https://sqlitebrowser.org/

All collected batches are stored in a SQLite DB. The script pulls from [getBatches](https://effectai.github.io/effect-js/classes/Force.html#getBatches) to collect X number of batches to be scanned. It is recommended to first run a full scan with "DRY_RUN" set to true. This will store all batches into the DB. Afterwards, in all subsequent runs "DRY_RUN" can be set to false which would result in messages being sent to specified Discord and Telegram channels whenever a new batch is scanned. When a pulled batch is different, the DB entry is updated and the Discord and Telegram messages updated as well.   

# ENV Variables

So far, only ones I set are
```
# Set false to not send Discord/Telegram Messages
DRY_RUN=false

SQLITE_DB_LOCATION=<direct_path_where_you_want_db_to_be_stored>
NODE_ENV=sqlite3
BURNER_PRIVATE_KEY=<my_BSC_burner_wallet_private_key>
DISCORD_TOKEN=<private token given for your Discord App>
DISCORD_GUILD_ID=<target server id>
DISCORD_CLIENT_ID=<discord bot client ID>
DISCORD_TARGET_CHANNEL_ID=<target channel ID>

#Telegram Bot Token
TELEGRAM_BOT_TOKEN=<your generated bot token>
TELEGRAM_TARGET_CHANNEL_ID=<your channel ID, a negative number>

#Select Specific Campaigns
# Example: 46,14 => Grab only batches from campaigns 46 and 14
SELECTED_CAMPAIGNS=
#Select Ignored Campaigns
#Example 0,6,14 => Grab all batches except those from campaigns 0,6,14
IGNORED_CAMPAIGNS=
#Select a Minimum Batch Value for Batch to show a message
#Example 100 => Only show batches with a total value in rewards of 100 EFX or more
MIN_BATCH_VALUE_EFX=
#Select a Minimum Batch Value for Discord workers to be pinged with @Worker
#Example 50 => Only Batches with a total value of EFX in rewards of 50 EFX or more will ping workers
MIN_BATCH_VALUE_EFX_WORKER_PING=50

```
Enable Discord Dev Mode to copy and paste necessary ID's.

Create Discord App: https://discord.com/developers/applications

# Cron Jobs
For this script to work as intended, cron jobs need to be set up that periodically run the scan_simple.js script. I had issues setting up the cronjob and ended up having to use NVM to make sure I had the exact right version of node calling the script. I've provided examples of how to set up the cron stuff, but you may need to do something differently.
