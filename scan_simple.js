require('dotenv').config()
const _ = require('lodash')

const EffectScanner = require('./lib/EffectScanner')
const Effect_DB = require('./data/dbknex')
const EffectDiscord = require('./lib/EffectDiscord')
const db = new Effect_DB()

let account = null
let selectCampaignIDS = [16,43]

let discord = null

let test_channels = [process.env.DISCORD_TARGET_CHANNEL_ID]

const main = async () => {
    await initEffect()
    await initDiscord()
    await scanCampaigns(selectCampaignIDS)
    await logoutDiscord()
}

main()

async function initEffect(){
    account = new EffectScanner(process.env.BURNER_PRIVATE_KEY);
    await account.connect();
}

async function initDiscord(){
    discord = new EffectDiscord()
    await discord.initEffectDiscord(process.env.DISCORD_TOKEN)
}

async function logoutDiscord(){
    await discord.logout()
}

async function getAllCampaigns(){
    let campaigns = await account.getAllCampaigns()
    return campaigns
}
async function viewAllCampaigns(){
    let campaigns = await account.getAllCampaigns()
    campaigns.rows.forEach(campaign => console.log(campaign))
}
async function viewCampaignBatches(id){
    let campaign_batches = await account.getCampaignBatches(id)
    console.log(campaign_batches)
}

async function scanCampaigns(campaign_ids){
    let campaigns = await getAllCampaigns()
    try{
        //Filter Valid Campaigns
        let campaigns_to_scan = _.filter(campaigns.rows, function(campaign) {
            return _.includes(campaign_ids, campaign.id)
        })

        //Get Batches For Campaigns and Upsert them
        for (let i = 0; i < campaigns_to_scan.length; i++) {
            try {
                let campaign = campaigns_to_scan[i]
                let batches = await account.getCampaignBatches(campaign.id)

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
                            await discord.sendForceNotifToChannels(test_channels, "Found New Batches: "
                                + "\nCampaign URL: https://app.effect.network/campaigns/" + batch.campaign_id
                                + "\nBatch URL: https://app.effect.network/campaigns/" + batch.campaign_id + "/" + batch.batch_id
                                + "\nNum Tasks: " + batch.num_tasks + " -- Repetitions: " + batch.repetitions + " -- Tasks Done: " + batch.tasks_done
                                + "\nStatus: " + batch.status
                            )
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
