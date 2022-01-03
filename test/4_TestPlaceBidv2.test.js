// Load dependencies
const hre = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { expect } = require('chai').use(solidity);
const { expectRevert, time} = require('@openzeppelin/test-helpers');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { callBefore } = require('./utils/before.js');
const {
    ZERO, ONE, TWO, FOUR,
    mockPayTokenName, mockPayTokenSymbol, mockPayTokenMintAmount,
    mockNFTokenName, mockNFTokenSymbol,
    sellerReservePrice, sellerNewReservePrice, bidderBidAmountMinimum
} = require('./utils/index_ethers.js');

// Individual test for the `placeBid()` function in `FantomAuction`
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

    describe('Testing `placeBid()` individually', function () {

        it('1) cannot place a bid before auction starts', async function() {
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, sellerReservePrice)).to.be.revertedWith('bidding before auction started');
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

        it('2) cannot place a bid of zero', async function() {
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, ZERO)).to.be.revertedWith('failed to outbid highest bidder');
        });

        it('3) cannot place bids below `minBidIncrement`', async function () {
            const bidAttempt = new BigNumber.from("24000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR,bidAttempt)).to.be.revertedWith('failed to outbid highest bidder');
        });

        it('4) bid successfully placed at `minBidIncrement`', async function () {
            const bidAttempt = new BigNumber.from("25000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR,bidAttempt)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidAttempt);
        });

        it('`MockERC20` tokens properly transferred to auction contract', async function () {
            const amount = new BigNumber.from("1975000000000000000000");
            expect(await mockerc20.connect(owner).balanceOf(bidder.address)).to.be.bignumber.equal(amount);
        });

        it('auction contract has the correct amount of `MockERC20` tokens', async function () {
            const amount = new BigNumber.from("25000000000000000000");
            expect(await mockerc20.connect(owner).balanceOf(fantomauction.address)).to.be.bignumber.equal(amount);
        });

        it('5) also cannot place bids below `minBidIncrement` after bid placed', async function () {
            const bidAttempt = new BigNumber.from("24000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidAttempt)).to.be.revertedWith('failed to outbid highest bidder');
        });

        it('6) previous bidder `bidder` successfully outbid by `other`', async function () {
            const bidAttempt = new BigNumber.from("50000000000000000000");
            await expect(fantomauction.connect(other).placeBid(mockerc721.address, FOUR, bidAttempt)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, other.address, bidAttempt);
        });

        it('auction contract has the correct amount of `MockERC20` tokens', async function () {
            const amount = new BigNumber.from("50000000000000000000");
            expect(await mockerc20.connect(owner).balanceOf(fantomauction.address)).to.be.bignumber.equal(amount);
        });

        it('7) previous bidder `other` successfully outbid by `bidder`', async function () {
            const bidAttempt = new BigNumber.from("75000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidAttempt)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidAttempt);
        });

        it('auction contract has the correct amount of `MockERC20` tokens', async function () {
            const amount = new BigNumber.from("75000000000000000000");
            expect(await mockerc20.connect(owner).balanceOf(fantomauction.address)).to.be.bignumber.equal(amount);
        });

        it('8) `MockERC20` tokens properly refunded to bidder after being outbid and placing new bid', async function () {
            const amount = new BigNumber.from("1925000000000000000000");
            expect(await mockerc20.connect(bidder).balanceOf(bidder.address)).to.be.bignumber.equal(amount);
        });

        it('9) `MockERC20` tokens properly transferred back to `other` after `bidder` outbid `other`', async function () {
            expect(await mockerc20.connect(other).balanceOf(other.address)).to.be.bignumber.equal(mockPayTokenMintAmount);
        });

        it('10) bid successfully placed at `sellerReservePrice` by `winner`', async function () {
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

        it('11) cannot place a bid after auction has ended', async function() {
            await expect(fantomauction.connect(other).placeBid(mockerc721.address, FOUR, sellerReservePrice)).to.be.revertedWith('bidding outside auction window');
        });

        it('successfully listed auction for `seller` `_tokenId(2)`', async function () {
            await expect(
                fantomauction.connect(seller).createAuction(
                    mockerc721.address,
                    TWO,
                    mockerc20.address,
                    sellerReservePrice,
                    new BigNumber.from(Number(await time.latest())+1),
                    false,
                    new BigNumber.from(Number(await time.latest())+604800)))
                .to.emit(fantomauction, 'AuctionCreated')
                .withArgs(mockerc721.address, TWO, mockerc20.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('blockchain time increased 500 seconds', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('12) bid successfully placed at `bidderBidAmountMinimum` by `bidder`', async function () {
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, TWO, bidderBidAmountMinimum)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, TWO, bidder.address, bidderBidAmountMinimum);
        });

        it('`seller` successfully lowered reserve price to `sellerNewReservePrice`', async function () {
            await expect(fantomauction.connect(seller).updateAuctionReservePrice(mockerc721.address, TWO, sellerNewReservePrice)).to.emit(fantomauction, 'UpdateAuctionReservePrice').withArgs(mockerc721.address, TWO, mockerc20.address, sellerNewReservePrice);
        });

        it('13) bid successfully placed at `sellerNewReservePrice` by `bidder`', async function () {
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, TWO, sellerNewReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, TWO, bidder.address, sellerNewReservePrice);
        });
    });
});