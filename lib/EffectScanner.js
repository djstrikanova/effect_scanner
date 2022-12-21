const effectsdk = require('@effectai/effect-js');
const _ = require('lodash')
const striptags = require("striptags");


class EffectScanner{

    client
    account
    web3
    effectAccount

    maxBatches = 500
    maxCampaigns = 100


    constructor(burner_private_key) {
        this.client = new effectsdk.EffectClient('mainnet')
        this.account = effectsdk.createAccount(burner_private_key)
        this.web3 = effectsdk.createWallet(this.account)
    }

    async connect(){
        this.effectAccount = await this.client.connectAccount(this.web3)
        // console.log(this.effectAccount)
        // console.log(this.effectAccount.vAccountRows)
    }

    async getAllCampaignsMerge(num){
        let campaigns = []
        let more = true
        let next_key = null
        let size = 0
        while(more && size < num){
            let campaign = await this.getCampaigns(next_key, this.maxCampaigns)
            console.log(campaign)
            campaigns = campaigns.concat(campaign.rows)
            more = campaign.more
            next_key = campaign.next_key
        }
        return campaigns
    }
    async getCampaigns(nextKey, num){
        let client = this.client

        return new Promise(function(resolve, reject) {
            console.log("Getting all campaigns")
            try{
                resolve(client.force.getCampaigns(nextKey, num, true))

            }catch(e){
                console.log(e)
                resolve({ rows:[], more:false, next_key: null})
            }

            reject("Error getting campaigns")
        })
    }
    async getCampaign(campaign_id){
        let client = this.client

        return new Promise(function(resolve, reject) {
            console.log("Getting campaign")
            try{
                resolve(client.force.getCampaign(campaign_id))

            }catch(e){
                console.log(e)
                resolve({ rows:[], more:false, next_key: null})
            }

            reject("Error getting campaign")
        })
    }

    async getCampaignName(campaign_id){
        let scanner = this
        return new Promise(async function(resolve) {
            //Get Campaign Name
            let campaign_name = "error"
            let campaign = await scanner.getCampaign(campaign_id)

            try{
                //Sanitize Campaign Name
                campaign_name = scanner.checkLinksInString(campaign.info.title)
                campaign_name = striptags(campaign_name)
            }catch(e){console.log(e)}
            resolve(campaign_name)
        })
    }

    checkLinksInString(text){
        try {
            const regex = /http:\/\/|https:\/\/|[^ ]\.[^ \n]/g;
            if (regex.test(text)) {
                return 'Potential Link Detected, Not Allowed in Notifications!'
            }
        } catch (e) {
            console.log("Error Checking String");
        }

        return text
    }


    async getCampaignBatches(campaign_id){
        let client = this.client
        //Lower Request speed to not overload servers
        await this.sleep(500)
        return new Promise(function(resolve, reject) {
            console.log("Getting batches for campaign id: ", campaign_id)
            try{
                resolve(client.force.getCampaignBatches(campaign_id))

            }catch(e){
                console.log(e)
                resolve([])
            }

            reject("Error getting campaign batches")
        })

    }
    async getLatestBatchesMerge(num) {
        let batches = []
        let more = true
        let next_key = null
        let size = 0
        while (more && size < num) {
            let batch = await this.getBatches(next_key, this.maxBatches)
            batches = batches.concat(batch.rows)
            size += batches.length
            more = batch.more
            next_key = batch.next_key
        }
        let sliced_array = _.slice(batches, 0, Math.max(num, 0))
        return sliced_array
    }
    //
    async getBatches(nextKey, num){
        let client = this.client
        return new Promise(function(resolve, reject) {
            console.log("Getting latest batches")
            try{
                resolve(client.force.getBatches(nextKey,num))
            }catch(e){
                console.log(e)
                resolve({ rows:[], more:false, next_key: null})
            }

            reject("Error getting Batches")
        })
    }


    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}

module.exports = EffectScanner
