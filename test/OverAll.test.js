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
const FantomAuction = artifacts.require('MockFantomAuction');
const FantomBid = artifacts.require('MockFantomBid');
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


contract('Overall Test',  function ([owner, platformFeeRecipient, artist, buyer, bidder1, bidder2, bidder3])  {

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

        await this.fantomBundleMarketplace.initialize(platformFeeRecipient, marketPlatformFee, this.fantomOfferBundleMarketplace.address, this.fantomListingBundleMarketplace.address);
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
        await this.fantomAddressRegistry.updateListingMarketplace(this.fantomListingMarketplace.address);
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
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE + 1} FTM as the gas fees shouldn't be more than 1 FTM`);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.greaterThan(PLATFORM_FEE*1);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.lessThan(PLATFORM_FEE*1 + 1);

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
            The artist lists the nft in the market with price 20 wFTM and 
            starting time 2021-09-22 10:00:00 GMT`);
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
            console.log(`
            *The nft now should be removed from the listing`);            
            expect(listing.quantity.toString()).to.be.equal('0');
            expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
            expect(weiToEther(listing.pricePerItem)*1).to.be.equal(0);
            expect(listing.startingTime.toString()).to.be.equal('0');

            console.log('');
        });
 
        it('Scenario 2', async function(){

            console.log(`
            Scenario 2:
            An artist mints an NFT for him/herself
            He/She then put it on the marketplace with price of 20 FTMs
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
            let result = await this.artion.mint(artist, 'http://artist.com/art2.jpeg', {from: artist, value: ether(PLATFORM_FEE)});
            console.log(`
            Minted successfully`);

            let balance3 = await web3.eth.getBalance(artist);
            console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

            let balance4 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

            console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases`);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.greaterThan(PLATFORM_FEE*1);

            console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTM as the platform fee is ${PLATFORM_FEE} FTMs `);
            expect(weiToEther(balance4)*1 - weiToEther(balance2)*1).to.be.equal(PLATFORM_FEE*1);

            console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${'http://artist.com/art2.jpeg'},
            minter = ${artist}`);
            expectEvent.inLogs(result.logs, 'Minted',{
                tokenId: new BN('1'),
                beneficiary: artist,
                tokenUri : 'http://artist.com/art2.jpeg',
                minter : artist
            });

            console.log(`
            The artist approves the nft to the market`);
            await this.artion.setApprovalForAll(this.fantomMarketplace.address, true, {from: artist});

            console.log(`
            The artist lists the nft in the market with price 20 FTMs and 
            starting time 2021-09-22 10:00:00 GMT`);
            await this.fantomListingMarketplace.listItem(
                    this.artion.address,
                    new BN('1'),
                    new BN('1'),
                    constants.ZERO_ADDRESS,
                    ether('20'),
                    new BN('1632304800'), // 2021-09-22 10:00:00 GMT
                    { from : artist }
                    );

            let listing = await this.fantomListingMarketplace.listings(this.artion.address, new BN('1'), artist);
            console.log(`
            *The nft should be on the marketplace listing`);
            expect(listing.quantity.toString()).to.be.equal('1');
            expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
            expect(weiToEther(listing.pricePerItem)*1).to.be.equal(20);
            expect(listing.startingTime.toString()).to.be.equal('1632304800');

            balance1 = await web3.eth.getBalance(buyer);
            console.log(`
            The buyer's FTM balance before buying: ${weiToEther(balance1)}`);

            balance2 = await web3.eth.getBalance(artist);
            console.log(`
            The artist's FTM balance before the nfts is sold: ${weiToEther(balance2)}`);

            balance3 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            The platform fee recipient before the nft is sold: ${weiToEther(balance3)}`);

            console.log(`
            Buyer buys the nft for 20 FTMs`);
            result = await this.fantomMarketplace.buyItem(
                this.artion.address, 
                new BN('1'), 
                artist, 
                { from: buyer, value: ether('20')});

            console.log(`
            *Event ItemSold should be emitted with correct values: 
            seller = ${artist}, 
            buyer = ${buyer}, 
            nft = ${this.artion.address},
            tokenId = 1,
            quantity =1,
            payToken = ${constants.ZERO_ADDRESS},
            unitPrice = 0,
            pricePerItem = 20`);
            expectEvent.inLogs(result.logs, 'ItemSold',{
                seller: artist,
                buyer: buyer,
                nft : this.artion.address,
                tokenId : new BN('1'),
                quantity : new BN('1'),
                payToken : constants.ZERO_ADDRESS,
                unitPrice : ether('0'),
                pricePerItem : ether('20')
            });

            let nftOwner = await this.artion.ownerOf(new BN('1'));
            console.log(`
            The owner of the nft now should be the buyer`);
            expect(nftOwner).to.be.equal(buyer);

            balance4 = await web3.eth.getBalance(buyer);
            console.log(`
            The buyer's FTM balance after buying: ${weiToEther(balance4)}`);

            console.log(`
            *The difference of the buyer's FTM balance should be more than 20 FTMs as buying costs some gases
            but should be less than 21 FTM as the gas shouldn't cost more than 1 FTM`);
            expect(weiToEther(balance1)*1 - weiToEther(balance4)*1).to.be.greaterThan(20);
            expect(weiToEther(balance1)*1 - weiToEther(balance4)*1).to.be.lessThan(21);

            let balance5 = await web3.eth.getBalance(artist);
            console.log(`
            The artist's FTM balance after the nfts is sold: ${weiToEther(balance5)}`);
            console.log(`
            *The difference of the artist's FTM balance should be 19 FTMs`);
            expect((weiToEther(balance5)*1 - weiToEther(balance2)*1).toFixed(5)*1).to.be.equal(19);

            balance6 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            The platform fee recipient after the nft is sold: ${weiToEther(balance6)}`); 
            console.log(`
            *The difference of the platform fee recipient's FTM balance should be 1 FTM`);
            expect(weiToEther(balance6)*1 - weiToEther(balance3)*1).to.be.equal(1); 
                      
            
            listing = await this.fantomListingMarketplace.listings(this.artion.address, new BN('1'), artist);
            console.log(`
            *The nft now should be removed from the listing`);            
            expect(listing.quantity.toString()).to.be.equal('0');
            expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
            expect(weiToEther(listing.pricePerItem)*1).to.be.equal(0);
            expect(listing.startingTime.toString()).to.be.equal('0');

            console.log('');
        });
 
        it('Scenario 3', async function() {

            console.log(`
            Scenario 3:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1, bidder2, bidder3 then bid the auction with 20 wFTMs, 25 wFTMs, and 30 wFTMs respectively`);

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
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE + 1} FTM as the gas fees shouldn't be more than 1 FTM`);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.greaterThan(PLATFORM_FEE*1);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.lessThan(PLATFORM_FEE*1 + 1);

            console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
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
            await this.artion.setApprovalForAll(this.fantomAuction.address, true, {from: artist});

            console.log(`
            Let's mock that the current time: 2021-09-25 10:00:00`);
            await this.fantomAuction.setTime(new BN('1632564000'));
            await this.fantomBid.setTime(new BN('1632564000'));

            console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
            result =  await this.fantomAuction.createAuction(
                this.artion.address,
                new BN('1'),
                this.mockERC20.address,
                ether('20'),
                new BN('1632564000'),  //2021-09-25 10:00:00
                new BN('1632996000'),   //2021-09-30 10:00:00
                { from: artist }
            );

            console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
            expectEvent.inLogs(result.logs, 'AuctionCreated',{
                nftAddress: this.artion.address,
                tokenId: new BN('1'),
                payToken: this.mockERC20.address
            });

            console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
            await this.mockERC20.mint(bidder1, ether('50'));

            console.log(`
            Bidder1 approves FantomMarketplace to transfer up to 50 wFTM`);
            await this.mockERC20.approve(this.fantomBid.address, ether('50'), {from: bidder1});

            console.log(`
            Mint 50 wFTMs to bidder2 so he can bid the auctioned nft`);
            await this.mockERC20.mint(bidder2, ether('50'));

            console.log(`
            Bidder2 approves FantomMarketplace to transfer up to 50 wFTM`);
            await this.mockERC20.approve(this.fantomBid.address, ether('50'), {from: bidder2});

            console.log(`
            Mint 50 wFTMs to bidder3 so he can bid the auctioned nft`);
            await this.mockERC20.mint(bidder3, ether('50'));

            console.log(`
            Bidder3 approves FantomMarketplace to transfer up to 50 wFTM`);
            await this.mockERC20.approve(this.fantomBid.address, ether('50'), {from: bidder3});

            console.log(`
            Bidder1 place a bid of 20 wFTMs`);
            await this.fantomBid.placeBidWithERC20(this.artion.address, new BN('1'), ether('20'), { from: bidder1 });

            balance = await this.mockERC20.balanceOf(bidder1);
            console.log(`
            *Bidder1's wFTM balance after bidding should be 30 wFTMs`);
            expect(weiToEther(balance)*1).to.be.equal(30);

            console.log(`
            Bidder2 place a bid of 25 wFTMs`);
            await this.fantomBid.placeBidWithERC20(this.artion.address, new BN('1'), ether('25'), { from: bidder2 });

            balance = await this.mockERC20.balanceOf(bidder1);
            console.log(`
            *Bidder1's wFTM balance after bidder2 outbid should be back to 50 wFTMs`);
            expect(weiToEther(balance)*1).to.be.equal(50);

            balance = await this.mockERC20.balanceOf(bidder2);
            console.log(`
            *Bidder2's wFTM balance after bidding should be 25`);
            expect(weiToEther(balance)*1).to.be.equal(25);            

            console.log(`
            Bidder3 place a bid of 30 wFTMs`);
            await this.fantomBid.placeBidWithERC20(this.artion.address, new BN('1'), ether('30'), { from: bidder3 });

            balance = await this.mockERC20.balanceOf(bidder2);
            console.log(`
            *Bidder2's wFTM balance after bidder3 outbid should be back to 50 wFTMs`);
            expect(weiToEther(balance)*1).to.be.equal(50);

            balance = await this.mockERC20.balanceOf(bidder3);
            console.log(`
            *Bidder3's wFTM balance after bidding should be 20`);
            expect(weiToEther(balance)*1).to.be.equal(20);

            console.log(`
            Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
            await this.fantomAuction.setTime(new BN('1632999600'));
            await this.fantomBid.setTime(new BN('1632999600'));

            console.log(`
            The artist tries to make the auction complete`);
            result = await this.fantomAuction.resultAuction(this.artion.address, new BN('1'), {from : artist});

            console.log(`
            *As the platformFee is 2.5%, the platform fee recipient should get 2.5% of (30 - 20) which is 0.25 wFTM.`);
            balance = await this.mockERC20.balanceOf(platformFeeRecipient);
            expect(weiToEther(balance)*1).to.be.equal(0.25);

            console.log(`
            *The artist should get 29.75 wFTM.`);
            balance = await this.mockERC20.balanceOf(artist);
            expect(weiToEther(balance)*1).to.be.equal(29.75);
            
            let nftOwner = await this.artion.ownerOf(new BN('1'));
            console.log(`
            *The owner of the nft now should be the bidder3`);
            expect(nftOwner).to.be.equal(bidder3);

            console.log(`
            *Event AuctionResulted should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1,
            winner = ${bidder3} ,
            payToken = ${this.mockERC20.address},
            unitPrice = 0,
            winningBid = 30`);
            expectEvent.inLogs(result.logs, 'AuctionResulted',{
                nftAddress: this.artion.address,
                tokenId: new BN('1'),
                winner: bidder3,
                payToken: this.mockERC20.address,
                unitPrice: ether('0'),
                winningBid: ether('30')
            });

        })

        it('Scenario 4', async function() {

            console.log(`
            Scenario 4:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 10 FTMs
            Bidder1, bidder2, bidder3 then bid the auction with 10 FTM, 15 FTMs, and 20 FTMs respectively`);

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
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE + 1} FTMs as the gas fees shouldn't be more than 1 FTM`);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.greaterThan(PLATFORM_FEE*1);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.lessThan(PLATFORM_FEE*1 + 1);

            console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
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
            await this.artion.setApprovalForAll(this.fantomAuction.address, true, {from: artist});

            console.log(`
            Let's mock that the current time: 2021-09-25 10:00:00`);
            await this.fantomAuction.setTime(new BN('1632564000'));
            await this.fantomBid.setTime(new BN('1632564000'));

            console.log(`
            The artist auctions his nfts with reserve price of 20 FTMs`);
            result =  await this.fantomAuction.createAuction(
                this.artion.address,
                new BN('1'),
                constants.ZERO_ADDRESS,
                ether('10'),
                new BN('1632564000'),  //2021-09-25 10:00:00
                new BN('1632996000'),   //2021-09-30 10:00:00
                { from: artist }
            );

            console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${constants.ZERO_ADDRESS}`);
            expectEvent.inLogs(result.logs, 'AuctionCreated',{
                nftAddress: this.artion.address,
                tokenId: new BN('1'),
                payToken: constants.ZERO_ADDRESS
            });

            balance1 = await web3.eth.getBalance(bidder1);
            console.log(`
            Bidder1's FTM balance before bidding: ${weiToEther(balance1)}`);

            console.log(`
            Bidder1 places a bid of 10 FTMs`);
            await this.fantomBid.placeBid(this.artion.address, new BN('1'), { from: bidder1, value: ether('10')});            

            balance2 = await web3.eth.getBalance(bidder1);
            console.log(`
            Bidder1's FTM balance after bidding: ${weiToEther(balance2)}`);

            console.log(`
            *The difference of bidder1's FTM balance before and after bidding 
            should be more than 10 but less than 11 assuming that the gas fees are less than 1 FTM`);
            expect(weiToEther(balance1)*1 - weiToEther(balance2)*1).to.be.greaterThan(10);
            expect(weiToEther(balance1)*1 - weiToEther(balance2)*1).to.be.lessThan(11);

            balance3 = await web3.eth.getBalance(bidder2);
            console.log(`
            Bidder2's FTM balance before bidding: ${weiToEther(balance3)}`);

            console.log(`
            Bidder2 places a bid of 15 FTMs`);
            await this.fantomBid.placeBid(this.artion.address, new BN('1'), { from: bidder2, value: ether('15')});

            balance4 = await web3.eth.getBalance(bidder2);
            console.log(`
            Bidder2's FTM balance after bidding: ${weiToEther(balance4)}`);

            console.log(`
            *The difference of bidder2's FTM balance before and after bidding 
            should be more than 15 but less than 16 assuming that the gas fees are less than 1 FTM`);
            expect(weiToEther(balance3)*1 - weiToEther(balance4)*1).to.be.greaterThan(15);
            expect(weiToEther(balance3)*1 - weiToEther(balance4)*1).to.be.lessThan(16);

            balance1 = await web3.eth.getBalance(bidder1);
            console.log(`
            Bidder1's FTM balance after bidder2 outbid bidder1: ${weiToEther(balance1)}`);

            console.log(`
            *The difference of bidder1's FTM balance before and after 
            being outbid by bidder2 should 10`);
            expect(weiToEther(balance1)*1 - weiToEther(balance2)*1).to.be.equal(10);

            balance5 = await web3.eth.getBalance(bidder3);
            console.log(`
            Bidder3's FTM balance before bidding: ${weiToEther(balance5)}`);

            console.log(`
            Bidder3 places a bid of 20 FTMs`);
            await this.fantomBid.placeBid(this.artion.address, new BN('1'), { from: bidder3, value: ether('20')});

            balance6 = await web3.eth.getBalance(bidder3);
            console.log(`
            Bidder3's FTM balance after bidding: ${weiToEther(balance6)}`);

            console.log(`
            *The difference of bidder3's FTM balance before and after bidding 
            should be more than 20 but less than 21 assuming that the gas fees are less than 1 FTM`);
            expect(weiToEther(balance5)*1 - weiToEther(balance6)*1).to.be.greaterThan(20);
            expect(weiToEther(balance5)*1 - weiToEther(balance6)*1).to.be.lessThan(21);

            balance3 = await web3.eth.getBalance(bidder2);
            console.log(`
            Bidder2's FTM balance after bidder3 outbid bidder2: ${weiToEther(balance3)}`);  
            
            console.log(`
            *The difference of bidder2's FTM balance before and after 
            being outbid by bidder3 should 15`);
            expect(weiToEther(balance3)*1 - weiToEther(balance4)*1).to.be.equal(15);

            console.log(`
            Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
            await this.fantomAuction.setTime(new BN('1632999600'));
            await this.fantomBid.setTime(new BN('1632999600'));

            balance1 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            The platform fee recipient's FTM balance 
            before the artist completes the auction: ${weiToEther(balance1)}`);

            balance3 = await web3.eth.getBalance(artist);
            console.log(`
            The artist's FTM balance 
            before he completes the auction: ${weiToEther(balance3)}`);

            console.log(`
            The artist tries to make the auction complete`);
            result = await this.fantomAuction.resultAuction(this.artion.address, new BN('1'), {from : artist});

            balance2 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            The platform fee recipient's FTM balance 
            after the artist completes the auction: ${weiToEther(balance2)}`);

            balance4 = await web3.eth.getBalance(artist);
            console.log(`
            The artist's FTM balance 
            after he completes the auction: ${weiToEther(balance4)}`);

            console.log(`
            *As the platformFee is 2.5%, the platform fee recipient should get 2.5% of (20 - 10) which is 0.25.`);    
            expect((weiToEther(balance2)*1 - weiToEther(balance1)*1).toFixed(2)).to.be.equal('0.25');
            
            console.log(`
            *The difference of the artist's FTM balance before and after 
            the auction completes should be 19.75`);
            expect((weiToEther(balance4)*1 - weiToEther(balance3)*1).toFixed(2)).to.be.equal('19.75');

            
            let nftOwner = await this.artion.ownerOf(new BN('1'));
            console.log(`
            *The owner of the nft now should be the bidder3`);
            expect(nftOwner).to.be.equal(bidder3);

            console.log(`
            *Event AuctionResulted should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1,
            winner = ${bidder3} ,
            payToken = ${constants.ZERO_ADDRESS},
            unitPrice = 0,
            winningBid = 20`);
            expectEvent.inLogs(result.logs, 'AuctionResulted',{
                nftAddress: this.artion.address,
                tokenId: new BN('1'),
                winner: bidder3,
                payToken: constants.ZERO_ADDRESS,
                unitPrice: ether('0'),
                winningBid: ether('20')
            });

        })

        it('Scenario 5', async function() {

            console.log(`
            Scenario 5:
            An artist mints two NFTs from him/herself
            He/She then put them on the marketplace as bundle price of 20 wFTMs
            A buyer then buys them for 20 wFTMs`);

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
            Now minting the first NFT...`);
            let result = await this.artion.mint(artist, 'http://artist.com/art.jpeg', {from: artist, value: ether(PLATFORM_FEE)});
            console.log(`
            NFT1 minted successfully`);

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
            Now minting the second NFT...`);
            result = await this.artion.mint(artist, 'http://artist.com/art2.jpeg', {from: artist, value: ether(PLATFORM_FEE)});
            console.log(`
            NFT2 minted successfully`);

            console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 2, 
            beneficiary = ${artist}, 
            tokenUri = ${'http://artist.com/art2.jpeg'},
            minter = ${artist}`);
            expectEvent.inLogs(result.logs, 'Minted',{
                tokenId: new BN('2'),
                beneficiary: artist,
                tokenUri : 'http://artist.com/art2.jpeg',
                minter : artist
            });

            let balance3 = await web3.eth.getBalance(artist);
            console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

            let balance4 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

            console.log(`
            *The difference of the artist's FTM balance should be more than ${2*PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE + 1} FTM as the gas fees shouldn't be more than 1 FTM`);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.greaterThan(PLATFORM_FEE*2);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.lessThan(PLATFORM_FEE*2 + 1);

            console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE*2} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
            expect(weiToEther(balance4)*1 - weiToEther(balance2)*1).to.be.equal(PLATFORM_FEE*2);            

            console.log(`
            The artist approves the nft to the market`);
            await this.artion.setApprovalForAll(this.fantomBundleMarketplace.address, true, {from: artist});

            console.log(`
            The artist lists the 2 nfts in the bundle market with price 20 wFTM and 
            starting time 2021-09-22 10:00:00 GMT`);
            await this.fantomListingBundleMarketplace.listItem(
                    'mynfts',
                    [this.artion.address, this.artion.address],
                    [new BN('1'),new BN('2')],
                    [new BN('1'), new BN('1')],
                    this.mockERC20.address,
                    ether('20'),
                    new BN('1632304800'), // 2021-09-22 10:00:00 GMT
                    { from : artist }
                    );

            let listing = await this.fantomListingBundleMarketplace.getListing(artist, 'mynfts');
            console.log(`
            *The nfts should be on the bundle marketplace listing`);
            expect(listing.nfts.length).to.be.equal(2);
            expect(listing.nfts[0]).to.be.equal(this.artion.address);
            expect(listing.nfts[1]).to.be.equal(this.artion.address);
            expect(listing.tokenIds[0].toString()).to.be.equal('1');
            expect(listing.tokenIds[1].toString()).to.be.equal('2');
            expect(listing.quantities[0].toString()).to.be.equal('1');
            expect(listing.quantities[1].toString()).to.be.equal('1');
            expect(listing.payToken).to.be.equal(this.mockERC20.address);
            expect(weiToEther(listing.price)*1).to.be.equal(20);
            expect(listing.startingTime.toString()).to.be.equal('1632304800');

            console.log(`
            Mint 50 wFTMs to buyer so he can buy the two nfts`);
            await this.mockERC20.mint(buyer, ether('50'));

            console.log(`
            The buyer approves FantomBundleMarketplace to transfer up to 50 wFTM`);
            await this.mockERC20.approve(this.fantomBundleMarketplace.address, ether('50'), {from: buyer});

            console.log(`
            The buyer buys the nft for 20 wFTMs`);
            result = await this.fantomBundleMarketplace.buyItemWithERC20( // function overloading doesn't work
                'mynfts', 
                this.mockERC20.address, 
                { from: buyer});
                
            console.log(`
            *Event ItemSold should be emitted with correct values: 
            seller = ${artist}, 
            buyer = ${buyer}, 
            bundleId = ${'mynfts'},
            payToken = ${this.mockERC20.address},
            unitPrice = ${ether('0')},
            price = ${ether('20')}`);
            expectEvent.inLogs(result.logs, 'ItemSold',{
                seller: artist,
                buyer: buyer,
                bundleID : 'mynfts',
                payToken : this.mockERC20.address,
                unitPrice: ether('0'),
                price: ether('20')
                });
                
            console.log(`
            *The two nfts now should belong to buyer`);
            let nftOwner = await this.artion.ownerOf(new BN('1'));
            expect(nftOwner).to.be.equal(buyer);
            nftOwner = await this.artion.ownerOf(new BN('2'));
            expect(nftOwner).to.be.equal(buyer);

            console.log(`
            *The artist's wFTM balance now should be 19 wTFM`);
            balance = await this.mockERC20.balanceOf(artist);
            expect(weiToEther(balance)*1).to.be.equal(19);

            console.log(`
            *The platform fee recipient's wFTM balance now should be 1 wTFM`);
            balance = await this.mockERC20.balanceOf(platformFeeRecipient);
            expect(weiToEther(balance)*1).to.be.equal(1);

        })
 
        it('Scenario 6', async function() {

            console.log(`
            Scenario 6:
            An artist mints two NFTs from him/herself
            He/She then put them on the marketplace as bundle price of 20 FTMs
            A buyer then buys them for 20 FTMs`);

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
            Now minting the first NFT...`);
            let result = await this.artion.mint(artist, 'http://artist.com/art.jpeg', {from: artist, value: ether(PLATFORM_FEE)});
            console.log(`
            NFT1 minted successfully`);

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
            Now minting the second NFT...`);
            result = await this.artion.mint(artist, 'http://artist.com/art2.jpeg', {from: artist, value: ether(PLATFORM_FEE)});
            console.log(`
            NFT2 minted successfully`);

            console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 2, 
            beneficiary = ${artist}, 
            tokenUri = ${'http://artist.com/art2.jpeg'},
            minter = ${artist}`);
            expectEvent.inLogs(result.logs, 'Minted',{
                tokenId: new BN('2'),
                beneficiary: artist,
                tokenUri : 'http://artist.com/art2.jpeg',
                minter : artist
            });

            let balance3 = await web3.eth.getBalance(artist);
            console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

            let balance4 = await web3.eth.getBalance(platformFeeRecipient);
            console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

            console.log(`
            *The difference of the artist's FTM balance should be more than ${2*PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE + 1} FTM as the gas fees shouldn't be more than 1 FTM`);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.greaterThan(PLATFORM_FEE*2);
            expect(weiToEther(balance1)*1 - weiToEther(balance3)*1).to.be.lessThan(PLATFORM_FEE*2 + 1);

            console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE*2} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
            expect(weiToEther(balance4)*1 - weiToEther(balance2)*1).to.be.equal(PLATFORM_FEE*2);            

            console.log(`
            The artist approves the nfts to the market`);
            await this.artion.setApprovalForAll(this.fantomBundleMarketplace.address, true, {from: artist});

            console.log(`
            The artist lists the 2 nfts in the bundle market with price 20 wFTM and 
            starting time 2021-09-22 10:00:00 GMT`);
            await this.fantomListingBundleMarketplace.listItem(
                    'mynfts',
                    [this.artion.address, this.artion.address],
                    [new BN('1'),new BN('2')],
                    [new BN('1'), new BN('1')],
                    constants.ZERO_ADDRESS,
                    ether('20'),
                    new BN('1632304800'), // 2021-09-22 10:00:00 GMT
                    { from : artist }
                    );

            let listing = await this.fantomListingBundleMarketplace.getListing(artist, 'mynfts');
            console.log(`
            *The nfts should be on the bundle marketplace listing`);
            expect(listing.nfts.length).to.be.equal(2);
            expect(listing.nfts[0]).to.be.equal(this.artion.address);
            expect(listing.nfts[1]).to.be.equal(this.artion.address);
            expect(listing.tokenIds[0].toString()).to.be.equal('1');
            expect(listing.tokenIds[1].toString()).to.be.equal('2');
            expect(listing.quantities[0].toString()).to.be.equal('1');
            expect(listing.quantities[1].toString()).to.be.equal('1');
            expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
            expect(weiToEther(listing.price)*1).to.be.equal(20);
            expect(listing.startingTime.toString()).to.be.equal('1632304800');
            
            balance1 = await web3.eth.getBalance(artist);
            balance2 = await web3.eth.getBalance(buyer);
            balance3 = await web3.eth.getBalance(platformFeeRecipient);

            console.log(`
            The artist's FTM balance before the nfts are sold: ${weiToEther(balance1)}`);

            console.log(`
            The buyer's FTM balance before the nfts are sold: ${weiToEther(balance2)}`);

            console.log(`
            The platform fee recipient's FTM balance before the nfts are sold: ${weiToEther(balance3)}`);

            console.log(`
            Buyer buys the nft for 20 wFTMs`);
            result = await this.fantomBundleMarketplace.buyItem( // function overloading doesn't work
                'mynfts', 
                { from: buyer, value: ether('20')});
                
            console.log(`
            *Event ItemSold should be emitted with correct values: 
            seller = ${artist}, 
            buyer = ${buyer}, 
            bundleId = ${'mynfts'},
            payToken = ${constants.ZERO_ADDRESS},
            unitPrice = ${ether('0')},
            price = ${ether('20')}`);
            expectEvent.inLogs(result.logs, 'ItemSold',{
                seller: artist,
                buyer: buyer,
                bundleID : 'mynfts',
                payToken : constants.ZERO_ADDRESS,
                unitPrice: ether('0'),
                price: ether('20')
                });
            
            console.log(`
            *The two nfts now should belong to buyer`);
            let nftOwner = await this.artion.ownerOf(new BN('1'));
            expect(nftOwner).to.be.equal(buyer);
            nftOwner = await this.artion.ownerOf(new BN('2'));
            expect(nftOwner).to.be.equal(buyer);            

            balance4 = await web3.eth.getBalance(artist);
            balance5 = await web3.eth.getBalance(buyer);
            balance6 = await web3.eth.getBalance(platformFeeRecipient);

            console.log(`
            The artist's FTM balance after the nft is sold: ${weiToEther(balance4)}`);
            console.log(`
            *The difference of the artist's FTM balance before and after 
            the nfts are sold should be 19`);
            expect((weiToEther(balance4)*1 - weiToEther(balance1)*1).toFixed(2)).to.be.equal('19.00');

            console.log(`
            The buyer's FTM balance after the nfts is sold: ${weiToEther(balance5)}`);
            console.log(`
            *The difference of the buyer's FTM balance before and after
            the nfts are sold should be more than 20 but less than 21 
            assuming that the gas fees are less than 1 FTM`);
            expect(weiToEther(balance2)*1 - weiToEther(balance5)*1).to.be.greaterThan(20);
            expect(weiToEther(balance2)*1 - weiToEther(balance5)*1).to.be.lessThan(21);

            console.log(`
            The platform fee recipient's FTM balance after the nfts are sold: ${weiToEther(balance6)}`);
            console.log(`
            *The difference of the platform fee recipient's FTM balance before and after 
            the nfts are sold should be 1`);
            expect((weiToEther(balance6)*1 - weiToEther(balance3)*1).toFixed(2)).to.be.equal('1.00');


        })
    })

})
