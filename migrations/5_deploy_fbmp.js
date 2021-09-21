const FantomBundleMarketplace = artifacts.require('FantomBundleMarketplace');
const FantomListingBundleMarketplace = artifacts.require('FantomListingBundleMarketplace');
const FantomOfferBundleMarketplace = artifacts.require('FantomOfferBundleMarketplace');
const {
    TREASURY_ADDRESS,
  } = require('./constants');

module.exports = async function(deployer, network, accounts){
    console.log(`
   network: ${network}`);
    
    const platformFeeRecipient = accounts[1];
    const platformFee = new web3.utils.BN('25');
    
    await deployer.deploy(FantomListingBundleMarketplace);    
    const fantomListingBundleMarketplace = await FantomListingBundleMarketplace.deployed();
    //console.log(fantomListingBundleMarketplace.address);

    await deployer.deploy(FantomOfferBundleMarketplace);    
    const fantomOfferBundleMarketplace = await FantomOfferBundleMarketplace.deployed();
    //console.log(fantomOfferBundleMarketplace.address);

    await deployer.deploy(FantomBundleMarketplace);    
    const fantomBundleMarketplace = await FantomBundleMarketplace.deployed();    
    //console.log(fantomBundleMarketplace.address);

}