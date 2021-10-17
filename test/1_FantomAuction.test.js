// test/FantomAuction.test.js
// Load dependencies
const { 
    expect,
    assert
} = require('chai');

// Import utilities from OpenZeppelin Test Helpers
const { 
    BN,
    ether,
    expectEvent,
    expectRevert,
    time,
    balance,
    send,
    constants
} = require('@openzeppelin/test-helpers');

// Load compiled artifacts
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');
const FantomAuction = artifacts.require('FantomAuction');

// Set global variables
const ZERO = new BN("0");

// Set MockERC20 variables
const mockPayTokenName = "Fantom";
const mockPayTokenSymbol = "FTM";
const mockPayTokenMintAmount = new BN("2000000000000000000000"); // Sets test accounts to 2000 FTM

// Set MockERC721 variables
const mockNFTokenName = "Test NFT";
const mockNFTokenSymbol = "NFT";

// Set user `seller` variables for `FantomAuction`
const sellerReservePrice = new BN("100000000000000000000"); // 100 FTM
const sellerTokenIdToSell = new BN("4"); // Testing using NFT _tokenId: 4
const secondSellerTokenIdToSell = new BN("5"); // Testing using NFT _tokenId: 5

// Set user `seller` variables for `FantomAuction`
const bidderBidAmountMinimum = new BN("25000000000000000000"); // 25 FTM

