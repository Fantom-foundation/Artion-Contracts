// 2_TestCreateAuctionv2.test.js tests through each line of the function individually
// to cover the entire scope of the function. The `createAuction()` function is tested
// in a single scenario using 13 steps to cover the whole scope of the function. 
// The specific order of these steps is as follows:
//
// 1) Creates a test auction successfully
// 2) Checks that the NFT is transferred in escrow to the auction contract
// 3) Checks that the owner of the auction matches with the seller
// 4) Checks that the payToken matches the payToken that's set for the auction
// 5) Checks that the reserve price was properly set to what the seller input
// 6) Checks that the auction isn't resulted by default
// 7) Checks the minimum bid for the auction
// 8) Checks that the NFT that was listed cannot be relisted while currently listed
// 9) Checks to ensure that non-owners cannot list NFT's they don't own
// 10) Checks to ensure that the endTimestamp of the auction cannot be zero
// 11) Checks to ensure that the endTimestamp of the auction cannot be one
// 12) Checks to ensure that the endTimestamp be greater than the startTimestamp
// 13) Checks to ensure that the endTimestamp is at least 5 minutes past the startTimestamp

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
    mockPayTokenName, mockPayTokenSymbol,
    mockNFTokenName, mockNFTokenSymbol,
    sellerReservePrice
} = require('./utils/index_ethers.js');

// Individual test for the `createAuction()` function in `FantomAuction`
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

    });

    // The `afterEach()` function will run after each test and is used to keep track of
    // block time as the test moves time around to account for time-constrained functionality.
    afterEach(async function () {
        const timeNow = new BigNumber.from(Number(await time.latest()));
        fantomauction.connect(owner).hardhatTimestamp(timeNow);
    });

    describe('Testing `createAuction()`', function () {
        it('', async function() {
            
        });

        it('`createAuction()` passes all scenarios', async function() {
            // 1) test auction created successfully for user `seller`
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
            const result = await fantomauction.connect(owner).getAuction(mockerc721.address, FOUR);
            const ownerResult = await mockerc721.connect(seller).ownerOf(FOUR);
            const {0: _owner, 1: _payToken, 2: _reservePrice, 5: _resulted, 6: _minBid} = result;
            // 2) NFT successfully in escrow with auction contract
            expect((ownerResult).toString()).to.equal(fantomauction.address);
            // 3) created auction `seller` is `_owner`
            expect((_owner).toString()).to.equal(seller.address);
            // 4) created auction `_payToken` is `MockERC20`
            expect((_payToken).toString()).to.equal(mockerc20.address);
            // 5) created auction `_reservePrice` is `sellerReservePrice`
            expect((_reservePrice).toString()).to.equal(sellerReservePrice.toString());
            // 6) created auction `_resulted` is `false`
            assert.isFalse(_resulted);
            // 7) created auction `_minBid` is `0`
            expect((_minBid).toString()).to.equal("0");
            // 8) `seller` cannot relist the same NFT while active auction exists
            await expect(fantomauction.connect(seller).createAuction(
                mockerc721.address,
                FOUR,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                new BigNumber.from(Number(await time.latest())+305)))
            .to.be.revertedWith('not owner and or contract not approved');
            // 9) cannot list auction if not owner of NFT
            await expect(fantomauction.connect(other).createAuction(
                mockerc721.address,
                THREE,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                new BigNumber.from(Number(await time.latest())+305)))
            .to.be.revertedWith('not owner and or contract not approved');
            // 10) `createAuction()` `_endTimestamp` cannot be `0`
            await expect(fantomauction.connect(seller).createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                0))
            .to.be.revertedWith('end time must be greater than start (by 5 minutes)');
            // 11) `createAuction()` `_endTimestamp` cannot be `1`
            await expect(fantomauction.connect(seller).createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                1))
            .to.be.revertedWith('end time must be greater than start (by 5 minutes)');
            // 12) `_endTimestamp` cannot be less than `_startTimestamp`
            await expect(fantomauction.connect(seller).createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+300),
                false,
                new BigNumber.from(Number(await time.latest())+299)))
            .to.be.revertedWith('end time must be greater than start (by 5 minutes)');
            // 13) `_endTimestamp` must be greater than 5 minutes past `_startTimestamp`
            await expect(fantomauction.connect(seller).createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                new BigNumber.from(Number(await time.latest())+304)))
            .to.be.revertedWith('end time must be greater than start (by 5 minutes)');
        });
    });
});