// 3_TestCancelAuctionv2.test.js tests through each line of the function individually
// to cover the entire scope of the function. The `cancelAuction()` function is tested
// in 8 parts using 30 steps to cover the whole scope of the function. 
// The specific order of these steps is as follows:
//
// 1) Checks to ensure you cannot cancel an auction not owned by the auction contract
// 2) Checks to ensure you cannot cancel an auction you don't own
// 3) Checks that an auction owner can successfully cancel their auction
// 4) Checks that an auction that has been cancelled cannot be cancelled again
// 5) Checks that cancelled auctions transfer the NFT back to the proper owner
// 6) Checks that an NFT owner can relist an auction after cancelling
// 7) Places a bid on the relisted auction
// 8) Checks that a relisted auction cannot be cancelled if you don't own it
// 9) Checks to ensure the auction contract cannot cancel an auction
// 10) Checks that a seller can cancel their auction after receiving a bid
// 11) Checks that the top bidder of a cancelled auction is properly refunded
// 12) Checks that an auction owner can relist an auction they cancelled that had bids
// 13) Places a bid on the relisted auction
// 14) Checks that an auction that has ended with bids below reserve price cannot be cancelled by non-owner
// 15) Checks that an auction owner can cancel auctions that ended with bids below reserve price
// 16) Checks that the cancelled auction NFT is transferred back to the owner
// 17) Checks that an auction owner can relist an auction that ended with bids below reserve price
// 18) Checks that the relisted auction has been successfully escrowed back to the auction contract
// 19) Places a bid at the reserve price on the relisted auction
// 20) Checks to ensure the auction owner cannot cancel auctions that recevied bids above reserve price
// 21) Checks to ensure the auction non-owners cannot cancel auctions that recevied bids above reserve price
// 22) Checks to ensure the auction top bidders cannot cancel auctions that recevied bids above reserve price
// 23) Results the auction successfully by the seller
// 24) Checks to ensure that an auction that ended successfully and has been resulted cannot be cancelled by the owner
// 25) Checks to ensure that an auction that ended successfully and has been resulted cannot be cancelled by non-owners
// 26) Lists a new auction by the seller
// 27) Places a bid successfully on the new auction
// 28) Checks to ensure that the bidder can call resultFailedAuction
// 29) Checks to ensure that NFT is transferred back to the owner after calling resultFailedAuction
// 30) Checks to ensure the highest bidder was properly refunded after calling resultFailedAuction