// Start FantomAuction test block and initialize users in test case
contract('FantomAuction', function ([
        owner, 
        bidder, 
        seller, 
        winner,
        hacker,
        other
    ]) {

    // Log all users in test case in console
    console.log("Owner: " + owner);
    console.log("Bidder: " + bidder);
    console.log("Seller: " + seller);
    console.log("Winner: "+ winner);
    console.log("Hacker: "+ hacker);
    console.log("Other: " + other);

    // Do this before the whole testing environment
    // Deploy a new `MockERC20`, `MockERC721`, `FantomAuction` contract each run
    before(async function () {
        this.mockerc20 = await MockERC20.new(
            mockPayTokenName,
            mockPayTokenSymbol,
            0,
            {from:owner}
        );
        this.mockerc721 = await MockERC721.new(
            mockNFTokenName,
            mockNFTokenSymbol,
            {from:owner}
        );
        this.fantomauction = await FantomAuction.new(
            {from:owner}
        );
    });

    // Do this before each unit test
    beforeEach(async function () {
        await time.advanceBlock();
        time.increaseTo(await time.latest());
        //console.log((await time.latest()).toString());
    });

    afterEach(async function () {
        // Advance block once to get current block.timestamp
        await time.advanceBlock();
        // Advance 100 seconds to be able to start placing bids on current active auction by `seller`
        //time.increaseTo(Number(await time.latest())+100);
    });

    // Test case **ID: P0**:: Mint test ERC20 pay tokens to users
    it('000) `MockERC20` tokens minted to users properly', async function () {
        // Mint tokens for test users
        await this.mockerc20.mintPay(
            owner,
            mockPayTokenMintAmount,
            {from:owner}
        );
        await this.mockerc20.mintPay(
            bidder,
            mockPayTokenMintAmount,
            {from:bidder}
        );
        await this.mockerc20.mintPay(
            seller,
            mockPayTokenMintAmount,
            {from:seller}
        );
        await this.mockerc20.mintPay(
            winner,
            mockPayTokenMintAmount,
            {from:winner}
        );
        await this.mockerc20.mintPay(
            other,
            mockPayTokenMintAmount,
            {from:other}
        );

        // Test if the ERC20 pay tokens were minted properly
        expect(await this.mockerc20.balanceOf(
            owner,
            {from:owner})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            bidder,
            {from:bidder})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            seller,
            {from:seller})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            winner,
            {from:winner})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            other,
            {from:other})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: P1**:: Set MockERC20 `approve` to `FantomAuction` contract
    it('001) `MockERC20` `approve` set to `FantomAuction` for all test users', async function() {
        // Calls `approve` function for all users
        await this.mockerc20.approve(
            this.fantomauction.address,
            mockPayTokenMintAmount,
            {from:owner}
        );
        await this.mockerc20.approve(
            this.fantomauction.address,
            mockPayTokenMintAmount,
            {from:bidder}
        );
        await this.mockerc20.approve(
            this.fantomauction.address,
            mockPayTokenMintAmount,
            {from:seller}
        );
        await this.mockerc20.approve(
            this.fantomauction.address,
            mockPayTokenMintAmount,
            {from:winner}
        );
        await this.mockerc20.approve(
            this.fantomauction.address,
            mockPayTokenMintAmount,
            {from:other}
        );
        await this.mockerc20.approve(
            this.fantomauction.address,
            mockPayTokenMintAmount,
            {from:hacker}
        );

        // Test if the ERC20 `allowance` properly allowed `FantomAuction` to spend all ERC20 test tokens minted
        expect(await this.mockerc20.allowance(
            owner,
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.allowance(
            bidder,
            this.fantomauction.address,
            {from:bidder})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.allowance(
            seller,
            this.fantomauction.address,
            {from:seller})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.allowance(
            winner,
            this.fantomauction.address,
            {from:winner})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.allowance(
            other,
            this.fantomauction.address,
            {from:other})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.allowance(
            hacker,
            this.fantomauction.address,
            {from:hacker})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: N0**:: Mint and check balance of test MockERC721 tokens to users
    it('002) `MockERC721` tokens minted to users properly', async function() {
        // Mint NFT's for test users
        await this.mockerc721.mint(owner,{from:owner});
        await this.mockerc721.mint(bidder,{from:bidder});
        await this.mockerc721.mint(bidder,{from:bidder});
        await this.mockerc721.mint(seller,{from:seller});
        await this.mockerc721.mint(seller,{from:seller}); // Testing `createAuction()` using this NFT (_tokenId: 4)
        await this.mockerc721.mint(seller,{from:seller});
        await this.mockerc721.mint(other,{from:other});
        await this.mockerc721.mint(other,{from:other});
        await this.mockerc721.mint(other,{from:other});
        await this.mockerc721.mint(other,{from:other});

        var nftBalanceOfOwner = new BN("1"); 
        var nftBalanceOfBidder = new BN("2");
        var nftBalanceOfSeller = new BN("3");
        var nftBalanceOfOther = new BN("4");

        // Test if the MockERC721 `balanceOf` reflects properly before continuing with unit tests on auctions
        expect(await this.mockerc721.balanceOf(
            owner,
            {from:owner})
        ).to.be.bignumber.equal(nftBalanceOfOwner);
        expect(await this.mockerc721.balanceOf(
            bidder,
            {from:bidder})
        ).to.be.bignumber.equal(nftBalanceOfBidder);
        expect(await this.mockerc721.balanceOf(
            seller,
            {from:seller})
        ).to.be.bignumber.equal(nftBalanceOfSeller);
        expect(await this.mockerc721.balanceOf(
            other,
            {from:other})
        ).to.be.bignumber.equal(nftBalanceOfOther);
    });

    // Test case **ID: N1**:: Set MockERC721 `setApprovalForAll` to `FantomAuction` contract
    it('003) `MockERC721` `setApprovalForAll` set to `FantomAuction` for all test users', async function() {
        // Calls `setApprovalForAll` function for all users
        await this.mockerc721.setApprovalForAll(
            this.fantomauction.address,
            true,
            {from:owner}
        );
        await this.mockerc721.setApprovalForAll(
            this.fantomauction.address,
            true,
            {from:bidder}
        );
        await this.mockerc721.setApprovalForAll(
            this.fantomauction.address,
            true,
            {from:seller}
        );
        await this.mockerc721.setApprovalForAll(
            this.fantomauction.address,
            true,
            {from:winner}
        );
        await this.mockerc721.setApprovalForAll(
            this.fantomauction.address,
            true,
            {from:other}
        );
        await this.mockerc721.setApprovalForAll(
            this.fantomauction.address,
            true,
            {from:hacker}
        );

        // Test if the MockERC721 `isApprovedForAll` is properly set to the `FantomAuction` instance
        assert.isTrue(await this.mockerc721.isApprovedForAll(
            owner,
            this.fantomauction.address,
            {from:owner})
        );
        assert.isTrue(await this.mockerc721.isApprovedForAll(
            bidder,
            this.fantomauction.address,
            {from:bidder})
        );
        assert.isTrue(await this.mockerc721.isApprovedForAll(
            seller,
            this.fantomauction.address,
            {from:seller})
        );
        assert.isTrue(await this.mockerc721.isApprovedForAll(
            winner,
            this.fantomauction.address,
            {from:winner})
        );
        assert.isTrue(await this.mockerc721.isApprovedForAll(
            other,
            this.fantomauction.address,
            {from:other})
        );
        assert.isTrue(await this.mockerc721.isApprovedForAll(
            hacker,
            this.fantomauction.address,
            {from:hacker})
        );
    });

    // Test case **ID: A0**:: Set and check if owner is correctly initialized
    it('004) `owner` returns the initialized owner', async function () {
        // Call `initialize()`  and store owner address
        await this.fantomauction.initialize(owner,{from:owner});

        // Test if the owner is properly reflected upon calling `initialize()`
        expect((await this.fantomauction.owner({from:owner})).toString()).to.equal(owner);
    });

    // Test case **ID: A1**:: Check if non-owners can pause the auction contract
    it('005) cannot pause auction contract if not `owner`', async function () {

        // Test if non-owners can pause the auction contract upon calling `toggleIsPaused()`
        await expectRevert(
          this.fantomauction.toggleIsPaused({from:other}),
          'Ownable: caller is not the owner',
        );
    });

    // Test case **ID: A2**:: Set and check address registry
    it('006) `FantomAuction` address registry set to `MockERC20`', async function () {
        // Call `updateAddressRegistry()` and store owner address
        await this.fantomauction.updateAddressRegistry(this.mockerc20.address,{from:owner});

        // Test if the owner is properly reflected upon calling `addressRegistry()`
        expect((await this.fantomauction.addressRegistry({from:owner})).toString()).to.equal(this.mockerc20.address);
    });

    // Test case **ID: A3**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('007) test auction created successfully for user `seller`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            this.mockerc20.address,
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
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: this.mockerc20.address
            }
        );
    });

    // Test case **ID: A**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` created
    it('008) NFT successfully in escrow with auction contract', async function() {
        const result = await this.mockerc721.ownerOf(4,{from:seller});

        expect((result).toString()).to.equal(this.fantomauction.address);
    });

    // Test case **ID: A4**:: Check that the created auction matches the sellers parameters
    it('009) created auction `seller` is `_owner`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await this.fantomauction.getAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            {from:seller}
        );
        // Assign the result's (return)
        const {0: _owner} = result;

        // Test the `createAuction` data calling `getAuction`
        expect((_owner).toString()).to.equal(seller); // Expect created auction `_owner` to be `seller`
    });

    // Test case **ID: A5**:: Check that the created auction matches the sellers parameters
    it('010) created auction `_payToken` is `MockERC20`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await this.fantomauction.getAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            {from:seller}
        );
        // Assign the result's (return)
        const {1: _payToken} = result;

        // Test the `createAuction` data calling `getAuction`
        expect((_payToken).toString()).to.equal(this.mockerc20.address); // Expect created auction `_payToken` to be `MockERC20` (_payToken input)
    });

    // Test case **ID: A6**:: Check that the created auction matches the sellers parameters
    it('011) created auction `_reservePrice` is `sellerReservePrice`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await this.fantomauction.getAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            {from:seller}
        );
        // Assign the result's (return)
        const {2: _reservePrice} = result;

        // Test the `createAuction` data calling `getAuction`
        expect((_reservePrice).toString()).to.equal(sellerReservePrice.toString()); // Expect created auction `_reservePrice` to be `sellerReservePrice`
    });

    // Test case **ID: A9**:: Check that the created auction matches the sellers parameters
    it('012) created auction `_resulted` is `false`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await this.fantomauction.getAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            {from:seller}
        );
        // Assign the result's (return)
        const {5: _resulted} = result;

        // Test the `createAuction` data calling `getAuction`
        assert.isFalse(_resulted); // Expect created auction `_resulted` to be `false`
    });

    // Test case **ID: A10**:: Check that the created auction matches the minimum bid
    it('013) created auction `_minBid` is `0`', async function() {
        // Get result of the created auction with `getAuction()`
        const result = await this.fantomauction.getAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            {from:seller}
        );
        // Assign the result's (return)
        const {6: _minBid} = result;

        // Test the `createAuction` data calling `getAuction`
        expect((_minBid).toString()).to.equal("0"); // Expect created auction `_minBid` to be `0`
    });


    // Test case **ID: A11**:: Attempt to relist currently active auction
    it('014) `seller` cannot relist the same NFT while active auction exists', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction with the specified parameters
            this.fantomauction.createAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:seller}),
            "not owner and or contract not approved"
        );
    });

    // Test case **ID: A12**:: Attempt to list an un-owned NFT
    it('015) cannot list auction if not owner of NFT', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction from user `other` using the `_tokenId(3)` owned by `seller`
            this.fantomauction.createAuction(
                this.mockerc721.address,
                3,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:other}),
            "not owner and or contract not approved"
        );
    });

    // Test case **ID: A13**:: Attempt to list an auction with an `_endTime` of `0`
    it('016) `createAuction()` `_endTimestamp` cannot be `0`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction using the `_tokenId(3)` owned by `seller` and `_endTime` of `0`
            this.fantomauction.createAuction(
                this.mockerc721.address,
                3,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                0,
                {from:seller}),
            "end time must be greater than start (by 5 minutes)"
        );
    });

    // Test case **ID: A14**:: Attempt to list an auction with an `_endTime` of `1`
    it('017) `createAuction()` `_endTimestamp` cannot be `1`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction using the `_tokenId(3)` owned by `seller` and `_endTime` of `1`
            this.fantomauction.createAuction(
                this.mockerc721.address,
                3,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                1,
                {from:seller}),
            "end time must be greater than start (by 5 minutes)"
        );
    });

    // Test case **ID: A15**:: Attempt to list an auction with an `_endTime` before the `_startTime`
    it('018) `_endTimestamp` cannot be less than `_startTimestamp`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction using the `_tokenId(3)` owned by `seller`
            this.fantomauction.createAuction(
                this.mockerc721.address,
                3,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+300,
                false,
                Number(await time.latest())+299,
                {from:seller}),
            "end time must be greater than start (by 5 minutes)"
        );
    });

    // Test case **ID: A16**:: Attempt to list an auction with a `_endTimestamp` less than 5 minutes (set hard limit)
    it('019) `_endTimestamp` must be greater than 5 minutes past `_startTimestamp`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction using the `_tokenId(3)` owned by `seller`
            this.fantomauction.createAuction(
                this.mockerc721.address,
                3,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+304,
                {from:seller}),
            "end time must be greater than start (by 5 minutes)"
        );
    });

    // Test case **ID: A17**:: Attempt to cancel an auction that isn't owned by the auction contract
    it('020) cannot cancel an auction not owned by the auction contract', async function() {
        await expectRevert(
            // Cancel auction with `_tokenId` of `1` (NFT not owned by auction contract)
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                1,
                {from:seller}),
            "sender must be owner"
        );
    });

    // Test case **ID: A18**:: Attempt to cancel an auction that isn't owned by the `msg.sender`
    it('021) cannot cancel an auction you do not own', async function() {
        await expectRevert(
            // Cancel auction with `_tokenId` of `4` (NFT owned by `seller`) as `other` user
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                4,
                {from:other}),
            "sender must be owner"
        );
    });

    // Test case **ID: A19**:: Attempt to cancel an active auction with no bids that has not expired
    it('022) test auction cancelled successfully by user `seller`', async function() {
        // Cancel auction with `_tokenId` of `4` from `seller`
        const _cancelledAuctionEvent = await this.fantomauction.cancelAuction(
            this.mockerc721.address,
            4,
            {from:seller}
        );

        // Expect `AuctionCancelled` event emitted
        expectEvent(
            _cancelledAuctionEvent,
            'AuctionCancelled', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell
            }
        );
    });

    // Test case **ID: A20**:: Attempt to cancel an auction that was already cancelled
    it('023) cannot cancel an auction that has already been cancelled', async function() {
        await expectRevert(
            // Cancel auction with `_tokenId` of `4` (NFT owned by `seller`) as `seller` user
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                4,
                {from:seller}),
            "sender must be owner"
        );
    });

    // Test case **ID: A21**:: Cancelled auction NFT successfully transferred ownership back to `seller` from auction contract
    it('024) cancelled auction NFT successfully transferred ownership back to `seller`', async function() {
        const result = await this.mockerc721.ownerOf(4,{from:seller});

        expect((result).toString()).to.equal(seller);
    });

    // Test case **ID: A22**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('025) successfully relisted auction for `seller` `_tokenId(4)` after cancelling', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            this.mockerc20.address,
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
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: this.mockerc20.address
            }
        );
    });

    // Test case **ID: A23**:: Attempt to place a bid on the auction `seller` created before it starts
    it('026) cannot place a bid before auction starts', async function() {
        await expectRevert(
            this.fantomauction.placeBid(
                this.mockerc721.address,
                4,
                sellerReservePrice,
                {from:bidder}),
            "bidding outside of the auction window"
        );
    });

    // Test case **ID: A24**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('027) NFT successfully in escrow with auction contract after relisting by `seller`', async function() {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+200); // Increase blockchain time by `` seconds for testing purposes
        const result = await this.mockerc721.ownerOf(4,{from:seller});

        expect((result).toString()).to.equal(this.fantomauction.address);
    });

    /*
    // Utility case:: Simulate time advance with transaction
    it('blockchain time successfully moved (for testing only)', async function() {

        const result = true;
        assert.isTrue(result);
    });
    */

    // Test case **ID: A25**:: Attempt to place a bid of zero
    it('028) cannot place a bid of zero', async function() {
        await expectRevert(
            this.fantomauction.placeBid(
                this.mockerc721.address,
                sellerTokenIdToSell,
                0,
                {from:bidder}),
                "failed to outbid highest bidder"
        );
    });

    // Test case **ID: A26**:: Attempt to place a bid below `minBidIncrement`
    it('029) cannot place bids below `minBidIncrement`', async function () {
        const bidAttempt = new BN("24000000000000000000");
        
        await expectRevert(
            this.fantomauction.placeBid(
                this.mockerc721.address,
                sellerTokenIdToSell,
                bidAttempt,
                {from:bidder}),
                "failed to outbid highest bidder"
        );
    });

    // Test case **ID: A27**:: Attempt to successfully place a bid
    it('030) bid successfully placed at `minBidIncrement`', async function () {
        const bidAttempt = new BN("25000000000000000000");

        const _placeBidEvent = await this.fantomauction.placeBid(
            this.mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: bidder,
                3: bidAttempt
            }
        );
    });

    // Test case **ID: A**:: Ensure that bidders are properly transferred to auction contract
    it('031) `MockERC20` tokens properly transferred to auction contract', async function () {
        const amount = new BN("1975000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            bidder,
            {from:bidder})
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('032) auction contract has the correct amount of `MockERC20` tokens', async function () {
        const amount = new BN("25000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A28**:: Attempt to place a bid below `minBidIncrement` after another bid has been placed
    it('033) also cannot place bids below `minBidIncrement` after bid placed', async function () {
        const bidAttempt = new BN("24000000000000000000");
        
        await expectRevert(
            this.fantomauction.placeBid(
                this.mockerc721.address,
                sellerTokenIdToSell,
                bidAttempt,
                {from:bidder}),
                "failed to outbid highest bidder"
        );
    });

    // Test case **ID: A29**:: Attempt to cancel an active auction that currently has a bid as `other`
    it('034) cannot cancel active auction that you dont own', async function() {
        // Cancel auction with `_tokenId` of `4` from `other`
        await expectRevert(
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                4,
                {from:other}),
            "sender must be owner"
        );
    });

    // Test case **ID: A30**:: Attempt to cancel an active auction that currently has a bid as `owner`
    it('035) auction contract cannot cancel an auction they dont own', async function() {
        // Cancel auction with `_tokenId` of `4` from `owner`
        await expectRevert(
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                4,
                {from:owner}),
            "sender must be owner"
        );
    });

    // Test case **ID: A31**:: Attempt to cancel an active auction that currently has a bid
    it('036) successfully cancelled auction that has bids below reserve price as `seller`', async function() {
        // Cancel auction with `_tokenId` of `4` from `seller`
        const _cancelledAuctionEvent = await this.fantomauction.cancelAuction(
            this.mockerc721.address,
            4,
            {from:seller}
        );

        // Expect `AuctionCancelled` event emitted
        expectEvent(
            _cancelledAuctionEvent,
            'AuctionCancelled', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell
            }
        );
    });

    // Test case **ID: A**:: Ensure that bidders are properly refunded
    it('037) `MockERC20` tokens properly refunded to bidder after cancelled auction', async function () {
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            bidder,
            {from:bidder})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: A33**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('038) successfully relisted auction for `seller` `_tokenId(4)` after cancelling auction with bids', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            this.mockerc20.address,
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
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: this.mockerc20.address
            }
        );
    });

    // Test case **ID: A34**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('039) NFT successfully in escrow with auction contract after relisting by `seller`', async function() {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+5);
        const result = await this.mockerc721.ownerOf(4,{from:seller});

        expect((result).toString()).to.equal(this.fantomauction.address);
    });

    // Test case **ID: A35**:: Attempt to successfully place a bid
    it('040) bid successfully placed at `minBidIncrement` by `bidder`', async function () {
        const bidAttempt = new BN("25000000000000000000");

        const _placeBidEvent = await this.fantomauction.placeBid(
            this.mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: bidder,
                3: bidAttempt
            }
        );
    });

    // Test case **ID: A6**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('041) auction contract has the correct amount of `MockERC20` tokens', async function () {
        const amount = new BN("25000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A37**:: Attempt to successfully outbid highest bidder
    it('042) previous bidder `bidder` successfully outbid by `other`', async function () {
        const bidAttempt = new BN("50000000000000000000");

        const _placeBidEvent = await this.fantomauction.placeBid(
            this.mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt,
            {from:other}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: other,
                3: bidAttempt
            }
        );
    });

    // Test case **ID: A38**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('043) auction contract has the correct amount of `MockERC20` tokens', async function () {
        const amount = new BN("50000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A39**:: Attempt to successfully place a bid
    it('044) previous bidder `other` successfully outbid by `bidder`', async function () {
        const bidAttempt = new BN("75000000000000000000");

        const _placeBidEvent = await this.fantomauction.placeBid(
            this.mockerc721.address,
            sellerTokenIdToSell,
            bidAttempt,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: bidder,
                3: bidAttempt
            }
        );
    });

    // Test case **ID: A40**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('045) auction contract has the correct amount of `MockERC20` tokens', async function () {
        const amount = new BN("75000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A41**:: Ensure that bidders are properly refunded after being outbid
    it('046) `MockERC20` tokens properly refunded to bidder after being outbid and placing new bid', async function () {
        const amount = new BN("1925000000000000000000");
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            bidder,
            {from:bidder})
        ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A42**:: Ensure that tokens are properly transferred after outbidding
    it('047) `MockERC20` tokens properly transferred back to `other` after `bidder` outbid `other`', async function () {
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            other,
            {from:other})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: A43**:: Attempt to result an auction that hasn't ended yet as `seller`
    it('048) cannot result an auction that hasnt ended as `seller`', async function() {
        await expectRevert(
            this.fantomauction.resultAuction(
                this.mockerc721.address,
                4,
                {from:seller}),
            "auction not ended"
        );
    });

    // Test case **ID: A44**:: Attempt to result an auction that hasn't ended yet as `other`
    it('049) cannot result an auction that hasnt ended as `other`', async function() {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+500);
        await expectRevert(
            this.fantomauction.resultAuction(
                this.mockerc721.address,
                4,
                {from:other}),
            "_msgSender() must be auction winner or seller"
        );
    });

    // Test case **ID: A45**:: Attempt to result a finished auction that ended with bids below the minimum reserve price
    it('050) cannot result a finished auction that ended with bids below the reserve price', async function() {
        await expectRevert(
            this.fantomauction.resultAuction(
                this.mockerc721.address,
                4,
                {from:seller}),
            "highest bid is below reservePrice"
        );
    });

    // Test case **ID: A46**:: Attempt to result a finished auction that ended with bids below the minimum reserve price as someone other than `seller` or `winner`
    it('051) cannot result a finished auction that ended with bids below the reserve price as non-owner', async function() {
        await expectRevert(
            this.fantomauction.resultAuction(
                this.mockerc721.address,
                4,
                {from:hacker}),
            "_msgSender() must be auction winner or seller"
        );
    });

    // Test case **ID: A47**:: Attempt to cancel an auction that ended  with bids below reserve price (with bids below reserve price)
    it('052) cannot cancel an auction that has ended with bids below reserve price as `bidder` or `winner` (must be arranged via resultFailedAuction())', async function() {
        await expectRevert(
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                4,
                {from:bidder}),
            "sender must be owner"
        );
    });

    // Test case **ID: A48**:: Attempt to cancel an auction that has ended with bids below reserve price
    it('053) successfully cancelled auction that ended with bids below reserve price as `seller`', async function() {
        // Cancel auction with `_tokenId` of `4` from `seller`
        const _cancelledAuctionEvent = await this.fantomauction.cancelAuction(
            this.mockerc721.address,
            4,
            {from:seller}
        );

        // Expect `AuctionCancelled` event emitted
        expectEvent(
            _cancelledAuctionEvent,
            'AuctionCancelled', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell
            }
        );
    });

    // Test case **ID: A49**:: Ensure the NFT has been properly transferred back to the `seller`
    it('054) cancelled auction NFT successfully transferred ownership back to `seller`', async function() {
        const result = await this.mockerc721.ownerOf(4,{from:seller});

        expect((result).toString()).to.equal(seller);
    });

    // Test case **ID: A50**:: Ensure the proper amount of MockERC20 tokens have been transferred back to the proper users after bidding, outbidding, cancelling, and refunding
    it('055) all users and auction contract have the correct amount of MockERC20 tokens', async function () {
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            owner,
            {from:owner})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            bidder,
            {from:bidder})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            seller,
            {from:seller})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            winner,
            {from:winner})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            other,
            {from:other})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            hacker,
            {from:hacker})
        ).to.be.bignumber.equal(ZERO);
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(ZERO);
    });

    // Test case **ID: A51**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('056) successfully relisted auction for `seller` `_tokenId(4)` after cancelling ended auction with bids', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            this.mockerc20.address,
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
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: this.mockerc20.address
            }
        );
    });

    // Test case **ID: A52**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('057) `_tokenId(4)` successfully in escrow with auction contract after relisting by `seller`', async function() {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+10);
        const result = await this.mockerc721.ownerOf(4,{from:seller});

        expect((result).toString()).to.equal(this.fantomauction.address);
    });

    // Test case **ID: A53**:: Attempt to successfully place a bid at the `bidderBidAmountMinimum` by `bidder`
    it('058) bid successfully placed at `bidderBidAmountMinimum` by `bidder`', async function () {
        const _placeBidEvent = await this.fantomauction.placeBid(
            this.mockerc721.address,
            sellerTokenIdToSell,
            bidderBidAmountMinimum,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: bidder,
                3: bidderBidAmountMinimum
            }
        );
    });

    // Test case **ID: A54**:: Attempt to successfully place a bid at the reserve price by `winner`
    it('059) bid successfully placed at `sellerReservePrice` by `winner`', async function () {
        const _placeBidEvent = await this.fantomauction.placeBid(
            this.mockerc721.address,
            sellerTokenIdToSell,
            sellerReservePrice,
            {from:winner}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: this.mockerc721.address,
                1: sellerTokenIdToSell, 
                2: winner,
                3: sellerReservePrice
            }
        );
    });

    // Test case **ID: A55**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('060) auction contract has the correct amount of `MockERC20` tokens', async function () {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+500);
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(sellerReservePrice);
    });

    // Test case **ID: A56**:: Attempt to place a bid on the auction `seller` created after it ended 
    it('061) cannot place a bid after auction has ended', async function() {
        await expectRevert(
            this.fantomauction.placeBid(
                this.mockerc721.address,
                4,
                sellerReservePrice,
                {from:other}),
            "bidding outside of the auction window"
        );
    });

    // Test case **ID: A57**:: Attempt to cancel an auction that has ended with a bid >= reserve price as `seller`
    it('062) cannot cancel an auction that has ended with bids >= reserve price as `seller`', async function() {
        await expectRevert(
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                4,
                {from:seller}),
            "Highest bid is currently above reserve price"
        );
    });

    // Test case **ID: A58**:: Attempt to cancel an auction that has ended with a bid >= reserve price as `other`
    it('063) cannot cancel an auction that has ended with bids >= reserve price as `other`', async function() {
        await expectRevert(
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                4,
                {from:other}),
            "sender must be owner"
        );
    });

    // Test case **ID: A59**:: Attempt to cancel an auction that has ended with a bid >= reserve price `winner`
    it('064) cannot cancel an auction that has ended with bids >= reserve price as `winner`', async function() {
        await expectRevert(
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                4,
                {from:winner}),
            "sender must be owner"
        );
    });

    // Test case **ID: A60**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `seller`
    it('065) cannot resultFailedAuction() an auction that has met reserve price as `seller`', async function() {
        await expectRevert(
            this.fantomauction.resultFailedAuction(
                this.mockerc721.address,
                4,
                {from:seller}),
            "highest bid is >= reservePrice"
        );
    });

    // Test case **ID: A61**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `winner`
    it('066) cannot resultFailedAuction() an auction that has met reserve price as `winner`', async function() {
        await expectRevert(
            this.fantomauction.resultFailedAuction(
                this.mockerc721.address,
                4,
                {from:winner}),
            "highest bid is >= reservePrice"
        );
    });

    // Test case **ID: A62**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `other`
    it('067) cannot resultFailedAuction() an auction that has met reserve price as `other`', async function() {
        await expectRevert(
            this.fantomauction.resultFailedAuction(
                this.mockerc721.address,
                4,
                {from:other}),
            "_msgSender() must be auction topBidder or seller"
        );
    });

    // Test case **ID: A63**:: Attempt to relist an auction that has ended with bids >= reserve price as `seller`
    it('068) cannot relist an un-resulted auction that has successfully ended as `seller`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction with the specified parameters
            this.fantomauction.createAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:seller}),
            "not owner and or contract not approved"
        );
    });

    // Test case **ID: A64**:: Attempt to relist an auction that has ended with bids >= reserve price as `other`
    it('069) cannot relist an un-resulted auction that has successfully ended as `other`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction with the specified parameters
            this.fantomauction.createAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:other}),
            "not owner and or contract not approved"
        );
    });

    // Test case **ID: A65**:: Attempt to result an auction that ended successfully by user `other`
    it('070) cannot result a successful auction as `other`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            this.fantomauction.resultAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                {from:other}),
            "_msgSender() must be auction winner or seller"
        );
    });

    // Test case **ID: A66**:: Attempt to result a successful auction as the auction `seller`
    it('071) test auction `_tokenId(4)` successfully resulted by `seller`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        // Create an auction with the specified parameters
        const _AuctionResultedEvent = await this.fantomauction.resultAuction(
            this.mockerc721.address,
            sellerTokenIdToSell,
            {from:seller}
        );
        
        // Expect `AuctionResulted` event emitted
        expectEvent(
            _AuctionResultedEvent,
            'AuctionResulted', { 
                0: seller,
                1: this.mockerc721.address, 
                2: sellerTokenIdToSell,
                3: winner,
                4: this.mockerc20.address,
                5: sellerReservePrice,
                6: sellerReservePrice
            }
        );
    });

    // Test case **ID: A67**:: Attempt to result an auction that ended successfully by user `seller`
    it('072) cannot result an auction that has already been resulted as `seller`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            this.fantomauction.resultAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                {from:seller}),
            "address(this) must be the item owner"
        );
    });

    // Test case **ID: A68**:: Attempt to result an auction that ended successfully by user `other`
    it('073) cannot result an auction that has already been resulted as `other`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            this.fantomauction.resultAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                {from:other}),
            "address(this) must be the item owner"
        );
    });

    // Test case **ID: A69**:: Attempt to result an auction that ended successfully by user `winner`
    it('074) cannot result an auction that has already been resulted as `winner`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            this.fantomauction.resultAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                {from:winner}),
            "address(this) must be the item owner"
        );
    });

    // Test case **ID: A70**:: Attempt to list relist an auction that `seller` has already sold and resulted
    it('075) `seller` cannot relist an auction they sold and resulted already', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction using the `_tokenId(4)` owned by `seller`
            this.fantomauction.createAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:seller}),
            "not owner and or contract not approved"
        );
    });

    // Test case **ID: A71**:: Attempt to list relist an auction that `other` has already sold and resulted
    it('076) `other` cannot relist a sold and resulted auction they didnt win', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        await expectRevert(
            // Create an auction using the `_tokenId(4)` owned by `other`
            this.fantomauction.createAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                this.mockerc20.address,
                sellerReservePrice,
                Number(await time.latest())+5,
                false,
                Number(await time.latest())+305,
                {from:other}),
            "not owner and or contract not approved"
        );
    });

    // Test case **ID: A72**:: Attempt to cancel an auction that has ended successfully and has been resulted as user `seller`
    it('077) cannot cancel an auction that has ended successfully and has been resulted as `seller`', async function() {
        await expectRevert(
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                {from:seller}),
            "sender must be owner"
        );
    });

    // Test case **ID: A73**:: Attempt to cancel an auction that has ended successfully and has been resulted as user `other`
    it('078) cannot cancel an auction that has ended successfully and has been resulted as `other`', async function() {
        await expectRevert(
            this.fantomauction.cancelAuction(
                this.mockerc721.address,
                sellerTokenIdToSell,
                {from:other}),
            "sender must be owner"
        );
    });

    // Test case **ID: A74**:: Ensure the proper amount of MockERC20 tokens have been transferred to users accordingly after a successful auction
    it('079) all users and auction contract have the correct amount of MockERC20 tokens after a successful auction', async function () {
        const newBalanceSeller = new BN("2100000000000000000000")
        const newBalanceWinner = new BN("1900000000000000000000")
        // Test if the ERC20 pay tokens reflect properly
        expect(await this.mockerc20.balanceOf(
            owner,
            {from:owner})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            bidder,
            {from:bidder})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            seller,
            {from:seller})
        ).to.be.bignumber.equal(newBalanceSeller);
        expect(await this.mockerc20.balanceOf(
            winner,
            {from:winner})
        ).to.be.bignumber.equal(newBalanceWinner);
        expect(await this.mockerc20.balanceOf(
            other,
            {from:other})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            hacker,
            {from:hacker})
        ).to.be.bignumber.equal(ZERO);
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(ZERO);
    });

    // Test case **ID: A75**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `3` and check for event
    it('080) successfully listed auction for `seller` `_tokenId(3)`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        // Create an auction with the specified parameters
        const _createdAuctionEvent = await this.fantomauction.createAuction(
            this.mockerc721.address,
            secondSellerTokenIdToSell,
            this.mockerc20.address,
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
                0: this.mockerc721.address,
                1: secondSellerTokenIdToSell, 
                2: this.mockerc20.address
            }
        );
    });

    // Test case **ID: A76**:: Check to ensure auction contract now owns (escrow) `_tokenId(3)` auction `seller` relisted
    it('081) `_tokenId(3)` successfully in escrow with auction contract after relisting by `seller`', async function() {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+10);
        const result = await this.mockerc721.ownerOf(secondSellerTokenIdToSell,{from:seller});

        expect((result).toString()).to.equal(this.fantomauction.address);
    });

    // Test case **ID: A77**:: Attempt to successfully place a bid at the `bidderBidAmountMinimum` by `bidder`
    it('082) bid successfully placed at `bidderBidAmountMinimum` by `bidder`', async function () {
        const _placeBidEvent = await this.fantomauction.placeBid(
            this.mockerc721.address,
            secondSellerTokenIdToSell,
            bidderBidAmountMinimum,
            {from:bidder}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: this.mockerc721.address,
                1: secondSellerTokenIdToSell, 
                2: bidder,
                3: bidderBidAmountMinimum
            }
        );
    });

    // Test case **ID: A78**:: Attempt to successfully place a bid at the reserve price by `winner`
    it('083) bid successfully placed at `sellerReservePrice` by `winner`', async function () {
        const _placeBidEvent = await this.fantomauction.placeBid(
            this.mockerc721.address,
            secondSellerTokenIdToSell,
            sellerReservePrice,
            {from:winner}
        );
        
        // Expect `_placeBidEvent` event emitted
        expectEvent(
            _placeBidEvent,
            'BidPlaced', { 
                0: this.mockerc721.address,
                1: secondSellerTokenIdToSell, 
                2: winner,
                3: sellerReservePrice
            }
        );
    });

    // Test case **ID: A79**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('084) auction contract has the correct amount of `MockERC20` tokens', async function () {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest())+500);
        // Test if the ERC20 pay tokens were refunded properly
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(sellerReservePrice);
    });

     // Test case **ID: A80**:: Attempt to result a successful auction as the auction `winner`
     it('085) test auction `_tokenId(3)` successfully resulted by `winner`', async function() {
        // Advance block once to get current block.timestamp
        time.advanceBlock();

        // Create an auction with the specified parameters
        const _AuctionResultedEvent = await this.fantomauction.resultAuction(
            this.mockerc721.address,
            secondSellerTokenIdToSell,
            {from:seller}
        );
        
        // Expect `AuctionResulted` event emitted
        expectEvent(
            _AuctionResultedEvent,
            'AuctionResulted', { 
                0: seller,
                1: this.mockerc721.address, 
                2: secondSellerTokenIdToSell,
                3: winner,
                4: this.mockerc20.address,
                5: sellerReservePrice,
                6: sellerReservePrice
            }
        );
    });

    // Test case **ID: A81**:: Check to ensure auction transferred `_tokenId(3)` to `winner` after winning auction and resulting
    it('086) `_tokenId(3)` successfully transferred from auction contract (escrow) to `winner` after resulting', async function() {
        time.advanceBlock();
        const result = await this.mockerc721.ownerOf(secondSellerTokenIdToSell,{from:winner});

        expect((result).toString()).to.equal(winner);
    });

    // Test case **ID: A82**:: Check to ensure auction transferred `_tokenId(4)` to `winner` after winning auction and resulting
    it('087) `_tokenId(4)` successfully transferred from auction contract (escrow) to `winner` after resulting', async function() {
        time.advanceBlock();
        const result = await this.mockerc721.ownerOf(sellerTokenIdToSell,{from:winner});

        expect((result).toString()).to.equal(winner);
    });

    // Test case **ID: A83**:: Ensure the proper amount of MockERC20 tokens have been transferred to users accordingly after a successful auction
    it('088) all users and auction contract have the correct amount of MockERC20 tokens after (2) successful auctions', async function () {
        const newBalanceSeller = new BN("2200000000000000000000")
        const newBalanceWinner = new BN("1800000000000000000000")
        // Test if the ERC20 pay tokens reflect properly
        expect(await this.mockerc20.balanceOf(
            owner,
            {from:owner})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            bidder,
            {from:bidder})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            seller,
            {from:seller})
        ).to.be.bignumber.equal(newBalanceSeller);
        expect(await this.mockerc20.balanceOf(
            winner,
            {from:winner})
        ).to.be.bignumber.equal(newBalanceWinner);
        expect(await this.mockerc20.balanceOf(
            other,
            {from:other})
        ).to.be.bignumber.equal(mockPayTokenMintAmount);
        expect(await this.mockerc20.balanceOf(
            hacker,
            {from:hacker})
        ).to.be.bignumber.equal(ZERO);
        expect(await this.mockerc20.balanceOf(
            this.fantomauction.address,
            {from:owner})
        ).to.be.bignumber.equal(ZERO);
    });

});
