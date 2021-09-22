const FantomMarketplace = artifacts.require('FantomMarketplace');
const FantomListingMarketplace = artifacts.require('FantomListingMarketplace');
const FantomOfferMarketplace = artifacts.require('FantomOfferMarketplace');
const {
    TREASURY_ADDRESS,
  } = require('./constants');

module.exports = async function(deployer, network, accounts){
    console.log(`
   network: ${network}`);
    
    const platformFeeRecipient = accounts[1];
    const platformFee = new web3.utils.BN('25');
    
    await deployer.deploy(FantomMarketplace);    
    const fantomMarketplace = await FantomMarketplace.deployed();    
    //console.log(fantomMarketplace.address);

    await deployer.deploy(FantomListingMarketplace);    
    const fantomListingMarketplace = await FantomListingMarketplace.deployed();

    await deployer.deploy(FantomOfferMarketplace);    
    const fantomOfferMarketplace = await FantomOfferMarketplace.deployed();
    
    await fantomMarketplace.initialize(platformFeeRecipient, platformFee, fantomOfferMarketplace.address, fantomListingMarketplace.address);
    await fantomOfferMarketplace.initialize(fantomMarketplace.address, fantomListingMarketplace.address);
    await fantomListingMarketplace.initialize(fantomMarketplace.address, fantomOfferMarketplace.address);

}