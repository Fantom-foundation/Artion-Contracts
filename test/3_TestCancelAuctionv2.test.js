// Load dependencies
const hre = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { expect } = require('chai').use(solidity);
const { expectRevert, time} = require('@openzeppelin/test-helpers');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { callBefore } = require('./utils/before.js');
const {
    ZERO, ONE, THREE, FOUR,
    mockPayTokenName, mockPayTokenSymbol, mockPayTokenMintAmount,
    mockNFTokenName, mockNFTokenSymbol,
    sellerReservePrice, bidderBidAmountMinimum
} = require('./utils/index_ethers.js');

// Individual test for the `cancelAuction()` function in `FantomAuction`
contract('FantomAuction', async function () {

    before(async function () {
        // Get all compiled contracts
        MockERC20 = await ethers.getContractFactory('MockERC20');
        MockERC721 = await ethers.getContractFactory('MockERC721');
        FantomAuction = await ethers.getContractFactory('MockFantomAuction');
        FantomArtion = await ethers.getContractFactory('Artion');
        FantomMarketplace = await ethers.getContractFactory('FantomMarketplace');
        FantomBundleMarketplace = await ethers.getContractFactory('FantomBundleMarketplace');
        FantomAddressRegistry = await ethers.getContractFactory('FantomAddressRegistry');
        FantomTokenRegistry = await ethers.getContractFactory('FantomTokenRegistry');
        FantomRoyaltyRegistry = await ethers.getContractFactory('FantomRoyaltyRegistry');

        // Get all users in the unit test
        [owner, bidder, seller, winner, hacker, other] = await ethers.getSigners();

        // Deploy all contracts that are part of the unit test
        mockerc20 = await MockERC20.deploy(mockPayTokenName, mockPayTokenSymbol, ZERO);
        await mockerc20.deployed();
        mockerc721 = await MockERC721.deploy(mockNFTokenName, mockNFTokenSymbol);
        await mockerc721.deployed();
        fantomauction = await FantomAuction.deploy();
        await fantomauction.deployed();
        fantomartion = await FantomArtion.deploy(owner.address, ONE);
        await fantomartion.deployed();
        fantommarketplace = await FantomMarketplace.deploy();
        await fantommarketplace.deployed();
        fantombundlemarketplace = await FantomBundleMarketplace.deploy();
        await fantombundlemarketplace.deployed();
        fantomaddressregistry = await FantomAddressRegistry.deploy();
        await fantomaddressregistry.deployed();
        fantomtokenregistry = await FantomTokenRegistry.deploy();
        await fantomtokenregistry.deployed();
        fantomRoyaltyRegistry = await FantomRoyaltyRegistry.deploy();
        await fantomtokenregistry.deployed();

        // Call function `callBefore()` in `./utils/before.js` to establish testing environment
        await callBefore();

        // Create initial test auction for the `cancelAuction()` test
        await fantomauction.connect(seller).createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest())+5),
            false,
            new BigNumber.from(Number(await time.latest())+305)
        );
    });

    // The `afterEach()` function will run after each test and is used to keep track of
    // block time as the test moves time around to account for time-constrained functionality.
    afterEach(async function () {
        const timeNow = new BigNumber.from(Number(await time.latest()));
        fantomauction.connect(owner).hardhatTimestamp(timeNow);
    });

    describe('Testing `cancelAuction()` individually', function () {

        it('1) cannot cancel an auction not owned by the auction contract', async function() {
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, 1)).to.be.revertedWith('sender must be owner');
        });

        it('2) cannot cancel an auction you do not own', async function() {
            await expect(fantomauction.connect(other).cancelAuction(mockerc721.address, 4)).to.be.revertedWith('sender must be owner');
        });

        it('3) test auction cancelled successfully by user `seller`', async function() {
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)).to.emit(fantomauction, 'AuctionCancelled').withArgs(mockerc721.address, FOUR);
        });

        it('4) cannot cancel an auction that has already been cancelled', async function() {
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)).to.be.revertedWith('sender must be owner');
        });

        it('5) cancelled auction NFT successfully transferred ownership back to `seller`', async function() {
            const result = await mockerc721.connect(seller).ownerOf(FOUR);
            expect((result).toString()).to.equal(seller.address);
        });

        it('6) successfully relisted auction for `seller` `_tokenId(4)` after cancelling', async function() {
            await expect(
                fantomauction.connect(seller).createAuction(
                    mockerc721.address,
                    FOUR,
                    mockerc20.address,
                    sellerReservePrice,
                    new BigNumber.from(Number(await time.latest())+5),
                    false,
                    new BigNumber.from(Number(await time.latest())+500)))
                .to.emit(fantomauction, 'AuctionCreated')
                .withArgs(mockerc721.address, FOUR, mockerc20.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 50 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 50 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('bid successfully placed at `minBidIncrement`', async function () {
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidderBidAmountMinimum)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidderBidAmountMinimum);
        });

        it('7) cannot cancel active auction that you dont own', async function() {
            await expect(fantomauction.connect(other).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
        });

        it('8) auction contract cannot cancel an auction they dont own', async function() {
            await expect(fantomauction.connect(owner).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
        });

        it('9) successfully cancelled auction that has bids below reserve price as `seller`', async function() {
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)).to.emit(fantomauction, 'AuctionCancelled').withArgs(mockerc721.address, FOUR);
        });

        it('10) `MockERC20` tokens properly refunded to bidder after cancelled auction', async function () {
            expect(await mockerc20.connect(bidder).balanceOf(bidder.address)).to.be.bignumber.equal(mockPayTokenMintAmount);
        });

        it('11) successfully relisted auction for `seller` `_tokenId(4)` after cancelling auction with bids', async function() {
            await expect(
                fantomauction.connect(seller).createAuction(
                    mockerc721.address,
                    FOUR,
                    mockerc20.address,
                    sellerReservePrice,
                    new BigNumber.from(Number(await time.latest())+5),
                    false,
                    new BigNumber.from(Number(await time.latest())+305)))
                .to.emit(fantomauction, 'AuctionCreated')
                .withArgs(mockerc721.address, FOUR, mockerc20.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 50 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 50 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('bid successfully placed at `minBidIncrement`', async function () {
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidderBidAmountMinimum)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidderBidAmountMinimum);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 250 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+250);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 250 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+250);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('12) cannot cancel an auction that has ended with bids below reserve price as `bidder` or `winner` (must be arranged via resultFailedAuction())', async function() {
            await expect(fantomauction.connect(bidder).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
        });


        it('13) successfully cancelled auction that ended with bids below reserve price as `seller`', async function() {
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)).to.emit(fantomauction, 'AuctionCancelled').withArgs(mockerc721.address, FOUR);
        });

        it('14) cancelled auction NFT successfully transferred ownership back to `seller`', async function() {
            const result = await mockerc721.connect(seller).ownerOf(FOUR);
            expect((result).toString()).to.equal(seller.address);
        });

        it('15) successfully relisted auction for `seller` `_tokenId(4)` after cancelling ended auction with bids', async function() {
            time.advanceBlock();
            await expect(
                fantomauction.connect(seller).createAuction(
                    mockerc721.address,
                    FOUR,
                    mockerc20.address,
                    sellerReservePrice,
                    new BigNumber.from(Number(await time.latest())+5),
                    false,
                    new BigNumber.from(Number(await time.latest())+305)))
                .to.emit(fantomauction, 'AuctionCreated')
                .withArgs(mockerc721.address, FOUR, mockerc20.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 50 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 50 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`_tokenId(4)` successfully in escrow with auction contract after relisting by `seller`', async function() {
            const result = await mockerc721.connect(seller).ownerOf(FOUR);
            expect((result).toString()).to.equal(fantomauction.address);
        });

        it('bid successfully placed at `sellerReservePrice` by `winner`', async function () {
            await expect(fantomauction.connect(winner).placeBid(mockerc721.address, FOUR, sellerReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, winner.address, sellerReservePrice);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 500 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 500 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('16) cannot cancel an auction that has ended with bids >= reserve price as `seller`', async function() {
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('Highest bid is currently above reserve price');
        });

        it('17) cannot cancel an auction that has ended with bids >= reserve price as `other`', async function() {
            await expect(fantomauction.connect(other).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
        });

        it('18) cannot cancel an auction that has ended with bids >= reserve price as `winner`', async function() {
            await expect(fantomauction.connect(winner).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
        });

        it('test auction `_tokenId(4)` successfully resulted by `seller`', async function() {
            time.advanceBlock();
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, FOUR)).to.emit(fantomauction, 'AuctionResulted').withArgs(seller.address, mockerc721.address, FOUR, winner.address, mockerc20.address, ZERO, sellerReservePrice);
        });

        it('19) cannot cancel an auction that has ended successfully and has been resulted as `seller`', async function() {
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
        });

        it('20) cannot cancel an auction that has ended successfully and has been resulted as `other`', async function() {
            await expect(fantomauction.connect(other).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
        });
    });
});