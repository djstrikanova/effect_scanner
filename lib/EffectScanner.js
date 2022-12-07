const effectsdk = require('@effectai/effect-js');
const _ = require('lodash')


class EffectScanner{

    client
    account
    web3
    effectAccount

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

    //TODO: Iterate through all nextKeys
    async getAllCampaigns(){
        const campaigns = await this.client.force.getCampaigns(null, 100, true)
        return campaigns
    }

    async getCampaignBatches(campaign_id){
        let batches = this.client.force.getCampaignBatches(campaign_id)
        //Lower load on the server
        await this.sleep(500)
        return batches
    }

    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}

module.exports = EffectScanner
