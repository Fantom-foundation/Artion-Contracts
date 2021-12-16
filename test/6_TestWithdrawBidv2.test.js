// 6_TestWithdrawBidv2.test.js tests through each line of the function individually
// to cover the entire scope of the function. The `withdrawBid()` function is tested
// in 4 parts using 6 steps to cover the whole scope of the function. 
// The specific order of these steps is as follows:
//
// 1) Places a bid on test auction at sellerReservePrice
// 2) Checks to ensure you cannot withdraw bid if you're not currently the highest bidder
// 3) Checks to ensure the bidder cannot withdraw their bid before the auction ends
// 4) Checks to ensure the bidder cannot withdraw their bid immediately before the auction ends
// 5) Checks to ensure the bidder cannot withdraw their bid immediately before the withdraw grace window
// 6) Checks to ensure the bidder can withdraw their bid once the grace window has started

// Load dependencies
const hre = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { expect } = require('chai').use(solidity);
const { expectRevert, time} = require('@openzeppelin/test-helpers');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { callBefore } = require('./utils/before.js');
const {
    ZERO, ONE, TWO,
    mockPayTokenName, mockPayTokenSymbol,
    mockNFTokenName, mockNFTokenSymbol,
    sellerReservePrice, sellerNewReservePrice, bidderBidAmountMinimum
} = require('./utils/index_ethers.js');

// Individual test for the `withdrawBid()` function in `FantomAuction`
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
            TWO,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest())+1),
            false,
            new BigNumber.from(Number(await time.latest())+604800)
        );
    });

    // The `afterEach()` function will run after each test and is used to keep track of
    // block time as the test moves time around to account for time-constrained functionality.
    afterEach(async function () {
        const timeNow = new BigNumber.from(Number(await time.latest()));
        fantomauction.connect(owner).hardhatTimestamp(timeNow);
    });

    describe('Testing `withdrawBid()` individually', function () {

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+10);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`withdrawBid()` Part 1/4 passed', async function () {
            // 1) bid successfully placed at `sellerReservePrice` by `bidder`
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, TWO, sellerReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, TWO, bidder.address, sellerReservePrice);
            // 2) cannot withdraw a bid if youre not the current highest bidder
            await expect(fantomauction.connect(hacker).withdrawBid(mockerc721.address, TWO)).to.be.revertedWith('you are not the highest bidder');
            // 3) `bidder` cannot withdraw a bid before auction ends
            await expect(fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)).to.be.revertedWith('can withdraw only after 12 hours (after auction ended)');
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+604750);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`withdrawBid()` Part 2/4 passed', async function () {
            // 4) `bidder` cannot withdraw a bid immediately before auction ends
            await expect(fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)).to.be.revertedWith('can withdraw only after 12 hours (after auction ended)');
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+43200);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`withdrawBid()` Part 3/4 passed', async function () {
            // 5) `bidder` cannot withdraw a bid immediately before grace window
            await expect(fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)).to.be.revertedWith('can withdraw only after 12 hours (after auction ended)');
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

        it('`withdrawBid()` Part 4/4 passed', async function () {
            // 6) `bidder` successfully withdrew bid once grace window started
            await expect(fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)).to.emit(fantomauction, 'BidWithdrawn').withArgs(mockerc721.address, TWO, bidder.address, sellerReservePrice);
        });
    });
});