// Load dependencies
const hre = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { expect } = require('chai').use(solidity);
const { expectRevert, time} = require('@openzeppelin/test-helpers');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { callBefore } = require('./utils/before.js');
const {
    ZERO, ONE, TWO, THREE, FOUR,
    mockPayTokenName, mockPayTokenSymbol,
    mockNFTokenName, mockNFTokenSymbol,
    sellerReservePrice
} = require('./utils/index_ethers.js');

// Individual test for the `resultAuction()` function in `FantomAuction`
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
        FantomPriceFeed = await ethers.getContractFactory('FantomPriceFeed');
        MockPriceOracleProxy = await ethers.getContractFactory('MockPriceOracleProxy');

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
        fantomPriceFeed = await FantomPriceFeed.deploy(fantomaddressregistry.address, mockerc20.address);
        await fantomPriceFeed.deployed();
        mockPriceOracleProxy = await MockPriceOracleProxy.deploy();
        await mockPriceOracleProxy.deployed();

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

    describe('Testing `resultAuction()` individually', function () {
        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 50 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('blockchain time increased 50 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`bidder` placed bid below reserve', async function () {
            const bidAttempt = new BigNumber.from("75000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidAttempt)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidAttempt);
        });
        
        it('1) cannot result an auction that hasnt ended as `seller`', async function() {
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, FOUR)).to.be.revertedWith('auction not ended');
        });

        it('2) cannot result an auction that hasnt ended as `other`', async function() {
            await expect(fantomauction.connect(other).resultAuction(mockerc721.address, FOUR)).to.be.revertedWith('_msgSender() must be auction winner or seller');
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

        it('3) cannot result a finished auction that ended with bids below the reserve price', async function() {
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, FOUR)).to.be.revertedWith('highest bid is below reservePrice');
        });

        it('4) cannot result a finished auction that ended with bids below the reserve price as non-owner', async function() {
            await expect(fantomauction.connect(hacker).resultAuction(mockerc721.address, FOUR)).to.be.revertedWith('_msgSender() must be auction winner or seller');
        });

        it('successfully listed auction for `seller` `_tokenId(2)`', async function() {
            time.advanceBlock();
            await expect(
                fantomauction.connect(seller).createAuction(
                    mockerc721.address,
                    TWO,
                    mockerc20.address,
                    sellerReservePrice,
                    new BigNumber.from(Number(await time.latest())+5),
                    false,
                    new BigNumber.from(Number(await time.latest())+305)))
                .to.emit(fantomauction, 'AuctionCreated')
                .withArgs(mockerc721.address, TWO, mockerc20.address);
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

        it('bid successfully placed at `sellerReservePrice` by `winner`', async function () {
            await expect(fantomauction.connect(winner).placeBid(mockerc721.address, TWO, sellerReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, TWO, winner.address, sellerReservePrice);
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

        it('5) cannot result a successful auction as `other`', async function() {
            await expect(fantomauction.connect(other).resultAuction(mockerc721.address, TWO)).to.be.revertedWith('_msgSender() must be auction winner or seller');
        });

        it('6) test auction `_tokenId(4)` successfully resulted by `seller`', async function() {
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, TWO)).to.emit(fantomauction, 'AuctionResulted').withArgs(seller.address, mockerc721.address, TWO, winner.address, mockerc20.address, ZERO, sellerReservePrice);
        });

        it('7) cannot result an auction that has already been resulted as `seller`', async function() {
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, TWO)).to.be.revertedWith('_msgSender() must be auction winner or seller');
        });

        it('8) cannot result an auction that has already been resulted as `other`', async function() {
            await expect(fantomauction.connect(other).resultAuction(mockerc721.address, TWO)).to.be.revertedWith('_msgSender() must be auction winner or seller');
        });

        it('9) cannot result an auction that has already been resulted as `winner`', async function() {
            await expect(fantomauction.connect(winner).resultAuction(mockerc721.address, TWO)).to.be.revertedWith('_msgSender() must be auction winner or seller');
        });

        it('successfully listed auction for `seller` `_tokenId(3)`', async function () {
            await expect(
                fantomauction.connect(seller).createAuction(
                    mockerc721.address,
                    THREE,
                    mockerc20.address,
                    sellerReservePrice,
                    new BigNumber.from(Number(await time.latest())+1),
                    false,
                    new BigNumber.from(Number(await time.latest())+604800)))
                .to.emit(fantomauction, 'AuctionCreated')
                .withArgs(mockerc721.address, THREE, mockerc20.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 500 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('bid successfully placed at `sellerReservePrice` by `bidder`', async function () {
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, THREE, sellerReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, THREE, bidder.address, sellerReservePrice);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 650000 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+650000);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 5000 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+5000);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`bidder` successfully withdrew bid once grace window started', async function () {
            await expect(fantomauction.connect(bidder).withdrawBid(mockerc721.address, THREE)).to.emit(fantomauction, 'BidWithdrawn').withArgs(mockerc721.address, THREE, bidder.address, sellerReservePrice);
        });

        it('10) cannot result an auction that ended and had the highest bidder withdraw', async function() {
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, THREE)).to.be.revertedWith('no open bids');
        });
    });
});