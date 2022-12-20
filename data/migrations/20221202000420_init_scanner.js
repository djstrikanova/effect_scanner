/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('campaign_scan', function(table){
        table.datetime('created_at')
        table.datetime('updated_at')
        table.integer("campaign_id")
        table.text("batches_list_json_str")

        table.primary(["campaign_id"])
    }).createTable('batch_scan', function(table){
table.datetime('created_at')
        table.datetime('updated_at')
        table.bigint("batch_id")
        table.integer("campaign_id")
        table.string("discord_message_id", 25)
        table.string("telegram_message_id", 25)
        table.text("batch_json_str")

        table.primary(["batch_id"])
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTableIfExists('campaign_scan').dropTableIfExists('batch_scan')
};
