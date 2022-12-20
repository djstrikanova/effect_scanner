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

    async getBatch(batch_id){
        return this.knexdb("batch_scan").where({batch_id:batch_id}).first()
    }

    async upsertBatchScan(batch_obj){
        return this.knexdb("batch_scan").insert({
            batch_id: batch_obj.batch_id,
            campaign_id: batch_obj.campaign_id,
            created_at: new Date(),
            updated_at: new Date(),
            batch_json_str: JSON.stringify(batch_obj),

        }).onConflict('batch_id').merge(['updated_at', 'batch_json_str'])
    }

    async setBatchDiscordMessageId(batch_id, discord_message_id){
        return this.knexdb("batch_scan").where({batch_id:batch_id}).update({
            discord_message_id: discord_message_id
        })
    }

    async setBatchTelegramMessageId(batch_id, telegram_message_id){
        return this.knexdb("batch_scan").where({batch_id:batch_id}).update({
            telegram_message_id: telegram_message_id
        })
    }

    async numBatches(){
        let num = await this.knexdb("batch_scan").count("* as num").first()
        return num.num
    }

    async destroy() {
        return this.knexdb.destroy();
    }
}

module.exports = Scanner_DB