// Load dependencies
const hre = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { expect } = require('chai').use(solidity);
const { expectRevert, time} = require('@openzeppelin/test-helpers');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { callBefore } = require('./utils/before.js');
const {
    ZERO, ONE, THREE, FOUR, FIVE,
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

    describe('Testing `cancelAuction()` individually', function () {

        it('`cancelAuction()` Part 1/8 passed', async function() {
            // 1) cannot cancel an auction not owned by the auction contract
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, 1)).to.be.revertedWith('sender must be owner');
            // 2) cannot cancel an auction you do not own
            await expect(fantomauction.connect(other).cancelAuction(mockerc721.address, 4)).to.be.revertedWith('sender must be owner');
            // 3) test auction cancelled successfully by user `seller`
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)).to.emit(fantomauction, 'AuctionCancelled').withArgs(mockerc721.address, FOUR);
            // 4) cannot cancel an auction that has already been cancelled
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)).to.be.revertedWith('sender must be owner');
            // 5) cancelled auction NFT successfully transferred ownership back to `seller`
            const fiveResult = await mockerc721.connect(seller).ownerOf(FOUR);
            expect((fiveResult).toString()).to.equal(seller.address);
            // 6) successfully relisted auction for `seller` `_tokenId(4)` after cancelling
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

        it('`cancelAuction()` Part 2/8 passed', async function () {
            // 7) bid successfully placed at `minBidIncrement`
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidderBidAmountMinimum)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidderBidAmountMinimum);
            // 8) cannot cancel active auction that you dont own
            await expect(fantomauction.connect(other).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
            // 9) auction contract cannot cancel an auction they dont own
            await expect(fantomauction.connect(owner).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
            // 10) successfully cancelled auction that has bids below reserve price as `seller`
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)).to.emit(fantomauction, 'AuctionCancelled').withArgs(mockerc721.address, FOUR);
            // 11) `MockERC20` tokens properly refunded to bidder after cancelled auction
            expect(await mockerc20.connect(bidder).balanceOf(bidder.address)).to.be.bignumber.equal(mockPayTokenMintAmount);
            // 12) successfully relisted auction for `seller` `_tokenId(4)` after cancelling auction with bids
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

        it('`cancelAuction()` Part 3/8 passed', async function () {
            // 13) bid successfully placed at `minBidIncrement`
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidderBidAmountMinimum)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidderBidAmountMinimum);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+250);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        // Increase blockchain time with a test expect (hardhat workaround)
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+250);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`cancelAuction()` Part 4/8 passed', async function() {
            // 14) cannot cancel an auction that has ended with bids below reserve price as `bidder` or `winner` (must be arranged via resultFailedAuction())
            await expect(fantomauction.connect(bidder).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
            // 15) successfully cancelled auction that ended with bids below reserve price as `seller`
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)).to.emit(fantomauction, 'AuctionCancelled').withArgs(mockerc721.address, FOUR);
            // 16) cancelled auction NFT successfully transferred ownership back to `seller`
            const fifteenResult = await mockerc721.connect(seller).ownerOf(FOUR);
            expect((fifteenResult).toString()).to.equal(seller.address);
            // 17) successfully relisted auction for `seller` `_tokenId(4)` after cancelling ended auction with bids
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

        it('`cancelAuction()` Part 5/8 passed', async function () {
            // 18) `_tokenId(4)` successfully in escrow with auction contract after relisting by `seller`
            const sixteenResult = await mockerc721.connect(seller).ownerOf(FOUR);
            expect((sixteenResult).toString()).to.equal(fantomauction.address);
            // 19) bid successfully placed at `sellerReservePrice` by `winner`
            await expect(fantomauction.connect(winner).placeBid(mockerc721.address, FOUR, sellerReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, winner.address, sellerReservePrice);
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

        it('`cancelAuction()` Part 6/8 passed', async function() {
            // 20) cannot cancel an auction that has ended with bids >= reserve price as `seller`
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('Highest bid is currently above reserve price');
            // 21) cannot cancel an auction that has ended with bids >= reserve price as `other`
            await expect(fantomauction.connect(other).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
            // 22) cannot cancel an auction that has ended with bids >= reserve price as `winner`
            await expect(fantomauction.connect(winner).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
            // 23) test auction `_tokenId(4)` successfully resulted by `seller`
            await expect(fantomauction.connect(seller).resultAuction(mockerc721.address, FOUR)).to.emit(fantomauction, 'AuctionResulted').withArgs(seller.address, mockerc721.address, FOUR, winner.address, mockerc20.address, ZERO, sellerReservePrice);
            // 24) cannot cancel an auction that has ended successfully and has been resulted as `seller`
            await expect(fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
            // 25) cannot cancel an auction that has ended successfully and has been resulted as `other`
            await expect(fantomauction.connect(other).cancelAuction(mockerc721.address, FOUR)).to.be.revertedWith('sender must be owner');
            // 26) successfully listed auction for `seller` `_tokenId(5)` after cancelling
            await expect(
                fantomauction.connect(seller).createAuction(
                    mockerc721.address,
                    FIVE,
                    mockerc20.address,
                    sellerReservePrice,
                    new BigNumber.from(Number(await time.latest())+5),
                    false,
                    new BigNumber.from(Number(await time.latest())+500)))
                .to.emit(fantomauction, 'AuctionCreated')
                .withArgs(mockerc721.address, FIVE, mockerc20.address);
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

        it('`cancelAuction()` Part 7/8 passed', async function () {
            // 27) bid successfully placed at `minBidIncrement`
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FIVE, bidderBidAmountMinimum)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FIVE, bidder.address, bidderBidAmountMinimum);
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

        it('`cancelAuction()` Part 8/8 passed', async function() {
            // 28) successfully called `resultFailedAuction` for `bidder` for `_tokenId(5)`
            await expect(
                fantomauction.connect(bidder).resultFailedAuction(
                    mockerc721.address,
                    FIVE))
                .to.emit(fantomauction, 'AuctionCancelled')
                .withArgs(mockerc721.address, FIVE);
            // 29) `_tokenId(5)` successfully transferred back to original owner(seller.address)
            const twentysevenResult = await mockerc721.connect(seller).ownerOf(FIVE);
            expect((twentysevenResult).toString()).to.equal(seller.address);
            // 30) highest bidder was successfully refunded their highest bid
            expect(await mockerc20.connect(bidder).balanceOf(bidder.address)).to.be.bignumber.equal(mockPayTokenMintAmount);
        });
    });
});