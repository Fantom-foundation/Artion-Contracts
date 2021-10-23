// test/FantomAuction.test.js
// Load dependencies
const hre = require("hardhat");
const chai = require("chai");
const { 
    solidity 
} = require("ethereum-waffle");
chai.use(solidity);
const { 
    expect 
} = chai;

const { 
    expectRevert,
    time
} = require('@openzeppelin/test-helpers');

const { 
    ethers
 } = require('hardhat');

 const { 
    BigNumber
 } = require('ethers');

 const {
    timeAndMine
 } = require('@atixlabs/hardhat-time-n-mine')

// Load compiled artifacts
//const MockERC20 = artifacts.require('MockERC20');
//const MockERC721 = artifacts.require('MockERC721');
//const FantomAuction = artifacts.require('FantomAuction');

// Start FantomAuction test block and initialize users in test case
describe('FantomAuction', function () {

    // Log all users in test case in console
    /*
    console.log("Owner: " + owner);
    console.log("Bidder: " + bidder);
    console.log("Seller: " + seller);
    console.log("Winner: "+ winner);
    console.log("Hacker: "+ hacker);
    console.log("Other: " + other);
    */

    // Set global variables
    const ZERO = new BigNumber.from("0");
    /*
    const decimalPlaces = 18;
    const amount = ethers.utils.parseUnits('2000.0', decimalPlaces);
    const balance = new BigNumber.from("200000000000000000");
    */

    // Set MockERC20 variables
    const mockPayTokenName = "Fantom";
    const mockPayTokenSymbol = "FTM";
    const mockPayTokenMintAmount = new BigNumber.from("2000000000000000000000"); // Sets test accounts to 2000 FTM

    // Set MockERC721 variables
    const mockNFTokenName = "Test NFT";
    const mockNFTokenSymbol = "NFT";

    // Set user `seller` variables for `FantomAuction`
    const sellerReservePrice = new BigNumber.from("100000000000000000000"); // 100 FTM
    const sellerTokenIdToSell = new BigNumber.from("4"); // Testing using NFT _tokenId: 4
    const secondSellerTokenIdToSell = new BigNumber.from("5"); // Testing using NFT _tokenId: 5

    // Set user `seller` variables for `FantomAuction`
    const bidderBidAmountMinimum = new BigNumber.from("25000000000000000000"); // 25 FTM

    
    let MockERC20;
    let MockERC721
    let FantomAuction;
    let mockerc20;
    let mockerc721;
    let fantomauction;
    let owner;
    let bidder;
    let seller;
    let winner;
    let hacker;
    let other;
    

    // Do this before the whole testing environment
    // Deploy a new `MockERC20`, `MockERC721`, `FantomAuction` contract each run
    before(async function () {
        MockERC20 = await ethers.getContractFactory('MockERC20');
        MockERC721 = await ethers.getContractFactory('MockERC721');
        FantomAuction = await ethers.getContractFactory('FantomAuction');
        [owner, bidder, seller, winner, hacker, other] = await ethers.getSigners();
        console.log("Owner: " + owner.address);
        console.log("Bidder: " + bidder.address);
        console.log("Seller: " + seller.address);
        console.log("Winner: "+ winner.address);
        console.log("Hacker: "+ hacker.address);
        console.log("Other: " + other.address);

        mockerc20 = await MockERC20.deploy(
            mockPayTokenName,
            mockPayTokenSymbol,
            0
        );
        await mockerc20.deployed();
        console.log("MockERC20 deployed to: " + mockerc20.address);
        mockerc721 = await MockERC721.deploy(
            mockNFTokenName,
            mockNFTokenSymbol
        );
        await mockerc721.deployed();
        console.log("MockERC721 deployed to: " + mockerc721.address);
        fantomauction = await FantomAuction.deploy(
        );
        await fantomauction.deployed();
        console.log("FantomAuction deployed to: " + fantomauction.address);
    });

    // Do this before each unit test
    beforeEach(async function () {
        // console.log("Owner: " + owner.address);
        //await time.advanceBlock();
        // time.increaseTo(await time.latest());
        // console.log((await time.latest()).toString());
    });

    afterEach(async function () {
        // Advance block once to get current block.timestamp
        // await time.advanceBlock();
        // Advance 100 seconds to be able to start placing bids on current active auction by `seller`
        // await time.increaseTo(Number(await time.latest())+1000);
        const timeNow = new BigNumber.from(Number(await time.latest()));
        fantomauction.connect(owner).hardhatTimestamp(timeNow);
    });
    // Test case **ID: P0**:: Mint test ERC20 pay tokens to users
    it('000) `MockERC20` tokens minted to users properly', async function () {
        // Mint tokens for test users
        await mockerc20.connect(owner).mintPay(
            owner.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(owner).mintPay(
            bidder.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(owner).mintPay(
            seller.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(owner).mintPay(
            winner.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(owner).mintPay(
            other.address,
            mockPayTokenMintAmount
        );

        // Test if the ERC20 pay tokens were minted properly
        expect((await mockerc20.connect(owner).balanceOf(owner.address)).toString()).to.equal(mockPayTokenMintAmount.toString());
        expect((await mockerc20.connect(owner).balanceOf(bidder.address)).toString()).to.equal(mockPayTokenMintAmount.toString());
        expect((await mockerc20.connect(owner).balanceOf(seller.address)).toString()).to.equal(mockPayTokenMintAmount.toString());
        expect((await mockerc20.connect(owner).balanceOf(winner.address)).toString()).to.equal(mockPayTokenMintAmount.toString());
        expect((await mockerc20.connect(owner).balanceOf(other.address)).toString()).to.equal(mockPayTokenMintAmount.toString());
        /*
        expect(await mockerc20.connect(owner).balanceOf(
            bidder.address)
        ).to.be.bignumber.equal(amount);
        expect(await mockerc20.connect(owner).balanceOf(
            seller.address)
        ).to.be.bignumber.equal(amount);
        expect(await mockerc20.connect(owner).balanceOf(
            winner.address)
        ).to.be.bignumber.equal(amount);
        expect(await mockerc20.connect(owner).balanceOf(
            other.address)
        ).to.be.bignumber.equal(amount);
        */
    });

    // Test case **ID: P1**:: Set MockERC20 `approve` to `FantomAuction` contract
    it('001) `MockERC20` `approve` set to `FantomAuction` for all test users', async function() {
        // Calls `approve` function for all users
        await mockerc20.connect(owner).approve(
            fantomauction.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(bidder).approve(
            fantomauction.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(seller).approve(
            fantomauction.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(winner).approve(
            fantomauction.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(other).approve(
            fantomauction.address,
            mockPayTokenMintAmount
        );
        await mockerc20.connect(hacker).approve(
            fantomauction.address,
            mockPayTokenMintAmount
        );

        // Test if the ERC20 `allowance` properly allowed `FantomAuction` to spend all ERC20 test tokens minted
        expect(await mockerc20.connect(owner).allowance(
            owner.address,
            fantomauction.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(bidder).allowance(
            bidder.address,
            fantomauction.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(seller).allowance(
            seller.address,
            fantomauction.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(winner).allowance(
            winner.address,
            fantomauction.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(other).allowance(
            other.address,
            fantomauction.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(hacker).allowance(
            hacker.address,
            fantomauction.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: N0**:: Mint and check balance of test MockERC721 tokens to users
    it('002) `MockERC721` tokens minted to users properly', async function() {
        // Mint NFT's for test users
        await mockerc721.connect(owner).mint(owner.address);
        await mockerc721.connect(owner).mint(bidder.address);
        await mockerc721.connect(owner).mint(bidder.address);
        await mockerc721.connect(owner).mint(seller.address);
        await mockerc721.connect(owner).mint(seller.address); // Testing `createAuction()` using this NFT (_tokenId: 4)
        await mockerc721.connect(owner).mint(seller.address);
        await mockerc721.connect(owner).mint(other.address);
        await mockerc721.connect(owner).mint(other.address);
        await mockerc721.connect(owner).mint(other.address);
        await mockerc721.connect(owner).mint(other.address);

        var nftBalanceOfOwner = new BigNumber.from("1"); 
        var nftBalanceOfBidder = new BigNumber.from("2");
        var nftBalanceOfSeller = new BigNumber.from("3");
        var nftBalanceOfOther = new BigNumber.from("4");

        // Test if the MockERC721 `balanceOf` reflects properly before continuing with unit tests on auctions
        expect(await mockerc721.connect(owner).balanceOf(
            owner.address)
        ).to.be.bignumber.equal(nftBalanceOfOwner);
        expect(await mockerc721.connect(owner).balanceOf(
            bidder.address)
        ).to.be.bignumber.equal(nftBalanceOfBidder);
        expect(await mockerc721.connect(owner).balanceOf(
            seller.address)
        ).to.be.bignumber.equal(nftBalanceOfSeller);
        expect(await mockerc721.connect(owner).balanceOf(
            other.address)
        ).to.be.bignumber.equal(nftBalanceOfOther);
    });

    // Test case **ID: N1**:: Set MockERC721 `setApprovalForAll` to `FantomAuction` contract
    it('003) `MockERC721` `setApprovalForAll` set to `FantomAuction` for all test users', async function() {
        // Calls `setApprovalForAll` function for all users
        await mockerc721.connect(owner).setApprovalForAll(
            fantomauction.address,
            true
        );
        await mockerc721.connect(bidder).setApprovalForAll(
            fantomauction.address,
            true
        );
        await mockerc721.connect(seller).setApprovalForAll(
            fantomauction.address,
            true
        );
        await mockerc721.connect(winner).setApprovalForAll(
            fantomauction.address,
            true
        );
        await mockerc721.connect(other).setApprovalForAll(
            fantomauction.address,
            true
        );
        await mockerc721.connect(hacker).setApprovalForAll(
            fantomauction.address,
            true
        );

        // Test if the MockERC721 `isApprovedForAll` is properly set to the `FantomAuction` instance
        assert.isTrue(await mockerc721.connect(owner).isApprovedForAll(
            owner.address,
            fantomauction.address)
        );
        assert.isTrue(await mockerc721.connect(bidder).isApprovedForAll(
            bidder.address,
            fantomauction.address)
        );
        assert.isTrue(await mockerc721.connect(seller).isApprovedForAll(
            seller.address,
            fantomauction.address)
        );
        assert.isTrue(await mockerc721.connect(winner).isApprovedForAll(
            winner.address,
            fantomauction.address)
        );
        assert.isTrue(await mockerc721.connect(other).isApprovedForAll(
            other.address,
            fantomauction.address)
        );
        assert.isTrue(await mockerc721.connect(hacker).isApprovedForAll(
            hacker.address,
            fantomauction.address)
        );
    });

    // Test case **ID: A0**:: Set and check if owner is correctly initialized
    it('004) `owner` returns the initialized owner', async function () {
        // Call `initialize()`  and store owner address
        await fantomauction.connect(owner).initialize(owner.address);

        // Test if the owner is properly reflected upon calling `initialize()`
        expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
    });

    // Test case **ID: A1**:: Check if non-owners can pause the auction contract
    it('005) cannot pause auction contract if not `owner`', async function () {

        // Test if non-owners can pause the auction contract upon calling `toggleIsPaused()`
        await expectRevert(
            fantomauction.connect(other).toggleIsPaused(),
          'Ownable: caller is not the owner',
        );
    });

    // Test case **ID: A2**:: Set and check address registry
    it('006) `FantomAuction` address registry set to `MockERC20`', async function () {
        // Call `updateAddressRegistry()` and store owner address
        await fantomauction.connect(owner).updateAddressRegistry(mockerc20.address);

        // Test if the owner is properly reflected upon calling `addressRegistry()`
        expect((await fantomauction.connect(owner).addressRegistry()).toString()).to.equal(mockerc20.address);
    });

    // Test case **ID: A3**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('007) test auction created successfully for user `seller`', async function() {
        // Advance block once to get current block.timestamp
        //time.advanceBlock();
        /*
        // Create an auction with the specified parameters
        const _createdAuctionEvent = await fantomauction.connect(seller).createAuction(
            mockerc721.address,
            sellerTokenIdToSell,
            mockerc20.address,
            sellerReservePrice,
            Number(await time.latest())+5,
            false,
            Number(await time.latest())+305
        );
        
        // Expect `AuctionCreated` event emitted
        expectEvent(
            _createdAuctionEvent,
            'AuctionCreated', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: mockerc20.address
            }
        );
        */
        await expect(
            fantomauction.connect(seller).createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                new BigNumber.from(Number(await time.latest())+305)))
            .to.emit(fantomauction, 'AuctionCreated')
            .withArgs(mockerc721.address, sellerTokenIdToSell, mockerc20.address);
    });

    // Test case **ID: A**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` created
    it('008) NFT successfully in escrow with auction contract', async function() {
        const result = await mockerc721.connect(seller).ownerOf(sellerTokenIdToSell);

        expect((result).toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A4**:: Check that the created auction matches the sellers parameters
    it('009) created auction `seller` is `_owner`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await fantomauction.connect(seller).getAuction(
            mockerc721.address,
            sellerTokenIdToSell
        );
        // Assign the result's (return)
        const {0: _owner} = result;

        // Test the `createAuction` data calling `getAuction`
        expect((_owner).toString()).to.equal(seller.address); // Expect created auction `_owner` to be `seller`
    });

    // Test case **ID: A5**:: Check that the created auction matches the sellers parameters
    it('010) created auction `_payToken` is `MockERC20`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await fantomauction.connect(owner).getAuction(
            mockerc721.address,
            sellerTokenIdToSell
        );
        // Assign the result's (return)
        const {1: _payToken} = result;

        // Test the `createAuction` data calling `getAuction`
        expect((_payToken).toString()).to.equal(mockerc20.address); // Expect created auction `_payToken` to be `MockERC20` (_payToken input)
    });

    // Test case **ID: A6**:: Check that the created auction matches the sellers parameters
    it('011) created auction `_reservePrice` is `sellerReservePrice`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await fantomauction.connect(owner).getAuction(
            mockerc721.address,
            sellerTokenIdToSell
        );
        // Assign the result's (return)
        const {2: _reservePrice} = result;

        // Test the `createAuction` data calling `getAuction`
        expect((_reservePrice).toString()).to.equal(sellerReservePrice.toString()); // Expect created auction `_reservePrice` to be `sellerReservePrice`
    });

    // Test case **ID: A9**:: Check that the created auction matches the sellers parameters
    it('012) created auction `_resulted` is `false`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await fantomauction.connect(owner).getAuction(
            mockerc721.address,
            sellerTokenIdToSell
        );
        // Assign the result's (return)
        const {5: _resulted} = result;

        // Test the `createAuction` data calling `getAuction`
        assert.isFalse(_resulted); // Expect created auction `_resulted` to be `false`
    });

    // Test case **ID: A10**:: Check that the created auction matches the minimum bid
    it('013) created auction `_minBid` is `0`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await fantomauction.connect(owner).getAuction(
            mockerc721.address,
            sellerTokenIdToSell
        );
        // Assign the result's (return)
        const {6: _minBid} = result;

        // Test the `createAuction` data calling `getAuction`
        expect((_minBid).toString()).to.equal("0"); // Expect created auction `_minBid` to be `0`
    });


    // Test case **ID: A11**:: Attempt to relist currently active auction
    it('014) `seller` cannot relist the same NFT while active auction exists', async function() {
        /*
        await expectRevert(
            // Create an auction with the specified parameters
            this.fantomauction.createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305),
            "not owner and or contract not approved"
        );
        */
        await expect(fantomauction.connect(seller).createAuction(
            mockerc721.address,
            sellerTokenIdToSell,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest())+5),
            false,
            new BigNumber.from(Number(await time.latest())+305)))
        .to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A12**:: Attempt to list an un-owned NFT
    it('015) cannot list auction if not owner of NFT', async function() {
        /*
        await expectRevert(
            // Create an auction from user `other` using the `_tokenId(3)` owned by `seller`
            this.fantomauction.createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305),
            "not owner and or contract not approved"
        );
        */
        await expect(fantomauction.connect(other).createAuction(
            mockerc721.address,
            3,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest())+5),
            false,
            new BigNumber.from(Number(await time.latest())+305)))
        .to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A13**:: Attempt to list an auction with an `_endTime` of `0`
    it('016) `createAuction()` `_endTimestamp` cannot be `0`', async function() {
        /*
        await expectRevert(
            // Create an auction using the `_tokenId(3)` owned by `seller` and `_endTime` of `0`
            this.fantomauction.createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                0,
                {from:seller}),
            "end time must be greater than start (by 5 minutes)"
        );
        */
        await expect(fantomauction.connect(seller).createAuction(
            mockerc721.address,
            3,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest())+5),
            false,
            0))
        .to.be.revertedWith('end time must be greater than start (by 5 minutes)');
    });

    // Test case **ID: A14**:: Attempt to list an auction with an `_endTime` of `1`
    it('017) `createAuction()` `_endTimestamp` cannot be `1`', async function() {
        /*
        await expectRevert(
            // Create an auction using the `_tokenId(3)` owned by `seller` and `_endTime` of `1`
            this.fantomauction.createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                1,
                {from:seller}),
            "end time must be greater than start (by 5 minutes)"
        );
        */
        await expect(fantomauction.connect(seller).createAuction(
            mockerc721.address,
            3,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest())+5),
            false,
            1))
        .to.be.revertedWith('end time must be greater than start (by 5 minutes)');
    });

    // Test case **ID: A15**:: Attempt to list an auction with an `_endTime` before the `_startTime`
    it('018) `_endTimestamp` cannot be less than `_startTimestamp`', async function() {
        /*
        await expectRevert(
            // Create an auction using the `_tokenId(3)` owned by `seller`
            this.fantomauction.createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+300,
                false,
                Number(await time.latest())+299,
                {from:seller}),
            "end time must be greater than start (by 5 minutes)"
        );
        */
        await expect(fantomauction.connect(seller).createAuction(
            mockerc721.address,
            3,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest())+300),
            false,
            new BigNumber.from(Number(await time.latest())+299)))
        .to.be.revertedWith('end time must be greater than start (by 5 minutes)');
    });

    // Test case **ID: A16**:: Attempt to list an auction with a `_endTimestamp` less than 5 minutes (set hard limit)
    it('019) `_endTimestamp` must be greater than 5 minutes past `_startTimestamp`', async function() {
        /*
        await expectRevert(
            // Create an auction using the `_tokenId(3)` owned by `seller`
            this.fantomauction.createAuction(
                mockerc721.address,
                3,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+304,
                {from:seller}),
            "end time must be greater than start (by 5 minutes)"
        );
        */
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

    // Test case **ID: A17**:: Attempt to cancel an auction that isn't owned by the auction contract
    it('020) cannot cancel an auction not owned by the auction contract', async function() {
        /*
        await expectRevert(
            // Cancel auction with `_tokenId` of `1` (NFT not owned by auction contract)
            this.fantomauction.cancelAuction(
                mockerc721.address,
                1,
                {from:seller}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(seller).cancelAuction(
            mockerc721.address,
            1))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A18**:: Attempt to cancel an auction that isn't owned by the `msg.sender`
    it('021) cannot cancel an auction you do not own', async function() {
        /*
        await expectRevert(
            // Cancel auction with `_tokenId` of `4` (NFT owned by `seller`) as `other` user
            this.fantomauction.cancelAuction(
                mockerc721.address,
                4,
                {from:other}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(other).cancelAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A19**:: Attempt to cancel an active auction with no bids that has not expired
    it('022) test auction cancelled successfully by user `seller`', async function() {
        /*
        // Cancel auction with `_tokenId` of `4` from `seller`
        const _cancelledAuctionEvent = await this.fantomauction.cancelAuction(
            mockerc721.address,
            4,
            {from:seller}
        );

        // Expect `AuctionCancelled` event emitted
        expectEvent(
            _cancelledAuctionEvent,
            'AuctionCancelled', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell
            }
        );
        */
        await expect(
            fantomauction.connect(seller).cancelAuction(
                mockerc721.address,
                4))
            .to.emit(fantomauction, 'AuctionCancelled')
            .withArgs(mockerc721.address, sellerTokenIdToSell);
    });

    // Test case **ID: A20**:: Attempt to cancel an auction that was already cancelled
    it('023) cannot cancel an auction that has already been cancelled', async function() {
        /*
        await expectRevert(
            // Cancel auction with `_tokenId` of `4` (NFT owned by `seller`) as `seller` user
            this.fantomauction.cancelAuction(
                mockerc721.address,
                4,
                {from:seller}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(seller).cancelAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A21**:: Cancelled auction NFT successfully transferred ownership back to `seller` from auction contract
    it('024) cancelled auction NFT successfully transferred ownership back to `seller`', async function() {
        const result = await mockerc721.connect(seller).ownerOf(sellerTokenIdToSell);

        expect((result).toString()).to.equal(seller.address);
    });

    // Test case **ID: A22**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('025) successfully relisted auction for `seller` `_tokenId(4)` after cancelling', async function() {
        /*
        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            mockerc721.address,
            sellerTokenIdToSell,
            mockerc20.address,
            sellerReservePrice,
            Number(await time.latest())+100,
            false,
            Number(await time.latest())+400,
            {from:seller}
        );
        
        // Expect `AuctionCreated` event emitted
        expectEvent(
            _createdAuctionEvent,
            'AuctionCreated', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: mockerc20.address
            }
        );
        */
        await expect(
            fantomauction.connect(seller).createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                new BigNumber.from(Number(await time.latest())+500)))
            .to.emit(fantomauction, 'AuctionCreated')
            .withArgs(mockerc721.address, sellerTokenIdToSell, mockerc20.address);
    });
    
    
    // Test case **ID: A23**:: Attempt to place a bid on the auction `seller` created before it starts
    it('026) cannot place a bid before auction starts', async function() {
        /*
        await expectRevert(
            this.fantomauction.placeBid(
                mockerc721.address,
                4,
                sellerReservePrice,
                {from:bidder}),
            "bidding outside of the auction window"
        );
        */
        await expect(fantomauction.connect(bidder).placeBid(
            mockerc721.address,
            4,
            sellerReservePrice))
        .to.be.revertedWith('bidding before auction started');
    });
    

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 100 seconds', async function () {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+100);
        time.advanceBlock();
        expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 100 seconds', async function () {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+100);
        time.advanceBlock();
        expect((await fantomauction.connect(owner).owner()).toString()).to.equal(owner.address);
    });

    // Test case **ID: A24**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('027) NFT successfully in escrow with auction contract after relisting by `seller`', async function() {
        const result = await mockerc721.connect(seller).ownerOf(sellerTokenIdToSell);

        expect((result).toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A25**:: Attempt to place a bid of zero
    it('028) cannot place a bid of zero', async function() {
        /*
        await expectRevert(
            this.fantomauction.placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                0,
                {from:bidder}),
                "failed to outbid highest bidder"
        );
        */
        await expect(fantomauction.connect(bidder).placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            ZERO))
        .to.be.revertedWith('failed to outbid highest bidder');
    });

    // Test case **ID: A26**:: Attempt to place a bid below `minBidIncrement`
    it('029) cannot place bids below `minBidIncrement`', async function () {
        const bidAttempt = new BigNumber.from("24000000000000000000");
        /*
        await expectRevert(
            this.fantomauction.placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                bidAttempt,
                {from:bidder}),
                "failed to outbid highest bidder"
        );
        */
        await expect(fantomauction.connect(bidder).placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt))
        .to.be.revertedWith('failed to outbid highest bidder');
    });

    // Test case **ID: A27**:: Attempt to successfully place a bid
    it('030) bid successfully placed at `minBidIncrement`', async function () {
        const bidAttempt = new BigNumber.from("25000000000000000000");
        /*
        const _placeBidEvent = await this.fantomauction.placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: bidder,
                3: bidAttempt
            }
        );
        */
        await expect(
            fantomauction.connect(bidder).placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                bidAttempt))
            .to.emit(fantomauction, 'BidPlaced')
            .withArgs(mockerc721.address, sellerTokenIdToSell, bidder.address, bidAttempt);
    });

    // Test case **ID: A**:: Ensure that bidders are properly transferred to auction contract
    it('031) `MockERC20` tokens properly transferred to auction contract', async function () {
        const amount = new BigNumber.from("1975000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(owner).balanceOf(
            bidder.address)
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('032) auction contract has the correct amount of `MockERC20` tokens', async function () {
        const amount = new BigNumber.from("25000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(owner).balanceOf(
            fantomauction.address)
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A28**:: Attempt to place a bid below `minBidIncrement` after another bid has been placed
    it('033) also cannot place bids below `minBidIncrement` after bid placed', async function () {
        const bidAttempt = new BigNumber.from("24000000000000000000");
        /*
        await expectRevert(
            this.fantomauction.placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                bidAttempt,
                {from:bidder}),
                "failed to outbid highest bidder"
        );
        */
        await expect(fantomauction.connect(bidder).placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt))
        .to.be.revertedWith('failed to outbid highest bidder');
    });

    // Test case **ID: A29**:: Attempt to cancel an active auction that currently has a bid as `other`
    it('034) cannot cancel active auction that you dont own', async function() {
        // Cancel auction with `_tokenId` of `4` from `other`
        /*
        await expectRevert(
            this.fantomauction.cancelAuction(
                mockerc721.address,
                4,
                {from:other}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(other).cancelAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A30**:: Attempt to cancel an active auction that currently has a bid as `owner`
    it('035) auction contract cannot cancel an auction they dont own', async function() {
        // Cancel auction with `_tokenId` of `4` from `owner`
        /*
        await expectRevert(
            this.fantomauction.cancelAuction(
                mockerc721.address,
                4,
                {from:owner}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(owner).cancelAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A31**:: Attempt to cancel an active auction that currently has a bid
    it('036) successfully cancelled auction that has bids below reserve price as `seller`', async function() {
        // Cancel auction with `_tokenId` of `4` from `seller`
        /*
        const _cancelledAuctionEvent = await this.fantomauction.cancelAuction(
            mockerc721.address,
            4,
            {from:seller}
        );

        // Expect `AuctionCancelled` event emitted
        expectEvent(
            _cancelledAuctionEvent,
            'AuctionCancelled', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell
            }
        );
        */
        await expect(
            fantomauction.connect(seller).cancelAuction(
                mockerc721.address,
                4))
            .to.emit(fantomauction, 'AuctionCancelled')
            .withArgs(mockerc721.address, sellerTokenIdToSell);
    });

    // Test case **ID: A**:: Ensure that bidders are properly refunded
    it('037) `MockERC20` tokens properly refunded to bidder after cancelled auction', async function () {
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(bidder).balanceOf(
            bidder.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: A33**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('038) successfully relisted auction for `seller` `_tokenId(4)` after cancelling auction with bids', async function() {
        /*
        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            mockerc721.address,
            sellerTokenIdToSell,
            mockerc20.address,
            sellerReservePrice,
            Number(await time.latest())+5,
            false,
            Number(await time.latest())+305,
            {from:seller}
        );
        
        // Expect `AuctionCreated` event emitted
        expectEvent(
            _createdAuctionEvent,
            'AuctionCreated', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: mockerc20.address
            }
        );
        */
        await expect(
            fantomauction.connect(seller).createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                new BigNumber.from(Number(await time.latest())+305)))
            .to.emit(fantomauction, 'AuctionCreated')
            .withArgs(mockerc721.address, sellerTokenIdToSell, mockerc20.address);
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

    // Test case **ID: A34**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('039) NFT successfully in escrow with auction contract after relisting by `seller`', async function() {
        const result = await mockerc721.connect(seller).ownerOf(4);

        expect((result).toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A35**:: Attempt to successfully place a bid
    it('040) bid successfully placed at `minBidIncrement` by `bidder`', async function () {
        const bidAttempt = new BigNumber.from("25000000000000000000");
        /*
        const _placeBidEvent = await this.fantomauction.placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: bidder,
                3: bidAttempt
            }
        );
        */
        await expect(
            fantomauction.connect(bidder).placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                bidAttempt))
            .to.emit(fantomauction, 'BidPlaced')
            .withArgs(mockerc721.address, sellerTokenIdToSell, bidder.address, bidAttempt);
    });

    // Test case **ID: A6**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('041) auction contract has the correct amount of `MockERC20` tokens', async function () {
        const amount = new BigNumber.from("25000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(owner).balanceOf(
            fantomauction.address)
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A37**:: Attempt to successfully outbid highest bidder
    it('042) previous bidder `bidder` successfully outbid by `other`', async function () {
        const bidAttempt = new BigNumber.from("50000000000000000000");
        /*
        const _placeBidEvent = await this.fantomauction.placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt,
            {from:other}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: other,
                3: bidAttempt
            }
        );
        */
        await expect(
            fantomauction.connect(other).placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                bidAttempt))
            .to.emit(fantomauction, 'BidPlaced')
            .withArgs(mockerc721.address, sellerTokenIdToSell, other.address, bidAttempt);
    });

    // Test case **ID: A38**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('043) auction contract has the correct amount of `MockERC20` tokens', async function () {
        const amount = new BigNumber.from("50000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(owner).balanceOf(
            fantomauction.address)
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A39**:: Attempt to successfully place a bid
    it('044) previous bidder `other` successfully outbid by `bidder`', async function () {
        const bidAttempt = new BigNumber.from("75000000000000000000");
        /*
        const _placeBidEvent = await this.fantomauction.placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: bidder,
                3: bidAttempt
            }
        );
        */
        await expect(
            fantomauction.connect(bidder).placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                bidAttempt))
            .to.emit(fantomauction, 'BidPlaced')
            .withArgs(mockerc721.address, sellerTokenIdToSell, bidder.address, bidAttempt);
    });

    // Test case **ID: A40**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('045) auction contract has the correct amount of `MockERC20` tokens', async function () {
        const amount = new BigNumber.from("75000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(owner).balanceOf(
            fantomauction.address)
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A41**:: Ensure that bidders are properly refunded after being outbid
    it('046) `MockERC20` tokens properly refunded to bidder after being outbid and placing new bid', async function () {
        const amount = new BigNumber.from("1925000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(bidder).balanceOf(
            bidder.address)
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A42**:: Ensure that tokens are properly transferred after outbidding
    it('047) `MockERC20` tokens properly transferred back to `other` after `bidder` outbid `other`', async function () {
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(other).balanceOf(
            other.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: A43**:: Attempt to result an auction that hasn't ended yet as `seller`
    it('048) cannot result an auction that hasnt ended as `seller`', async function() {
        /*
        await expectRevert(
            this.fantomauction.resultAuction(
                mockerc721.address,
                4,
                {from:seller}),
            "auction not ended"
        );
        */
        await expect(fantomauction.connect(seller).resultAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('auction not ended');
    });

    // Test case **ID: A44**:: Attempt to result an auction that hasn't ended yet as `other`
    it('049) cannot result an auction that hasnt ended as `other`', async function() {
        /*
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+1000);
        time.advanceBlock();
        /*
        await expectRevert(
            this.fantomauction.resultAuction(
                mockerc721.address,
                4,
                {from:other}),
            "_msgSender() must be auction winner or seller"
        );
        */
        await expect(fantomauction.connect(other).resultAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('_msgSender() must be auction winner or seller');
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

    // Test case **ID: A45**:: Attempt to result a finished auction that ended with bids below the minimum reserve price
    it('050) cannot result a finished auction that ended with bids below the reserve price', async function() {
        /*
        await expectRevert(
            this.fantomauction.resultAuction(
                mockerc721.address,
                4,
                {from:seller}),
            "highest bid is below reservePrice"
        );
        */
        await expect(fantomauction.connect(seller).resultAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('highest bid is below reservePrice');
    });

    // Test case **ID: A46**:: Attempt to result a finished auction that ended with bids below the minimum reserve price as someone other than `seller` or `winner`
    it('051) cannot result a finished auction that ended with bids below the reserve price as non-owner', async function() {
        /*
        await expectRevert(
            this.fantomauction.resultAuction(
                mockerc721.address,
                4,
                {from:hacker}),
            "_msgSender() must be auction winner or seller"
        );
        */
        await expect(fantomauction.connect(hacker).resultAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A47**:: Attempt to cancel an auction that ended  with bids below reserve price (with bids below reserve price)
    it('052) cannot cancel an auction that has ended with bids below reserve price as `bidder` or `winner` (must be arranged via resultFailedAuction())', async function() {
        /*
        await expectRevert(
            this.fantomauction.cancelAuction(
                mockerc721.address,
                4,
                {from:bidder}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(bidder).cancelAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A48**:: Attempt to cancel an auction that has ended with bids below reserve price
    it('053) successfully cancelled auction that ended with bids below reserve price as `seller`', async function() {
        /*
        // Cancel auction with `_tokenId` of `4` from `seller`
        const _cancelledAuctionEvent = await this.fantomauction.cancelAuction(
            mockerc721.address,
            4,
            {from:seller}
        );

        // Expect `AuctionCancelled` event emitted
        expectEvent(
            _cancelledAuctionEvent,
            'AuctionCancelled', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell
            }
        );
        */
        await expect(
            fantomauction.connect(seller).cancelAuction(
                mockerc721.address,
                4))
            .to.emit(fantomauction, 'AuctionCancelled')
            .withArgs(mockerc721.address, sellerTokenIdToSell);
    });

    // Test case **ID: A49**:: Ensure the NFT has been properly transferred back to the `seller`
    it('054) cancelled auction NFT successfully transferred ownership back to `seller`', async function() {
        const result = await mockerc721.connect(seller).ownerOf(4);

        expect((result).toString()).to.equal(seller.address);
    });

    // Test case **ID: A50**:: Ensure the proper amount of MockERC20 tokens have been transferred back to the proper users after bidding, outbidding, cancelling, and refunding
    it('055) all users and auction contract have the correct amount of MockERC20 tokens', async function () {
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(owner).balanceOf(
            owner.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            bidder.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            seller.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            winner.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            other.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            hacker.address)
        ).to.be.bignumber.equal(ZERO);
        expect(await mockerc20.connect(owner).balanceOf(
            fantomauction.address)
        ).to.be.bignumber.equal(ZERO);
    });

    // Test case **ID: A51**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('056) successfully relisted auction for `seller` `_tokenId(4)` after cancelling ended auction with bids', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();
        /*
        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            mockerc721.address,
            sellerTokenIdToSell,
            mockerc20.address,
            sellerReservePrice,
            Number(await time.latest())+5,
            false,
            Number(await time.latest())+305,
            {from:seller}
        );
        
        // Expect `AuctionCreated` event emitted
        expectEvent(
            _createdAuctionEvent,
            'AuctionCreated', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: mockerc20.address
            }
        );
        */
        await expect(
            fantomauction.connect(seller).createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                new BigNumber.from(Number(await time.latest())+305)))
            .to.emit(fantomauction, 'AuctionCreated')
            .withArgs(mockerc721.address, sellerTokenIdToSell, mockerc20.address);
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

    // Test case **ID: A52**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('057) `_tokenId(4)` successfully in escrow with auction contract after relisting by `seller`', async function() {
        const result = await mockerc721.connect(seller).ownerOf(4);

        expect((result).toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A53**:: Attempt to successfully place a bid at the `bidderBidAmountMinimum` by `bidder`
    it('058) bid successfully placed at `bidderBidAmountMinimum` by `bidder`', async function () {
        /*
        const _placeBidEvent = await this.fantomauction.placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            bidderBidAmountMinimum,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: bidder,
                3: bidderBidAmountMinimum
            }
        );
        */
        await expect(
            fantomauction.connect(bidder).placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                bidderBidAmountMinimum))
            .to.emit(fantomauction, 'BidPlaced')
            .withArgs(mockerc721.address, sellerTokenIdToSell, bidder.address, bidderBidAmountMinimum);
    });

    // Test case **ID: A54**:: Attempt to successfully place a bid at the reserve price by `winner`
    it('059) bid successfully placed at `sellerReservePrice` by `winner`', async function () {
        /*
        const _placeBidEvent = await this.fantomauction.placeBid(
            mockerc721.address,
            sellerTokenIdToSell,
            sellerReservePrice,
            {from:winner}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: mockerc721.address,
                1: sellerTokenIdToSell, 
                2: winner,
                3: sellerReservePrice
            }
        );
        */
        await expect(
            fantomauction.connect(winner).placeBid(
                mockerc721.address,
                sellerTokenIdToSell,
                sellerReservePrice))
            .to.emit(fantomauction, 'BidPlaced')
            .withArgs(mockerc721.address, sellerTokenIdToSell, winner.address, sellerReservePrice);
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

    // Test case **ID: A56**:: Attempt to place a bid on the auction `seller` created after it ended 
    it('061) cannot place a bid after auction has ended', async function() {
        /*
        await expectRevert(
            this.fantomauction.placeBid(
                mockerc721.address,
                4,
                sellerReservePrice,
                {from:other}),
            "bidding outside of the auction window"
        );
        */
        await expect(fantomauction.connect(other).placeBid(
            mockerc721.address,
            4,
            sellerReservePrice))
        .to.be.revertedWith('bidding outside auction window');
    });

    // Test case **ID: A57**:: Attempt to cancel an auction that has ended with a bid >= reserve price as `seller`
    it('062) cannot cancel an auction that has ended with bids >= reserve price as `seller`', async function() {
        /*
        await expectRevert(
            this.fantomauction.cancelAuction(
                mockerc721.address,
                4,
                {from:seller}),
            "Highest bid is currently above reserve price"
        );
        */
        await expect(fantomauction.connect(seller).cancelAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('Highest bid is currently above reserve price');
    });

    // Test case **ID: A58**:: Attempt to cancel an auction that has ended with a bid >= reserve price as `other`
    it('063) cannot cancel an auction that has ended with bids >= reserve price as `other`', async function() {
        /*
        await expectRevert(
            this.fantomauction.cancelAuction(
                mockerc721.address,
                4,
                {from:other}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(other).cancelAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A59**:: Attempt to cancel an auction that has ended with a bid >= reserve price `winner`
    it('064) cannot cancel an auction that has ended with bids >= reserve price as `winner`', async function() {
        /*
        await expectRevert(
            this.fantomauction.cancelAuction(
                mockerc721.address,
                4,
                {from:winner}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(winner).cancelAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A60**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `seller`
    it('065) cannot resultFailedAuction() an auction that has met reserve price as `seller`', async function() {
        /*
        await expectRevert(
            this.fantomauction.resultFailedAuction(
                mockerc721.address,
                4,
                {from:seller}),
            "highest bid is >= reservePrice"
        );
        */
        await expect(fantomauction.connect(seller).resultFailedAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('highest bid is >= reservePrice');
    });

    // Test case **ID: A61**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `winner`
    it('066) cannot resultFailedAuction() an auction that has met reserve price as `winner`', async function() {
        /*
        await expectRevert(
            this.fantomauction.resultFailedAuction(
                mockerc721.address,
                4,
                {from:winner}),
            "highest bid is >= reservePrice"
        );
        */
        await expect(fantomauction.connect(winner).resultFailedAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('highest bid is >= reservePrice');
    });

    // Test case **ID: A62**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `other`
    it('067) cannot resultFailedAuction() an auction that has met reserve price as `other`', async function() {
        /*
        await expectRevert(
            this.fantomauction.resultFailedAuction(
                mockerc721.address,
                4,
                {from:other}),
            "_msgSender() must be auction topBidder or seller"
        );
        */
        await expect(fantomauction.connect(other).resultFailedAuction(
            mockerc721.address,
            4))
        .to.be.revertedWith('_msgSender() must be auction topBidder or seller');
    });

    // Test case **ID: A63**:: Attempt to relist an auction that has ended with bids >= reserve price as `seller`
    it('068) cannot relist an un-resulted auction that has successfully ended as `seller`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();
        /*
        await expectRevert(
            // Create an auction with the specified parameters
            this.fantomauction.createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:seller}),
            "not owner and or contract not approved"
        );
        */
        await expect(fantomauction.connect(seller).createAuction(
            mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305))
        .to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A64**:: Attempt to relist an auction that has ended with bids >= reserve price as `other`
    it('069) cannot relist an un-resulted auction that has successfully ended as `other`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();
        /*
        await expectRevert(
            // Create an auction with the specified parameters
            this.fantomauction.createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:other}),
            "not owner and or contract not approved"
        );
        */
        await expect(fantomauction.connect(other).createAuction(
            mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305))
        .to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A65**:: Attempt to result an auction that ended successfully by user `other`
    it('070) cannot result a successful auction as `other`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();
        /*
        await expectRevert(
            this.fantomauction.resultAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                {from:other}),
            "_msgSender() must be auction winner or seller"
        );
        */
        await expect(fantomauction.connect(other).resultAuction(
            mockerc721.address,
            sellerTokenIdToSell))
        .to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A66**:: Attempt to result a successful auction as the auction `seller`
    it('071) test auction `_tokenId(4)` successfully resulted by `seller`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();
        /*
        // Create an auction with the specified parameters
        const _AuctionResultedEvent = await this.fantomauction.resultAuction(
            mockerc721.address,
            sellerTokenIdToSell,
            {from:seller}
        );
        
        // Expect `AuctionResulted` event emitted
        expectEvent(
            _AuctionResultedEvent,
            'AuctionResulted', { 
                0: seller,
                1: mockerc721.address, 
                2: sellerTokenIdToSell,
                3: winner,
                4: mockerc20.address,
                5: sellerReservePrice,
                6: sellerReservePrice
            }
        );
        */
        await expect(
            fantomauction.connect(seller).resultAuction(
                mockerc721.address,
                sellerTokenIdToSell))
            .to.emit(fantomauction, 'AuctionResulted')
            .withArgs(seller.address, mockerc721.address, sellerTokenIdToSell, winner.address, mockerc20.address, sellerReservePrice, sellerReservePrice);
    });

    // Test case **ID: A67**:: Attempt to result an auction that ended successfully by user `seller`
    it('072) cannot result an auction that has already been resulted as `seller`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();
        /*
        await expectRevert(
            this.fantomauction.resultAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                {from:seller}),
            "address(this) must be the item owner"
        );
        */
        await expect(fantomauction.connect(seller).resultAuction(
            mockerc721.address,
            sellerTokenIdToSell))
        .to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A68**:: Attempt to result an auction that ended successfully by user `other`
    it('073) cannot result an auction that has already been resulted as `other`', async function() {
        /*
        await expectRevert(
            this.fantomauction.resultAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                {from:other}),
            "address(this) must be the item owner"
        );
        */
        await expect(fantomauction.connect(other).resultAuction(
            mockerc721.address,
            sellerTokenIdToSell))
        .to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A69**:: Attempt to result an auction that ended successfully by user `winner`
    it('074) cannot result an auction that has already been resulted as `winner`', async function() {
        /*
        await expectRevert(
            this.fantomauction.resultAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                {from:winner}),
            "address(this) must be the item owner"
        );
        */
        await expect(fantomauction.connect(winner).resultAuction(
            mockerc721.address,
            sellerTokenIdToSell))
        .to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A70**:: Attempt to list relist an auction that `seller` has already sold and resulted
    it('075) `seller` cannot relist an auction they sold and resulted already', async function() {
        /*
        await expectRevert(
            // Create an auction using the `_tokenId(4)` owned by `seller`
            this.fantomauction.createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:seller}),
            "not owner and or contract not approved"
        );
        */
        await expect(fantomauction.connect(seller).createAuction(
            mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305))
        .to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A71**:: Attempt to list relist an auction that `other` has already sold and resulted
    it('076) `other` cannot relist a sold and resulted auction they didnt win', async function() {
        /*
        await expectRevert(
            // Create an auction using the `_tokenId(4)` owned by `other`
            this.fantomauction.createAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:other}),
            "not owner and or contract not approved"
        );
        */
        await expect(fantomauction.connect(other).createAuction(
            mockerc721.address,
            sellerTokenIdToSell,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest())+5),
            false,
            new BigNumber.from(Number(await time.latest())+305)))
        .to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A72**:: Attempt to cancel an auction that has ended successfully and has been resulted as user `seller`
    it('077) cannot cancel an auction that has ended successfully and has been resulted as `seller`', async function() {
        /*
        await expectRevert(
            this.fantomauction.cancelAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                {from:seller}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(seller).cancelAuction(
            mockerc721.address,
            sellerTokenIdToSell))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A73**:: Attempt to cancel an auction that has ended successfully and has been resulted as user `other`
    it('078) cannot cancel an auction that has ended successfully and has been resulted as `other`', async function() {
        /*
        await expectRevert(
            this.fantomauction.cancelAuction(
                mockerc721.address,
                sellerTokenIdToSell,
                {from:other}),
            "sender must be owner"
        );
        */
        await expect(fantomauction.connect(other).cancelAuction(
            mockerc721.address,
            sellerTokenIdToSell))
        .to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A74**:: Ensure the proper amount of MockERC20 tokens have been transferred to users accordingly after a successful auction
    it('079) all users and auction contract have the correct amount of MockERC20 tokens after a successful auction', async function () {
        const newBalanceSeller = new BigNumber.from("2100000000000000000000")
        const newBalanceWinner = new BigNumber.from("1900000000000000000000")
        // Test if the ERC20 pay tokens reflect properly
        expect(await mockerc20.connect(owner).balanceOf(
            owner.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            bidder.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            seller.address)
        ).to.be.bignumber.equal(newBalanceSeller);
        expect(await mockerc20.connect(owner).balanceOf(
            winner.address)
        ).to.be.bignumber.equal(newBalanceWinner);
        expect(await mockerc20.connect(owner).balanceOf(
            other.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            hacker.address)
        ).to.be.bignumber.equal(ZERO);
        expect(await mockerc20.connect(owner).balanceOf(
            fantomauction.address)
        ).to.be.bignumber.equal(ZERO);
    });

    // Test case **ID: A75**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `3` and check for event
    it('080) successfully listed auction for `seller` `_tokenId(3)`', async function() {
        /*
        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            mockerc721.address,
            secondSellerTokenIdToSell,
            mockerc20.address,
            sellerReservePrice,
            Number(await time.latest())+5,
            false,
            Number(await time.latest())+305,
            {from:seller}
        );
        
        // Expect `AuctionCreated` event emitted
        expectEvent(
            _createdAuctionEvent,
            'AuctionCreated', { 
                0: mockerc721.address,
                1: secondSellerTokenIdToSell, 
                2: mockerc20.address
            }
        );
        */
        await expect(
            fantomauction.connect(seller).createAuction(
                mockerc721.address,
                secondSellerTokenIdToSell,
                mockerc20.address,
                sellerReservePrice,
                new BigNumber.from(Number(await time.latest())+5),
                false,
                new BigNumber.from(Number(await time.latest())+305)))
            .to.emit(fantomauction, 'AuctionCreated')
            .withArgs(mockerc721.address, secondSellerTokenIdToSell, mockerc20.address);
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

    // Test case **ID: A76**:: Check to ensure auction contract now owns (escrow) `_tokenId(3)` auction `seller` relisted
    it('081) `_tokenId(3)` successfully in escrow with auction contract after relisting by `seller`', async function() {
        const result = await mockerc721.connect(seller).ownerOf(secondSellerTokenIdToSell);

        expect((result).toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A77**:: Attempt to successfully place a bid at the `bidderBidAmountMinimum` by `bidder`
    it('082) bid successfully placed at `bidderBidAmountMinimum` by `bidder`', async function () {
        /*
        const _placeBidEvent = await this.fantomauction.placeBid(
            mockerc721.address,
            secondSellerTokenIdToSell,
            bidderBidAmountMinimum,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: mockerc721.address,
                1: secondSellerTokenIdToSell, 
                2: bidder,
                3: bidderBidAmountMinimum
            }
        );
        */
        await expect(
            fantomauction.connect(bidder).placeBid(
                mockerc721.address,
                secondSellerTokenIdToSell,
                bidderBidAmountMinimum))
            .to.emit(fantomauction, 'BidPlaced')
            .withArgs(mockerc721.address, secondSellerTokenIdToSell, bidder.address, bidderBidAmountMinimum);
    });

    // Test case **ID: A78**:: Attempt to successfully place a bid at the reserve price by `winner`
    it('083) bid successfully placed at `sellerReservePrice` by `winner`', async function () {
        /*
        const _placeBidEvent = await this.fantomauction.placeBid(
            mockerc721.address,
            secondSellerTokenIdToSell,
            sellerReservePrice,
            {from:winner}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: mockerc721.address,
                1: secondSellerTokenIdToSell, 
                2: winner,
                3: sellerReservePrice
            }
        );
        */
        await expect(
            fantomauction.connect(winner).placeBid(
                mockerc721.address,
                secondSellerTokenIdToSell,
                sellerReservePrice))
            .to.emit(fantomauction, 'BidPlaced')
            .withArgs(mockerc721.address, secondSellerTokenIdToSell, winner.address, sellerReservePrice);
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

    // Test case **ID: A79**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('084) auction contract has the correct amount of `MockERC20` tokens', async function () {
        // Test if the ERC20 pay tokens were refunded properly
        expect(await mockerc20.connect(owner).balanceOf(
            fantomauction.address)
        ).to.be.bignumber.equal(sellerReservePrice);
    });

     // Test case **ID: A80**:: Attempt to result a successful auction as the auction `winner`
     it('085) test auction `_tokenId(3)` successfully resulted by `winner`', async function() {
        /*
        // Create an auction with the specified parameters
        const _AuctionResultedEvent = await this.fantomauction.resultAuction(
            mockerc721.address,
            secondSellerTokenIdToSell,
            {from:seller}
        );
        
        // Expect `AuctionResulted` event emitted
        expectEvent(
            _AuctionResultedEvent,
            'AuctionResulted', { 
                0: seller,
                1: mockerc721.address, 
                2: secondSellerTokenIdToSell,
                3: winner,
                4: mockerc20.address,
                5: sellerReservePrice,
                6: sellerReservePrice
            }
        );
        */
        await expect(
            fantomauction.connect(seller).resultAuction(
                mockerc721.address,
                secondSellerTokenIdToSell))
            .to.emit(fantomauction, 'AuctionResulted')
            .withArgs(seller.address, mockerc721.address, secondSellerTokenIdToSell, winner.address, mockerc20.address, sellerReservePrice, sellerReservePrice);
    });

    // Test case **ID: A81**:: Check to ensure auction transferred `_tokenId(3)` to `winner` after winning auction and resulting
    it('086) `_tokenId(3)` successfully transferred from auction contract (escrow) to `winner` after resulting', async function() {
        const result = await mockerc721.connect(winner).ownerOf(secondSellerTokenIdToSell);

        expect((result).toString()).to.equal(winner.address);
    });

    // Test case **ID: A82**:: Check to ensure auction transferred `_tokenId(4)` to `winner` after winning auction and resulting
    it('087) `_tokenId(4)` successfully transferred from auction contract (escrow) to `winner` after resulting', async function() {
        const result = await mockerc721.connect(winner).ownerOf(sellerTokenIdToSell);

        expect((result).toString()).to.equal(winner.address);
    });

    // Test case **ID: A83**:: Ensure the proper amount of MockERC20 tokens have been transferred to users accordingly after a successful auction
    it('088) all users and auction contract have the correct amount of MockERC20 tokens after (2) successful auctions', async function () {
        const newBalanceSeller = new BigNumber.from("2200000000000000000000")
        const newBalanceWinner = new BigNumber.from("1800000000000000000000")
        // Test if the ERC20 pay tokens reflect properly
        expect(await mockerc20.connect(owner).balanceOf(
            owner.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            bidder.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            seller.address)
        ).to.be.bignumber.equal(newBalanceSeller);
        expect(await mockerc20.connect(owner).balanceOf(
            winner.address)
        ).to.be.bignumber.equal(newBalanceWinner);
        expect(await mockerc20.connect(owner).balanceOf(
            other.address)
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await mockerc20.connect(owner).balanceOf(
            hacker.address)
        ).to.be.bignumber.equal(ZERO);
        expect(await mockerc20.connect(owner).balanceOf(
            fantomauction.address)
        ).to.be.bignumber.equal(ZERO);
    });

});
