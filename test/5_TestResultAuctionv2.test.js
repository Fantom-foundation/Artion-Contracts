// 5_TestResultAuctionv2.test.js tests through each line of the function individually
// to cover the entire scope of the function. The `resultAuction()` function is tested
// in 6 parts using 16 steps to cover the whole scope of the function. 
// The specific order of these steps is as follows:
//
// 1) Places a bid below reserve price on test auction
// 2) Checks to ensure an auction that hasn't ended cannot be resulted by the owner
// 3) Checks to ensure an auction that hasn't ended cannot be resulted by non-owners
// 4) Checks to ensure an auction that ended with bids below reserve cannot be resulted by the owner
// 5) Checks to ensure an auction that ended with bids below reserve cannot be resulted by non-owners
// 6) Lists another test auction by the seller
// 7) Places a bid successfully at the sellerReservePrice on the new auction
// 8) Checks to ensure an auction that ended with bids above reserve price cannot be resulted by non-owner/non-winner
// 9) Checks that auctions that ended with bids above reserve price can be resulted
// 10) Checks to ensure auctions that have already been resulted cannot be resulted again by the seller
// 11) Checks to ensure auctions that have already been resulted cannot be resulted again by non-owner/non-winner
// 12) Checks to ensure auctions that have already been resulted cannot be resulted again by the winner
// 13) Lists another test auction by the seller
// 14) Places a bid successfully at the sellerReservePrice on the new auction
// 15) Withdraws the bid by the bidder before the grace window ended
// 16) Checks to ensure that auctions that ended and had the bidder withdraw their bid cannot then be resulted

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
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`resultAuction()` Part 1/6 passed', async function() {
            // 1) `bidder` placed bid below reserve
            const bidAttemptOne = new BigNumber.from("75000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidAttemptOne)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidAttemptOne);
            // 2) cannot result an auction that hasnt ended as `seller`
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, FOUR)).to.be.revertedWith('auction not ended');
            // 3) cannot result an auction that hasnt ended as `other`
            await expect(fantomauction.connect(other).resultAuction(mockerc721.address, FOUR)).to.be.revertedWith('_msgSender() must be auction winner or seller');
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`resultAuction()` Part 2/6 passed', async function() {
            // 4) cannot result a finished auction that ended with bids below the reserve price
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, FOUR)).to.be.revertedWith('highest bid is below reservePrice');
            // 5) cannot result a finished auction that ended with bids below the reserve price as non-owner
            await expect(fantomauction.connect(hacker).resultAuction(mockerc721.address, FOUR)).to.be.revertedWith('_msgSender() must be auction winner or seller');
            // 6) successfully listed auction for `seller` `_tokenId(2)`
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
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+50);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`resultAuction()` Part 3/6 passed', async function () {
            // 7) bid successfully placed at `sellerReservePrice` by `winner`
            await expect(fantomauction.connect(winner).placeBid(mockerc721.address, TWO, sellerReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, TWO, winner.address, sellerReservePrice);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`resultAuction()` Part 4/6 passed', async function () {
            // 8) cannot result a successful auction as `other`
            await expect(fantomauction.connect(other).resultAuction(mockerc721.address, TWO)).to.be.revertedWith('_msgSender() must be auction winner or seller');
            // 9) test auction `_tokenId(4)` successfully resulted by `seller`
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, TWO)).to.emit(fantomauction, 'AuctionResulted').withArgs(seller.address, mockerc721.address, TWO, winner.address, mockerc20.address, ZERO, sellerReservePrice);
            // 10) cannot result an auction that has already been resulted as `seller`
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, TWO)).to.be.revertedWith('_msgSender() must be auction winner or seller');
            // 11) cannot result an auction that has already been resulted as `other`
            await expect(fantomauction.connect(other).resultAuction(mockerc721.address, TWO)).to.be.revertedWith('_msgSender() must be auction winner or seller');
            // 12) cannot result an auction that has already been resulted as `winner`
            await expect(fantomauction.connect(winner).resultAuction(mockerc721.address, TWO)).to.be.revertedWith('_msgSender() must be auction winner or seller');
            // 13) successfully listed auction for `seller` `_tokenId(3)`
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
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`resultAuction()` Part 5/6 passed', async function () {
            // 14) bid successfully placed at `sellerReservePrice` by `bidder`
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, THREE, sellerReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, THREE, bidder.address, sellerReservePrice);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+650000);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+5000);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`resultAuction()` Part 6/6 passed', async function() {
            // 15) `bidder` successfully withdrew bid once grace window started
            await expect(fantomauction.connect(bidder).withdrawBid(mockerc721.address, THREE)).to.emit(fantomauction, 'BidWithdrawn').withArgs(mockerc721.address, THREE, bidder.address, sellerReservePrice);
            // 16) cannot result an auction that ended and had the highest bidder withdraw
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, THREE)).to.be.revertedWith('no open bids');
        });
    });
});