// use this to deploy locally using truffle
// truffle deploy ; in this case ganache has to running
// truffle deploy --network localhost; in this case run first on another terminal: npx hardhat node

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
const FantomNFTFactory = artifacts.require('FantomNFTFactory');
const FantomArtFactory = artifacts.require('FantomArtFactory');
const FantomTokenRegistry = artifacts.require('FantomTokenRegistry');
const FantomPriceFeed = artifacts.require('FantomPriceFeed');
const MockERC20 = artifacts.require('MockERC20');

const etherToWei = (n) => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  )
}

module.exports = async function(deployer, network, accounts){

    console.log(`
    network: ${network}`);
  
    const platformFeeRecipient = accounts[1];
    const platformFee = etherToWei(5);        
    const mintFee = etherToWei(5);
    const marketPlatformFee = new web3.utils.BN('5');
    
    await deployer.deploy(FantomAddressRegistry);
    const fantomAddressRegistry = await FantomAddressRegistry.deployed();

    await deployer.deploy(Artion, platformFeeRecipient, platformFee);
    const artion = await Artion.deployed();

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

    await fantomMarketplace.initialize(platformFeeRecipient, marketPlatformFee, fantomOfferMarketplace.address, fantomListingMarketplace.address);
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

    await deployer.deploy(FantomNFTFactory, fantomAuction.address, fantomMarketplace.address, fantomBundleMarketplace.address, mintFee, platformFeeRecipient, platformFee);
    const fantomNFTFactory = await FantomNFTFactory.deployed();
    
    await deployer.deploy(FantomTokenRegistry);
    const fantomTokenRegistry = await FantomTokenRegistry.deployed();

    await deployer.deploy(MockERC20, "wFTM", "wFTM", etherToWei(1000000));
    const mockERC20 = await MockERC20.deployed();

    await fantomTokenRegistry.add(mockERC20.address);

    await deployer.deploy(FantomPriceFeed, fantomAddressRegistry.address, mockERC20.address);
    const fantomPriceFeed = await FantomPriceFeed.deployed();
    //await fantomPriceFeed.updateAddressRegistry(fantomAddressRegistry.address);

    await deployer.deploy(FantomArtFactory, fantomMarketplace.address, fantomBundleMarketplace.address, mintFee, platformFeeRecipient, platformFee);
    const fantomArtFactory = await FantomArtFactory.deployed();

    await fantomAddressRegistry.updateArtion(artion.address);
    await fantomAddressRegistry.updateAuction(fantomAuction.address);
    await fantomAddressRegistry.updateListingMarketplace(fantomListingMarketplace.address);
    await fantomAddressRegistry.updateMarketplace(fantomMarketplace.address);
    await fantomAddressRegistry.updateOfferMarketplace(fantomOfferMarketplace.address);
    await fantomAddressRegistry.updateBundleMarketplace(fantomBundleMarketplace.address);
    await fantomAddressRegistry.updateOfferBundleMarketplace(fantomOfferBundleMarketplace.address);
    await fantomAddressRegistry.updateNFTFactory(fantomNFTFactory.address);
    await fantomAddressRegistry.updateTokenRegistry(fantomTokenRegistry.address);
    await fantomAddressRegistry.updatePriceFeed(fantomPriceFeed.address);
    await fantomAddressRegistry.updateArtFactory(fantomArtFactory.address);    

}