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
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTableIfExists('campaign_scan')
};
