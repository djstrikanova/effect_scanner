const effectsdk = require('@effectai/effect-js');
const _ = require('lodash')


class EffectScanner{

    client
    account
    web3
    effectAccount

    constructor() {
        this.client = new effectsdk.EffectClient('mainnet')
        this.account = effectsdk.createAccount(process.env.BURNER_PRIVATE_KEY)
        this.web3 = effectsdk.createWallet(this.account)
    }

    async connect(){
        this.effectAccount = await this.client.connectAccount(this.web3)
        // console.log(this.effectAccount)
        // console.log(this.effectAccount.vAccountRows)
    }

    //TODO: Iterate through all nextKeys
    async getAllCampaigns(){
        const campaigns = await this.client.force.getCampaigns(null, 100, false)
        return campaigns
    }

    async getCampaignBatches(campaign_id){
        return this.client.force.getCampaignBatches(campaign_id)
    }
}

module.exports = EffectScanner
