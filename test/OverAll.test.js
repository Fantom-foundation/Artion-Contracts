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
const MARKETPLACE_PLATFORM_FEE = '50'  // 5%
const MINT_FEE = '1';

const weiToEther = (n) => {
    return web3.utils.fromWei(n.toString(), 'ether');
}


contract('Overall Test',  function ([owner, platformFeeRecipient, artist, buyer])  {

    const platformFee = ether(PLATFORM_FEE);
    const marketPlatformFee = new BN(MARKETPLACE_PLATFORM_FEE);    
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

        await this.fantomBundleMarketplace.updateAddressRegistry(this.fantomAddressRegistry.address);
        await this.fantomOfferBundleMarketplace.updateAddressRegistry(this.fantomAddressRegistry.address);
        await this.fantomListingBundleMarketplace.updateAddressRegistry(this.fantomAddressRegistry.address);

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
            He/She then put it on the marketplace with price of 20 wFTMs
            A buyer then buys that NFT
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
            });

            console.log(`
            The artist approves the nft to the market`);
            await this.artion.setApprovalForAll(this.fantomMarketplace.address, true, {from: artist});

            console.log(`
            The artist lists the nft in the market with price 20 wFTM and starting time 2021-09-22 10:00:00 GMT`);
            await this.fantomListingMarketplace.listItem(
                    this.artion.address,
                    new BN('1'),
                    new BN('1'),
                    this.mockERC20.address,
                    ether('20'),
                    new BN('1632304800'), // 2021-09-22 10:00:00 GMT
                    { from : artist }
                    );

            let listing = await this.fantomListingMarketplace.listings(this.artion.address, new BN('1'), artist);
            console.log(`
            *The nft should be on the marketplace listing`);
            expect(listing.quantity.toString()).to.be.equal('1');
            expect(listing.payToken).to.be.equal(this.mockERC20.address);
            expect(weiToEther(listing.pricePerItem)*1).to.be.equal(20);
            expect(listing.startingTime.toString()).to.be.equal('1632304800');

            console.log(`
            Mint 50 wFTMs to buyer so he can buy the nft`);
            await this.mockERC20.mint(buyer, ether('50'));

            console.log(`
            Buyer approves FantomMarketplace to transfer up to 50 wFTM`);
            await this.mockERC20.approve(this.fantomMarketplace.address, ether('50'), {from: buyer});
            
            console.log(`
            Buyer buys the nft for 20 wFTMs`);
            result = await this.fantomMarketplace.buyItemWithERC20( // function overloading doesn't work
            //await this.fantomMarketplace.buyItem(
                this.artion.address, 
                new BN('1'), 
                this.mockERC20.address, 
                artist, 
                { from: buyer});

            console.log(`
            *Event ItemSold should be emitted with correct values: 
            seller = ${artist}, 
            buyer = ${buyer}, 
            nft = ${this.artion.address},
            tokenId = 1,
            quantity =1,
            payToken = ${this.mockERC20.address},
            unitPrice = 20,
            pricePerItem = 20`);
            expectEvent.inLogs(result.logs, 'ItemSold',{
                seller: artist,
                buyer: buyer,
                nft : this.artion.address,
                tokenId : new BN('1'),
                quantity : new BN('1'),
                payToken : this.mockERC20.address,
                unitPrice : ether('0'),
                pricePerItem : ether('20')
            });


            balance = await this.mockERC20.balanceOf(buyer);
            console.log(`
            *The wFTM balance of buyer now should be 30 wFTMs`);
            expect(weiToEther(balance)*1).to.be.equal(30);

            let nftOwner = await this.artion.ownerOf(new BN('1'));
            console.log(`
            The owner of the nft now should be the buyer`);
            expect(nftOwner).to.be.equal(buyer);
            
            balance = await this.mockERC20.balanceOf(artist);
            console.log(`
            *The wFTM balance of the artist should be 19 wFTMs`);
            expect(weiToEther(balance)*1).to.be.equal(19);

            listing = await this.fantomListingMarketplace.listings(this.artion.address, new BN('1'), artist);
            //console.log('listing: ', listing);
            console.log(`
            *The nft now should be removed from the listing`);            
            expect(listing.quantity.toString()).to.be.equal('0');
            expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
            expect(weiToEther(listing.pricePerItem)*1).to.be.equal(0);
            expect(listing.startingTime.toString()).to.be.equal('0');

            console.log('');
        });
    })

})
