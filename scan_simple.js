const dotenv = require('dotenv').config({ path: __dirname + '/.env' })
const _ = require('lodash')
const striptags = require('striptags');

const EffectScanner = require('./lib/EffectScanner')
const Effect_DB = require('./dbknex')
const EffectDiscord = require('./lib/EffectDiscord')
const EffectTelegram = require('./lib/EffectTelegram')
const db = new Effect_DB()

let account = null
let selectCampaignIDS = _.split(process.env.SELECTED_CAMPAIGNS, ',')
let ignoreCampaignIDS = _.split(process.env.IGNORED_CAMPAIGNS, ',')
let minBatchValueEFX = process.env.MIN_BATCH_VALUE_EFX
let minBatchValueEFX_Worker_Ping = process.env.MIN_BATCH_VALUE_EFX_WORKER_PING
let useSelected = process.env.USE_FILTERED_CAMPAIGNS === "true"
let workerRoleID = process.env.WORKER_DISCORD_ROLE_ID

let discord = null
let telegram_bot = null

let dryRun = process.env.DRY_RUN === "true"
let scan_batch_size = process.env.SCAN_BATCH_SIZE


let target_discord_channel = process.env.DISCORD_TARGET_CHANNEL_ID
let target_telegram_channel = process.env.TELEGRAM_TARGET_CHANNEL_ID
let approved_only = process.env.APPROVED_ONLY === "true"


const main = async () => {
    await initEffect()
    await syncApproved();
    await initDiscord()
    await initTelegram()
    let approved = await db.getApprovedMeta();

    console.log(approved)
    if(_.size(approved.campaigns) === 0 && _.size(approved.requesters) === 0){
        console.log("No Approved Campaigns or Requesters. Notifications Stopped Until Fixed")
    }else{
        await scanBatches(scan_batch_size, selectCampaignIDS,dryRun)
    }

    await db.destroy()
    await logoutDiscord()
}

main()

async function syncApproved() {
    let approved = await account.getApproved()
    console.log(approved)
    await db.upsertMeta("approved",approved)
}



const sendTestDiscordMessage = async (message) => {
        await initDiscord()
        let result = await discord.sendForceNotifToChannel(target_discord_channel, message)
        console.log(result)
        await logoutDiscord()
}

