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

const PLATFORM_FEE = '2';
const MINT_FEE = '1';

const weiToEther = (n) => {
    return web3.utils.fromWei(n.toString(), 'ether');
}


contract('Overall Test',  function ([owner, platformFeeRecipient, artist, buyer])  {

    const platformFee = ether(PLATFORM_FEE);
    const marketPlatformFee = new BN(PLATFORM_FEE);    
    const mintFee = ether(MINT_FEE);

    beforeEach(async function () {
        
        this.fantomAddressRegistry = await FantomAddressRegistry.new();
        this.artion = await Artion.new(platformFeeRecipient, platformFee);

        this.fantomAuction = await FantomAuction.new();
        this.fantomBid = await FantomBid.new();

        await this.fantomAuction.initialize(platformFeeRecipient, this.fantomBid.address);
        await this.fantomBid.initialize(this.fantomAuction.address);

        await this.fantomAuction.updateAddressRegistry(this.fantomAddressRegistry.address);
        await this.fantomBid.updateAddressRegistry(this.fantomAddressRegistry.address);

        this.fantomMarketplace = await FantomMarketplace.new();
        this.fantomListingMarketplace = await FantomListingMarketplace.new();
        this.fantomOfferMarketplace = await FantomOfferMarketplace.new();

        await this.fantomMarketplace.initialize(platformFeeRecipient, marketPlatformFee, this.fantomOfferMarketplace.address, this.fantomListingMarketplace.address);
        await this.fantomOfferMarketplace.initialize(this.fantomMarketplace.address, this.fantomListingMarketplace.address);
        await this.fantomListingMarketplace.initialize(this.fantomMarketplace.address, this.fantomOfferMarketplace.address);

        await this.fantomMarketplace.updateAddressRegistry(this.fantomAddressRegistry.address);
        await this.fantomOfferMarketplace.updateAddressRegistry(this.fantomAddressRegistry.address);
        await this.fantomListingMarketplace.updateAddressRegistry(this.fantomAddressRegistry.address);

        this.fantomBundleMarketplace = await FantomBundleMarketplace.new();
        this.fantomOfferBundleMarketplace = await FantomOfferBundleMarketplace.new();
        this.fantomListingBundleMarketplace = await FantomListingBundleMarketplace.new();

        await this.fantomBundleMarketplace.initialize(platformFeeRecipient, platformFee, this.fantomOfferBundleMarketplace.address, this.fantomListingBundleMarketplace.address);
        await this.fantomOfferBundleMarketplace.initialize(this.fantomBundleMarketplace.address, this.fantomListingBundleMarketplace.address);
        await this.fantomListingBundleMarketplace.initialize(this.fantomBundleMarketplace.address);

        this.fantomNFTFactory = await FantomNFTFactory.new(this.fantomAuction.address, this.fantomMarketplace.address, this.fantomBundleMarketplace.address, mintFee, platformFeeRecipient, platformFee);
        this.fantomTokenRegistry = await FantomTokenRegistry.new();

        this.mockERC20 = await MockERC20.new("wFTM", "wFTM", ether('1000000'));

        this.fantomTokenRegistry.add(this.mockERC20.address);

        this.fantomPriceFeed = await FantomPriceFeed.new(this.fantomAddressRegistry.address, this.mockERC20.address);
        //await this.fantomPriceFeed.updateAddressRegistry(this.fantomAddressRegistry.address);

        this.fantomArtFactory = await FantomArtFactory.new(this.fantomMarketplace.address, this.fantomBundleMarketplace.address, mintFee, platformFeeRecipient, platformFee);

        await this.fantomAddressRegistry.updateArtion(this.artion.address);
        await this.fantomAddressRegistry.updateAuction(this.fantomAuction.address);
        await this.fantomAddressRegistry.updateMarketplace(this.fantomMarketplace.address);
        await this.fantomAddressRegistry.updateOfferMarketplace(this.fantomOfferMarketplace.address);
        await this.fantomAddressRegistry.updateBundleMarketplace(this.fantomBundleMarketplace.address);
        await this.fantomAddressRegistry.updateOfferBundleMarketplace(this.fantomOfferBundleMarketplace.address);
        await this.fantomAddressRegistry.updateNFTFactory(this.fantomNFTFactory.address);
        await this.fantomAddressRegistry.updateTokenRegistry(this.fantomTokenRegistry.address);
        await this.fantomAddressRegistry.updatePriceFeed(this.fantomPriceFeed.address);
        await this.fantomAddressRegistry.updateArtFactory(this.fantomArtFactory.address);

    })

    describe('Minting and auctioning NFT', function() {

        it('Scenario 1', async function(){

            console.log(`
            Scenario 1:
            An artist mints an NFT for him/herself
            `);

            let balance = await this.artion.platformFee();
            console.log(`
            Platform Fee: ${weiToEther(balance)}`);

            let balance1 = await web3.eth.getBalance(artist);
            console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

            let balance2 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(balance2)}`);

            console.log(`
            Now minting...`);
            let result = await this.artion.mint(artist, 'http://artist.com/art.jpeg', {from: artist, value: ether(PLATFORM_FEE)});
            console.log(`
            Minted successfully`);

            let balance3 = await web3.eth.getBalance(artist);
            console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

            let balance4 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

            console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTM as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases`);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.greaterThan(PLATFORM_FEE*1);

            console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTM as the platform fee is ${PLATFORM_FEE} FTM `);
            expect(weiToEther(balance4)*1 - weiToEther(balance2)*1).to.be.equal(PLATFORM_FEE*1);

            console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${'http://artist.com/art.jpeg'},
            minter = ${artist}`);
            expectEvent.inLogs(result.logs, 'Minted',{
                tokenId: new BN('1'),
                beneficiary: artist,
                tokenUri : 'http://artist.com/art.jpeg',
                minter : artist
            })

            console.log(`
            The artist approves the nft to the market`);
            await this.artion.setApprovalForAll(this.fantomListingMarketplace.address, true, {from: artist});

            console.log(`
            The artist lists the nft in the market with price 20 wFTM and starting time 2021-09-23 10:00:00 GMT`);
            await this.fantomListingMarketplace.listItem(
                    this.artion.address,
                    new BN('1'),
                    new BN('1'),
                    this.mockERC20.address,
                    ether('20'),
                    new BN('11632391200'), // 2021-09-23 10:00:00 GMT
                    { from : artist }
                    );

            console.log('');
        });
    })

})
