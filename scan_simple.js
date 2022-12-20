const dotenv = require('dotenv').config({ path: __dirname + '/.env' })
const _ = require('lodash')
const striptags = require('striptags');

const EffectScanner = require('./lib/EffectScanner')
const Effect_DB = require('./dbknex')
const EffectDiscord = require('./lib/EffectDiscord')
const EffectTelegram = require('./lib/EffectTelegram')
const db = new Effect_DB()

let account = null
let selectCampaignIDS = [16,43]
let useSelected = process.env.USE_FILTERED_CAMPAIGNS === "true"


let discord = null
let telegram_bot = null

let dryRun = process.env.DRY_RUN === "true"
let scan_batch_size = process.env.SCAN_BATCH_SIZE


let target_discord_channel = process.env.DISCORD_TARGET_CHANNEL_ID
let target_telegram_channel = process.env.TELEGRAM_TARGET_CHANNEL_ID

const main = async () => {
    await initEffect()
    await initDiscord()
    await initTelegram()
    await scanCampaigns(selectCampaignIDS)
    await logoutDiscord()
}

// main()

const main2 = async () => {
    await initEffect()
    await initDiscord()
    await initTelegram()
    await scanBatches(scan_batch_size, selectCampaignIDS,dryRun)
    await db.destroy()
    await logoutDiscord()
}

main2()

const sendTestDiscordMessage = async () => {
        await initDiscord()
        await discord.sendForceNotifToChannel(target_discord_channel, "Test")
        await logoutDiscord()
}

const sendTestTelegramMessage = async () => {
    initTelegram()
    await telegram_bot.send_channel_message(target_telegram_channel, "Test")

}
// sendTestDiscordMessage()
// sendTestTelegramMessage()

async function initEffect(){
    account = new EffectScanner(process.env.BURNER_PRIVATE_KEY);
    await account.connect();
}

function initTelegram(){
    telegram_bot = new EffectTelegram(process.env.TELEGRAM_BOT_TOKEN)
}

async function initDiscord(){
    discord = new EffectDiscord()
    return await discord.login(process.env.DISCORD_TOKEN)
}

async function logoutDiscord(){
    return await discord.logout()
}

async function getAllCampaigns(){
    let campaigns = await account.getAllCampaignsMerge(200)
    return campaigns
}
async function viewAllCampaigns(){
    let campaigns = await account.getAllCampaignsMerge(200)
    campaigns.rows.forEach(campaign => console.log(campaign))
}
async function viewCampaignBatches(id){
    let campaign_batches = await account.getCampaignBatches(id)
    console.log(campaign_batches)
}

async function getLatestBatches(num){
    return await account.getLatestBatchesMerge(num)
}


async function scanBatches(num,campaign_ids, dryRun = true){
    let batches = await getLatestBatches(num)
    let filtered_batches = []
    if(useSelected){
        filtered_batches = _.filter(batches, function(batch){
            return _.includes(campaign_ids, batch.campaign_id)
        })
    }else{
        filtered_batches = batches
    }
    console.log("Filtered batches: ", filtered_batches.length)
    let numBatchesDB = await db.numBatches()
    console.log("Num DB Batches: ", numBatchesDB)

    if(numBatchesDB > 0){firstBatch = false}

    for (let i = 0; i < filtered_batches.length; i++) {
        let campaign_name = "error"
        let batch = filtered_batches[i]
        try{
            console.log("Processing batch ID: ", batch.batch_id)
            //Check if Batch Exists in DB
            let db_batch = await db.getBatch(batch.batch_id)
            if(db_batch){

                    db_batch.json = JSON.parse(db_batch.batch_json_str)


                    console.log("Batch already exists in DB")
                    //Check for any changes to batch
                    console.log("Batch Tasks done: ", batch.tasks_done, " DB Tasks done: ", db_batch.json.tasks_done)
                    let tasks_done_changed = batch.tasks_done !== db_batch.json.tasks_done
                    let status_changed = batch.status !== db_batch.json.status

                    //If Differences found, update Telegram and Discord Messages
                    if (tasks_done_changed || status_changed){
                        console.log("Tasks Done or Status Changed")
                        //Update Batch in DB
                        console.log("Updating Batch in DB")
                        await db.upsertBatchScan(batch)
                        //Get Campaign Name
                        let campaign_name = await account.getCampaignName(batch.campaign_id)

                        //Update Discord Message with new Tasks Done
                        if(db_batch.discord_message_id > 0) {
                            console.log("Editing Discord Message ID: " + db_batch.discord_message_id)
                            await discord.editMessage(target_discord_channel, db_batch.discord_message_id, await generateBatchMessage(campaign_name, batch))
                        }else{
                            console.log("No Discord Message ID, skipping (DRY RUN PULLED BATCH")
                        }
                        //Update Telegram Message with new Tasks Done
                        if(db_batch.telegram_message_id > 0){
                            console.log("Editing Telegram Message ID: " + db_batch.telegram_message_id)
                            await telegram_bot.edit_channel_message(target_telegram_channel, db_batch.telegram_message_id, await generateBatchMessage(campaign_name, batch))
                        }else{
                            console.log("No Telegram Message ID, skipping (DRY RUN PULLED BATCH")
                        }

                    }else{
                        console.log("No Changes for Batch")
                    }

            }
            //Batch does not exist in DB
            else{
                console.log("Batch "+ batch.batch_id + " does not exist in db, inserting")
                //Insert into DB
                await db.upsertBatchScan(batch)
                //If First Batch in DB, do not send Telegram or Discord Messages
                if(!dryRun){
                    //If not first batch, send Telegram and Discord Messages
                    console.log("Not dry run, sending messages")
                    //Get Campaign Name
                    let campaign_name = await account.getCampaignName(batch.campaign_id)

                    let notifMessage = await generateBatchMessage(campaign_name, batch)
                    console.log(notifMessage)

                    //Send Discord Channel Message
                    let discord_message = await discord.sendForceNotifToChannel(target_discord_channel,notifMessage)
                    let discord_message_id = discord_message.id
                    console.log("Discord Message ID: ", discord_message_id)
                    await db.setBatchDiscordMessageId(batch.batch_id, discord_message_id)

                    //Send Telegram Channel Message
                    let telegram_message = await telegram_bot.send_channel_message(target_telegram_channel, notifMessage)
                    let telegram_message_id = telegram_message.message_id
                    console.log("Telegram Message ID: ", telegram_message_id)
                    await db.setBatchTelegramMessageId(batch.batch_id, telegram_message_id)

                }else{
                    console.log("Dry run, not sending messages")
                }
            }
            console.log("")



        }catch(e){
            console.log(e)
        }
    }


}