const sendTestTelegramMessage = async (message) => {
    initTelegram()
    await telegram_bot.send_channel_message(target_telegram_channel, message)

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


async function scanBatches(num){
    let batches = await getLatestBatches(num)
    let filtered_batches = []
    filtered_batches = batches

    //Select Campaigns
    if(selectCampaignIDS.length > 0 && selectCampaignIDS[0] !== "") {
        filtered_batches = _.filter(batches, function (batch) {
            return _.includes(selectCampaignIDS, batch.campaign_id.toString())
        })
    }
    //Ignored Campaigns
    if(ignoreCampaignIDS.length > 0 && ignoreCampaignIDS[0] !== "") {
        filtered_batches = _.filter(batches, function (batch) {
            return !_.includes(ignoreCampaignIDS, batch.campaign_id.toString())
        })
    }

    let minBatchValue = 0
    try{
        minBatchValue = parseFloat(minBatchValueEFX)
    }catch (e) {
        console.log("Error parsing minBatchValueEFX")
    }
    if(Number.isNaN(minBatchValue)){minBatchValue = 0}

    console.log("Filtered batches: ", filtered_batches.length)
    let numBatchesDB = await db.numBatches()
    console.log("Num DB Batches: ", numBatchesDB)

    for (let i = 0; i < filtered_batches.length; i++) {
        let batch = filtered_batches[i]

        //Check if Approved
        console.log(batch)
        let approved = await db.getApprovedMeta()

        //Get Batch Value in EFX
        batch.total_tasks =  batch.num_tasks * batch.repetitions
        try{
            batch.batch_value = _.split(batch.balance.quantity, ' ')[0]
            batch.batch_value = parseFloat(batch.batch_value)

            batch.reward_amount = _.split(batch.reward.quantity, ' ')[0]
            batch.reward_amount = parseFloat(batch.reward_amount)
        }catch(e){
            console.log("Error parsing batch value")
            batch.batch_value = -1
            batch.reward_amount = -1
        }

        try{
            console.log("Processing batch ID: ", batch.batch_id)
            console.log("Total Tasks: ", batch.total_tasks)
            console.log("Batch Value: ", batch.batch_value + " EFX")
            console.log("Reward: ", batch.reward_amount + " EFX")
            if(batch.batch_value >= minBatchValue) {
                console.log("Batch Value "+ batch.batch_value + " EFX >= minBatchValue " + minBatchValue + " EFX")

                let prependDiscord = ""
                let prependTelegram = ""
                if(batch.batch_value >= minBatchValueEFX_Worker_Ping){
                    prependDiscord = "<@&"+ workerRoleID +"> "
                }

                //Check if Batch Exists in DB
                let db_batch = await db.getBatch(batch.batch_id)
                if (db_batch) {

                    db_batch.json = JSON.parse(db_batch.batch_json_str)


                    console.log("Batch already exists in DB")
                    //Check for any changes to batch
                    console.log("Batch Tasks done: ", batch.tasks_done, " DB Tasks done: ", db_batch.json.tasks_done)
                    let tasks_done_changed = batch.tasks_done !== db_batch.json.tasks_done
                    let status_changed = batch.status !== db_batch.json.status

                    //If Differences found, update Telegram and Discord Messages
                    if (tasks_done_changed || status_changed) {
                        console.log("Tasks Done or Status Changed")
                        //Update Batch in DB
                        console.log("Updating Batch in DB")
                        await db.upsertBatchScan(batch)
                        //Get Campaign Name
                        let campaign_name = await account.getCampaignName(batch.campaign_id)

                        //Update Discord Message with new Tasks Done
                        if(!dryRun) {
                            batch = await setBatchApproved(batch, approved)
                            //Only Display Approved if Env is set
                            if(!approved_only || (batch.approved_owner || batch.campaign_id_approved)) {
                                if (db_batch.discord_message_id > 0) {
                                    console.log("Editing Discord Message ID: " + db_batch.discord_message_id)
                                    await discord.editMessage(target_discord_channel, db_batch.discord_message_id, await generateBatchMessage(campaign_name, batch, prependDiscord))
                                } else {
                                    console.log("No Discord Message ID, skipping (DRY RUN PULLED BATCH")
                                }
                                //Update Telegram Message with new Tasks Done
                                if (db_batch.telegram_message_id > 0) {
                                    console.log("Editing Telegram Message ID: " + db_batch.telegram_message_id)
                                    await telegram_bot.edit_channel_message(target_telegram_channel, db_batch.telegram_message_id, await generateBatchMessage(campaign_name, batch, prependTelegram))
                                } else {
                                    console.log("No Telegram Message ID, skipping (DRY RUN PULLED BATCH")
                                }
                            }
                        }
                    } else {
                        console.log("No Changes for Batch")
                    }

                }
                //Batch does not exist in DB
                else {
                    console.log("Batch " + batch.batch_id + " does not exist in db, inserting")
                    //Insert into DB
                    await db.upsertBatchScan(batch)
                    //If First Batch in DB, do not send Telegram or Discord Messages
                    if (!dryRun) {
                        batch = await setBatchApproved(batch, approved)
                        console.log(batch)
                        console.log(approved)
                        //If not first batch, send Telegram and Discord Messages
                        console.log("Not dry run, sending messages")
                        //Get Campaign Name
                        let campaign_name = await account.getCampaignName(batch.campaign_id)

                        let discordNotifMessage = await generateBatchMessage(campaign_name, batch, prependDiscord)
                        console.log(discordNotifMessage)

                        if(!approved_only || (batch.approved_owner || batch.campaign_id_approved)) {
                            //Send Discord Channel Message
                            let discord_message = await discord.sendForceNotifToChannel(target_discord_channel, discordNotifMessage)
                            let discord_message_id = discord_message.id
                            console.log("Discord Message ID: ", discord_message_id)
                            await db.setBatchDiscordMessageId(batch.batch_id, discord_message_id)

                            let telegramNotifMessage = await generateBatchMessage(campaign_name, batch, prependTelegram)

                            //Send Telegram Channel Message
                            let telegram_message = await telegram_bot.send_channel_message(target_telegram_channel, telegramNotifMessage)
                            let telegram_message_id = telegram_message.message_id
                            console.log("Telegram Message ID: ", telegram_message_id)
                            await db.setBatchTelegramMessageId(batch.batch_id, telegram_message_id)
                        }
                    } else {
                        console.log("Dry run, not sending messages")
                    }
                }
                console.log("")

            }else{
                console.log("Batch Value "+ batch.batch_value + " EFX < minBatchValue " + minBatchValue + " EFX")
            }

        }catch(e){
            console.log(e)
        }
    }


}
async function setBatchApproved(batchObj, approved){
    try{
        //Check Campaign ID
        batchObj.campaign_id_approved = _.includes(approved.campaigns, batchObj.campaign_id)


        //Check Requester ID
        await account.getCampaign(batchObj.campaign_id).then((campaign) => {
            batchObj.campaign_owner = _.last(campaign.owner)
            batchObj.approved_owner = _.includes(approved.requesters, batchObj.campaign_owner)
        })
    } catch(err){
        console.log(err)
    }

    return batchObj
}


async function generateBatchMessage(campaign_name, batch, prepend){
    let notifMessage = "Error Generating Message"

    let approvedStatusMsg = "\nWARNING: Unmoderated, complete at your own risk!"
    try {
        if (batch.campaign_id_approved || batch.approved_owner) {
            approvedStatusMsg = "\nAPPROVED: Moderated Campaign ID or Requester."
        }
        else{prepend = ""}
    }catch(err){
        prepend = ""
        console.log(err)
    }

    console.log(batch)
    try {
        notifMessage = ""
            + prepend
            + "\nCampaign: " + campaign_name
            + approvedStatusMsg
            + "\nCampaign URL: https://app.effect.network/campaigns/" + batch.campaign_id
            + "\nBatch URL: https://app.effect.network/campaigns/" + batch.campaign_id + "/" + batch.batch_id
            // + "\nCampaign ID: " + batch.campaign_id
            + "\nReward/Task: " + batch.reward_amount + " EFX"
            + "\nTotal EFX Rewards: " + batch.batch_value + " EFX"
            + "\nNum Tasks: " + batch.num_tasks + " -- Repetitions: " + batch.repetitions + " -- Tasks Done: " + batch.tasks_done
            + "\nStatus: " + batch.status
    }catch(e){console.log(e)}
    return notifMessage
}

