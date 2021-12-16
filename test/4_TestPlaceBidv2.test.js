// 4_TestPlaceBidv2.test.js tests through each line of the function individually
// to cover the entire scope of the function. The `placeBid()` function is tested
// in 4 parts using 19 steps to cover the whole scope of the function. 
// The specific order of these steps is as follows:
//
// 1) Checks that bids cannot be placed before auctions start
// 2) Checks to ensure zero bids cannot be placed
// 3) Checks to ensure bids cannot be placed below minBidIncrement
// 4) Places bid successfully at the minBidIncrement
// 5) Checks that the tokens bid are properly transferred to the auction contract
// 6) Checks the balances to ensure they match up properly after a bid was placed
// 7) Checks to ensure a bid below minBidIncrement cannot be placed after a bid has already been placed
// 8) Successfully places a bid to outbid the current bid
// 9) Checks the balances to ensure they match up properly after a bid was placed
// 10) Places another bid to successfully bid the previous outbid
// 11) Checks the balances to ensure they match up properly after a bid was placed
// 12) Checks to ensure the tokens of the previous bidder are properly transferred back after being outbid
// 13) Again checks to ensure the tokens of the previous bidder are properly transferred back after being outbid
// 14) Places a bid successfully at the sellerReservePrice
// 15) Checks to ensure a bid cannot be placed after an auction has ended
// 16) Lists another test auction
// 17) Places a bid successfully on the new auction at the minBidIncrement
// 18) Checks to ensure the seller can lower the sellerReservePrice of an auction that has a bid below reserve price
// 19) Places a bid successfully at the new sellerReservePrice after lowering

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

    describe('Testing `placeBid()` individually', function () {

        it('`placeBid()` Part 1/4 passed', async function() {
            // 1) cannot place a bid before auction starts
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, sellerReservePrice)).to.be.revertedWith('bidding before auction started');
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

        it('`placeBid()` Part 2/4 passed', async function () {
            // 2) cannot place a bid of zero
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, ZERO)).to.be.revertedWith('failed to outbid highest bidder');
            // 3) cannot place bids below `minBidIncrement`
            const bidAttemptThree = new BigNumber.from("24000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR,bidAttemptThree)).to.be.revertedWith('failed to outbid highest bidder');
            // 4) bid successfully placed at `minBidIncrement`
            const bidAttemptFour = new BigNumber.from("25000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR,bidAttemptFour)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidAttemptFour);
            // 5) `MockERC20` tokens properly transferred to auction contract
            const amountFive = new BigNumber.from("1975000000000000000000");
            expect(await mockerc20.connect(owner).balanceOf(bidder.address)).to.be.bignumber.equal(amountFive);
            // 6) auction contract has the correct amount of `MockERC20` tokens
            const amountSix = new BigNumber.from("25000000000000000000");
            expect(await mockerc20.connect(owner).balanceOf(fantomauction.address)).to.be.bignumber.equal(amountSix);
            // 7) also cannot place bids below `minBidIncrement` after bid placed
            const bidAttemptSeven = new BigNumber.from("24000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidAttemptSeven)).to.be.revertedWith('failed to outbid highest bidder');
            // 8) previous bidder `bidder` successfully outbid by `other`
            const bidAttemptEight = new BigNumber.from("50000000000000000000");
            await expect(fantomauction.connect(other).placeBid(mockerc721.address, FOUR, bidAttemptEight)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, other.address, bidAttemptEight);
            // 9) auction contract has the correct amount of `MockERC20` tokens
            const amountNine = new BigNumber.from("50000000000000000000");
            expect(await mockerc20.connect(owner).balanceOf(fantomauction.address)).to.be.bignumber.equal(amountNine);
            // 10) previous bidder `other` successfully outbid by `bidder`
            const bidAttemptTen = new BigNumber.from("75000000000000000000");
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, bidAttemptTen)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, FOUR, bidder.address, bidAttemptTen);
            // 11) auction contract has the correct amount of `MockERC20` tokens
            const amountEleven = new BigNumber.from("75000000000000000000");
            expect(await mockerc20.connect(owner).balanceOf(fantomauction.address)).to.be.bignumber.equal(amountEleven);
            // 12) `MockERC20` tokens properly refunded to bidder after being outbid and placing new bid
            const amountTwelve = new BigNumber.from("1925000000000000000000");
            expect(await mockerc20.connect(bidder).balanceOf(bidder.address)).to.be.bignumber.equal(amountTwelve);
            // 13) `MockERC20` tokens properly transferred back to `other` after `bidder` outbid `other`
            expect(await mockerc20.connect(other).balanceOf(other.address)).to.be.bignumber.equal(mockPayTokenMintAmount);
            // 14) bid successfully placed at `sellerReservePrice` by `winner`
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

        it('`placeBid()` Part 3/4 passed', async function () {
            // 15) cannot place a bid after auction has ended
            await expect(fantomauction.connect(other).placeBid(mockerc721.address, FOUR, sellerReservePrice)).to.be.revertedWith('bidding outside auction window');
            // 16) successfully listed auction for `seller` `_tokenId(2)`
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
        it('', async function () {
            time.advanceBlock();
            time.increaseTo(Number(await time.latest())+500);
            time.advanceBlock();
            expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
        });

        it('`placeBid()` Part 4/4 passed', async function () {
            // 17) bid successfully placed at `bidderBidAmountMinimum` by `bidder`
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, TWO, bidderBidAmountMinimum)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, TWO, bidder.address, bidderBidAmountMinimum);
            // 18) `seller` successfully lowered reserve price to `sellerNewReservePrice`
            await expect(fantomauction.connect(seller).updateAuctionReservePrice(mockerc721.address, TWO, sellerNewReservePrice)).to.emit(fantomauction, 'UpdateAuctionReservePrice').withArgs(mockerc721.address, TWO, mockerc20.address, sellerNewReservePrice);
            // 19) bid successfully placed at `sellerNewReservePrice` by `bidder`
            await expect(fantomauction.connect(bidder).placeBid(mockerc721.address, TWO, sellerNewReservePrice)).to.emit(fantomauction, 'BidPlaced').withArgs(mockerc721.address, TWO, bidder.address, sellerNewReservePrice);
        });
    });
});