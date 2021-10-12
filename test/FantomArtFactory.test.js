const {
    expectRevert,
    expectEvent,
    BN,
    ether,
    constants,
    balance,
    send
  } = require('@openzeppelin/test-helpers');
  
const {expect} = require('chai');

const FantomArtFactory = artifacts.require("FantomArtFactory");
const FantomMarketplace = artifacts.require('FantomMarketplace');
const FantomBundleMarketplace = artifacts.require('FantomBundleMarketplace');
const FantomArtTradable = artifacts.require('FantomArtTradable');

const PLATFORM_FEE = '2';
const MARKETPLACE_PLATFORM_FEE = '50'  // 5%
const MINT_FEE = '1';

const weiToEther = (n) => {
    return web3.utils.fromWei(n.toString(), 'ether');
}


contract('FantomArtFactory Test', function([owner, platformFeeRecipient, user1]){

    const platformFee = ether(PLATFORM_FEE);
    const marketPlatformFee = new BN(MARKETPLACE_PLATFORM_FEE);    
    const mintFee = ether(MINT_FEE);

    beforeEach(async function () {
        this.fantomMarketPlace = await FantomMarketplace.new();
        this.fantomBundleMarketPlace = await FantomBundleMarketplace.new();        
        this.fantomArtFactory = await FantomArtFactory.new(
            this.fantomMarketPlace.address,
            this.fantomBundleMarketPlace.address,
            mintFee,
            platformFeeRecipient,
            platformFee
            );
    });

    describe('Create FantomArtTradable Contracts', function () {

        it('Creates a FantomArtTradable Contract', async function(){
            console.log(`
            Creating a FantomArtTradable contract...`);
            let result = await this.fantomArtFactory.createNFTContract("My NFT Contract", "MNC", {from: user1, value: platformFee});
            let log = result.logs.find((log) => {return (log.event === 'ContractCreated') });
            const fantomArtTradableAddress = log.args.nft;
            const creator = log.args.creator;

            console.log(`
            *The FantomArtTradable's address shouldn't be the zero address`);
            expect(fantomArtTradableAddress).to.be.not.equal(constants.ZERO_ADDRESS);
            console.log(`
            *The creator should be user1`);
            expect(creator).to.be.equal(user1);

            const fantomArtTradable = await FantomArtTradable.at(fantomArtTradableAddress);
            console.log(`
            Minting an nft using FantomArtTradable contract...`);
            result = await fantomArtTradable.mint(user1, 1, 'https://artion.com/123', {from: user1, value: platformFee});
            //console.log(result.logs);
            log = result.logs.find((log) => {return (log.event === 'URI')});
            console.log(`
            *The nft's should be 1
            `);
            expect(log.args._id.toString()).to.be.equal('1');


        });
    });

})

