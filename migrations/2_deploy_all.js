const FantomAddressRegistry = artifacts.require('FantomAddressRegistry');
const Artion = artifacts.require('Artion');
const FantomAuction = artifacts.require('FantomAuction');
const FantomBid = artifacts.require('FantomBid');
const FantomMarketplace = artifacts.require('FantomMarketplace');
const FantomListingMarketplace = artifacts.require('FantomListingMarketplace');
const FantomOfferMarketplace = artifacts.require('FantomOfferMarketplace');
const FantomBundleMarketplace = artifacts.require('FantomBundleMarketplace');
const FantomListingBundleMarketplace = artifacts.require('FantomListingBundleMarketplace');
const FantomOfferBundleMarketplace = artifacts.require('FantomOfferBundleMarketplace');


const {
    TREASURY_ADDRESS,
  } = require('./constants');

module.exports = async function(deployer, network, accounts){

    console.log(`
    network: ${network}`);
    
    await deployer.deploy(FantomAddressRegistry);
    const fantomAddressRegistry = await FantomAddressRegistry.deployed();

    await deployer.deploy(Artion, TREASURY_ADDRESS, '2000000000000000000');
    const artion = await Artion.deployed();


    const platformFeeRecipient = accounts[1];
    const platformFee = new web3.utils.BN('25');
    
    await deployer.deploy(FantomAuction);
    await deployer.deploy(FantomBid);
    
    const fantomAuction = await FantomAuction.deployed();
    const fantomBid = await FantomBid.deployed();

    await fantomAuction.initialize(platformFeeRecipient, fantomBid.address);
    await fantomBid.initialize(fantomAuction.address);

    await fantomAuction.updateAddressRegistry(fantomAddressRegistry.address);
    await fantomBid.updateAddressRegistry(fantomAddressRegistry.address);

    await deployer.deploy(FantomMarketplace);    
    const fantomMarketplace = await FantomMarketplace.deployed();  
    
    await deployer.deploy(FantomListingMarketplace);    
    const fantomListingMarketplace = await FantomListingMarketplace.deployed();

    await deployer.deploy(FantomOfferMarketplace);    
    const fantomOfferMarketplace = await FantomOfferMarketplace.deployed();

    await fantomMarketplace.initialize(platformFeeRecipient, platformFee, fantomOfferMarketplace.address, fantomListingMarketplace.address);
    await fantomOfferMarketplace.initialize(fantomMarketplace.address, fantomListingMarketplace.address);
    await fantomListingMarketplace.initialize(fantomMarketplace.address, fantomOfferMarketplace.address);

    await fantomMarketplace.updateAddressRegistry(fantomAddressRegistry.address);
    await fantomOfferMarketplace.updateAddressRegistry(fantomAddressRegistry.address);
    await fantomListingMarketplace.updateAddressRegistry(fantomAddressRegistry.address);

    await deployer.deploy(FantomListingBundleMarketplace);    
    const fantomListingBundleMarketplace = await FantomListingBundleMarketplace.deployed();

    await deployer.deploy(FantomOfferBundleMarketplace);    
    const fantomOfferBundleMarketplace = await FantomOfferBundleMarketplace.deployed();

    await deployer.deploy(FantomBundleMarketplace);    
    const fantomBundleMarketplace = await FantomBundleMarketplace.deployed();
    
    await fantomBundleMarketplace.initialize(platformFeeRecipient, platformFee, fantomOfferBundleMarketplace.address, fantomListingBundleMarketplace.address);
    await fantomOfferBundleMarketplace.initialize(fantomBundleMarketplace.address, fantomListingBundleMarketplace.address);
    await fantomListingBundleMarketplace.initialize(fantomBundleMarketplace.address);

    await fantomBundleMarketplace.updateAddressRegistry(fantomAddressRegistry.address);
    await fantomOfferBundleMarketplace.updateAddressRegistry(fantomAddressRegistry.address);
    await fantomListingBundleMarketplace.updateAddressRegistry(fantomAddressRegistry.address);

    await fantomAddressRegistry.updateArtion(artion.address);
    await fantomAddressRegistry.updateAuction(fantomAuction.address);
    await fantomAddressRegistry.updateMarketplace(fantomMarketplace.address);
    await fantomAddressRegistry.updateOfferMarketplace(fantomOfferMarketplace.address);
    await fantomAddressRegistry.updateBundleMarketplace(fantomBundleMarketplace.address);
    await fantomAddressRegistry.updateOfferBundleMarketplace(fantomOfferBundleMarketplace.address);

}