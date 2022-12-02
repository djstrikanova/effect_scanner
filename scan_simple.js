require('dotenv').config()
const _ = require('lodash')

const EffectScanner = require('./lib/EffectScanner')
const Effect_DB = require('./data/dbknex')
const db = new Effect_DB()

let account = null

let selectCampaignIDS = [16,43]


const main = async () => {
    await initEffect()
    await scanCampaigns(selectCampaignIDS)
}

main()

async function initEffect(){
    account = new EffectScanner();
    await account.connect();
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
