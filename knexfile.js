// Update with your config settings.
require('dotenv').config()

const location = process.env.SQLITE_DB_LOCATION || './data/app.db';
const migrationsLoc = process.env.KNEX_MIGRATIONS_LOCATION || './data/migrations';
const seedsLoc = process.env.KNEX_SEEDS_LOCATION || './data/seeds';

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {

  sqlite3: {
    client: 'sqlite3',
    connection: {
      filename: location
    },
    useNullAsDefault: true,
    debug:false,
    migrations: {
      directory: migrationsLoc
    },
    seeds: {
      directory: seedsLoc
    }
  }

};
