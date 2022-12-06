require("dotenv").config({ path: __dirname + '/.env' });

const knex = require("knex");
const config = require("./knexfile");

const _ = require("lodash");

class Scanner_DB {
    knexdb;

    constructor() {
        if (process.env.KNEX_DB === "sqlite3") {
            this.knexdb = knex(config.sqlite3);
        } else if (process.env.KNEX_DB === "pgsql") {
            this.knexdb = knex(config.pgsql);
        } else {
            this.knexdb = knex(config.sqlite3);
        }
    }

    async campaignExists(campaign_id){
        return this.knexdb("campaign_scan").where({campaign_id:campaign_id}).first()
    }

    async getCampaignScan(campaign_id){
        return this.knexdb("campaign_scan").where({campaign_id:campaign_id}).first()
    }

    async upsertCampaignScan(campaign_obj, batches_json_str){
        return this.knexdb("campaign_scan").insert({
            campaign_id: campaign_obj.id,
            created_at: new Date(),
            updated_at: new Date(),
            batches_list_json_str: batches_json_str,

        }).onConflict('campaign_id').merge(['updated_at', 'batches_list_json_str'])
    }

    async destroy() {
        return this.knexdb.destroy();
    }
}

module.exports = Scanner_DB
