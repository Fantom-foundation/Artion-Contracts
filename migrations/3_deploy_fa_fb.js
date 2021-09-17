const FantomAuction = artifacts.require('FantomAuction');
const FantomBid = artifacts.require('FantomBid');
const {
    TREASURY_ADDRESS,
  } = require('./constants');

module.exports = async function(deployer, network, accounts){
    console.log(`
   network: ${network}`);
    
    const platformFeeRecipient = accounts[1];
    
    await deployer.deploy(FantomAuction);
    await deployer.deploy(FantomBid);
    
    const fantomAuction = await FantomAuction.deployed();
    //console.log(fantomAuction.address);
    
    const fantomBid = await FantomBid.deployed();
    ///console.log(fantomAuction.address);

    await fantomAuction.initialize(platformFeeRecipient, fantomBid.address);
    await fantomBid.initialize(fantomAuction.address);

}