async function scanCampaigns(campaign_ids){
    let campaigns = await getAllCampaigns()
    try{
        //Filter Valid Campaigns if useSelected is true
        let campaigns_to_scan = []
        if(useSelected) {
            campaigns_to_scan = _.filter(campaigns, function (campaign) {
                return _.includes(campaign_ids, campaign.id)
            })
        }else{
            campaigns_to_scan = campaigns;
        }
        //Get Batches For Campaigns and Upsert them
        for (let i = 0; i < campaigns_to_scan.length; i++) {
            try {
                let campaign = campaigns_to_scan[i]
                let batches = await account.getCampaignBatches(campaign.id)
                let campaign_name = "error"
                try{
                    campaign_name = striptags(campaign.info.title)
                }catch(e){console.log(e)}

                //Check if campaign exists in db, and get batches if it does
                if(await db.campaignExists(campaign.id)){
                    console.log("Campaign "+ campaign.id +" Exists in db")
                    let db_campaign = await db.getCampaignScan(campaign.id)
                    let db_campaign_batches = JSON.parse(db_campaign.batches_list_json_str)

                    //Check if there are new batches compared to db
                    //Get Unique batches
                    if(db_campaign_batches.length < batches.length) {
                        let new_batches = _.differenceBy(batches, db_campaign_batches, 'batch_id')
                        console.log("Found New Batches: ", new_batches)

                        for (let j = 0; j < new_batches.length; j++) {
                            let batch = new_batches[j]
                            let notifMessage = "Found New Batches: " + campaign_name
                                + "\nCampaign URL: https://app.effect.network/campaigns/" + batch.campaign_id
                                + "\nBatch URL: https://app.effect.network/campaigns/" + batch.campaign_id + "/" + batch.batch_id
                                + "\nNum Tasks: " + batch.num_tasks + " -- Repetitions: " + batch.repetitions + " -- Tasks Done: " + batch.tasks_done
                                + "\nStatus: " + batch.status

                            //Send Discord Channel Message
                            await discord.sendForceNotifToChannel(target_discord_channel,notifMessage)
                            //Send Telegram Channel Message
                            await telegram_bot.send_channel_message(target_telegram_channel, notifMessage)
                        }



                    }else{
                        console.log("No New Batches Found for Campaign: ", campaign.id)
                    }
                }else{
                    console.log("Campaign "+ campaign.id + " does not exist in db, inserting")
                }

                //Update-Insert Campaign
                console.log("Upserting Campaign: ", campaign.id)
                await db.upsertCampaignScan(campaign, JSON.stringify(batches))

            }catch (e) {console.log(e)}
        }
    }
    catch(err){
        console.log(err)
    }

    await db.destroy()
}

async function generateBatchMessage(campaign_name, batch){

    let notifMessage = "Campaign: " + campaign_name
        // + "\nCampaign ID: " + batch.campaign_id
        + "\nCampaign URL: https://app.effect.network/campaigns/" + batch.campaign_id
        + "\nBatch URL: https://app.effect.network/campaigns/" + batch.campaign_id + "/" + batch.batch_id
        + "\nNum Tasks: " + batch.num_tasks + " -- Repetitions: " + batch.repetitions + " -- Tasks Done: " + batch.tasks_done
        + "\nStatus: " + batch.status
    return notifMessage
}

