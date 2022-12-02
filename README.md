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

# ENV Variables

So far, only ones I set are
```
NODE_ENV=sqlite3
BURNER_PRIVATE_KEY=<my_BSC_burner_wallet_private_key>
```
