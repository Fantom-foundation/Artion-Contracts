// test/FantomAuctionv2.test.js
// This test is designed to run through a full scenario of the `FantomAuction` contract
// being deployed, going through each function one line at a time to ensure that every
// line of code functions as-intended. This test has also been split up into various
// smaller unit tests that encompass specific functions; this was done to provide a
// human-readable version of the unit tests.

// Load dependencies
const hre = require('hardhat');
const { solidity } = require('ethereum-waffle');
const { expect } = require('chai').use(solidity);
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');
const { callBefore } = require('./utils/before.js');
const {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  FIVE,
  mockPayTokenName,
  mockPayTokenSymbol,
  mockPayTokenMintAmount,
  mockNFTokenName,
  mockNFTokenSymbol,
  sellerReservePrice,
  sellerNewReservePrice,
  bidderBidAmountMinimum
} = require('./utils/index_ethers.js');

// Full-contract unit test
contract('FantomAuction', async function () {
  before(async function () {
    // Get all compiled contracts
    MockERC20 = await ethers.getContractFactory('MockERC20');
    MockERC721 = await ethers.getContractFactory('MockERC721');
    MockPriceOracleProxy = await ethers.getContractFactory(
      'MockPriceOracleProxy'
    );
    FantomAuction = await ethers.getContractFactory('MockFantomAuction');
    FantomArtion = await ethers.getContractFactory('Artion');
    FantomMarketplace = await ethers.getContractFactory('FantomMarketplace');
    FantomBundleMarketplace = await ethers.getContractFactory(
      'FantomBundleMarketplace'
    );
    FantomAddressRegistry = await ethers.getContractFactory(
      'FantomAddressRegistry'
    );
    FantomTokenRegistry = await ethers.getContractFactory(
      'FantomTokenRegistry'
    );
    FantomRoyaltyRegistry = await ethers.getContractFactory(
      'FantomRoyaltyRegistry'
    );
    FantomPriceFeed = await ethers.getContractFactory('FantomPriceFeed');

    // Get all users in the unit test
    [owner, bidder, seller, winner, hacker, other] = await ethers.getSigners();

    // Deploy all contracts that are part of the unit test
    mockerc20 = await MockERC20.deploy(
      mockPayTokenName,
      mockPayTokenSymbol,
      ZERO
    );
    await mockerc20.deployed();
    mockerc721 = await MockERC721.deploy(mockNFTokenName, mockNFTokenSymbol);
    await mockerc721.deployed();
    mockPriceOracleProxy = await MockPriceOracleProxy.deploy();
    await mockPriceOracleProxy.deployed();
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
    fantomPriceFeed = await FantomPriceFeed.deploy(
      fantomaddressregistry.address,
      mockerc20.address
    );
    await fantomPriceFeed.deployed();

    // Call function `callBefore()` in `./utils/before.js` to establish testing environment
    await callBefore();
  });

  // The `afterEach()` function will run before each test and is used to keep track of
  // block time as the test moves time around to account for time-constrained functionality.
  afterEach(async function () {
    const timeNow = new BigNumber.from(Number(await time.latest()));
    fantomauction.connect(owner).hardhatTimestamp(timeNow);
  });

  describe('FantomAuction extensive unit test', function () {
    it('005) cannot pause auction contract if not `owner`', async function () {
      await expectRevert(
        fantomauction.connect(other).toggleIsPaused(),
        'Ownable: caller is not the owner'
      );
    });

    // Test case **ID: A3**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('007) test auction created successfully for user `seller`', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 305)
          )
      )
        .to.emit(fantomauction, 'AuctionCreated')
        .withArgs(mockerc721.address, FOUR, mockerc20.address);
    });

    // Test case **ID: A**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` created
    it('008) NFT successfully in escrow with auction contract', async function () {
      const result = await mockerc721.connect(seller).ownerOf(FOUR);

      expect(result.toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A4**:: Check that the created auction matches the sellers parameters
    it('009) created auction `seller` is `_owner`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomauction
        .connect(seller)
        .getAuction(mockerc721.address, FOUR);
      // Assign the result's (return)
      const { 0: _owner } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_owner.toString()).to.equal(seller.address); // Expect created auction `_owner` to be `seller`
    });

    // Test case **ID: A5**:: Check that the created auction matches the sellers parameters
    it('010) created auction `_payToken` is `MockERC20`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomauction
        .connect(owner)
        .getAuction(mockerc721.address, FOUR);
      // Assign the result's (return)
      const { 1: _payToken } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_payToken.toString()).to.equal(mockerc20.address); // Expect created auction `_payToken` to be `MockERC20` (_payToken input)
    });

    // Test case **ID: A6**:: Check that the created auction matches the sellers parameters
    it('011) created auction `_reservePrice` is `sellerReservePrice`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomauction
        .connect(owner)
        .getAuction(mockerc721.address, FOUR);
      // Assign the result's (return)
      const { 2: _reservePrice } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_reservePrice.toString()).to.equal(sellerReservePrice.toString()); // Expect created auction `_reservePrice` to be `sellerReservePrice`
    });

    // Test case **ID: A9**:: Check that the created auction matches the sellers parameters
    it('012) created auction `_resulted` is `false`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomauction
        .connect(owner)
        .getAuction(mockerc721.address, FOUR);
      // Assign the result's (return)
      const { 5: _resulted } = result;

      // Test the `createAuction` data calling `getAuction`
      assert.isFalse(_resulted); // Expect created auction `_resulted` to be `false`
    });

    // Test case **ID: A10**:: Check that the created auction matches the minimum bid
    it('013) created auction `_minBid` is `0`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomauction
        .connect(owner)
        .getAuction(mockerc721.address, FOUR);
      // Assign the result's (return)
      const { 6: _minBid } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_minBid.toString()).to.equal('0'); // Expect created auction `_minBid` to be `0`
    });

    // Test case **ID: A11**:: Attempt to relist currently active auction
    it('014) `seller` cannot relist the same NFT while active auction exists', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 305)
          )
      ).to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A12**:: Attempt to list an un-owned NFT
    it('015) cannot list auction if not owner of NFT', async function () {
      await expect(
        fantomauction
          .connect(other)
          .createAuction(
            mockerc721.address,
            THREE,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 305)
          )
      ).to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A13**:: Attempt to list an auction with an `_endTime` of `0`
    it('016) `createAuction()` `_endTimestamp` cannot be `0`', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            3,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            0
          )
      ).to.be.revertedWith(
        'end time must be greater than start (by 5 minutes)'
      );
    });

    // Test case **ID: A14**:: Attempt to list an auction with an `_endTime` of `1`
    it('017) `createAuction()` `_endTimestamp` cannot be `1`', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            3,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            1
          )
      ).to.be.revertedWith(
        'end time must be greater than start (by 5 minutes)'
      );
    });

    // Test case **ID: A15**:: Attempt to list an auction with an `_endTime` before the `_startTime`
    it('018) `_endTimestamp` cannot be less than `_startTimestamp`', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            3,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 300),
            false,
            new BigNumber.from(Number(await time.latest()) + 299)
          )
      ).to.be.revertedWith(
        'end time must be greater than start (by 5 minutes)'
      );
    });

    // Test case **ID: A16**:: Attempt to list an auction with a `_endTimestamp` less than 5 minutes (set hard limit)
    it('019) `_endTimestamp` must be greater than 5 minutes past `_startTimestamp`', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            3,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 304)
          )
      ).to.be.revertedWith(
        'end time must be greater than start (by 5 minutes)'
      );
    });

    // Test case **ID: A17**:: Attempt to cancel an auction that isn't owned by the auction contract
    it('020) cannot cancel an auction not owned by the auction contract', async function () {
      await expect(
        fantomauction.connect(seller).cancelAuction(mockerc721.address, 1)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A18**:: Attempt to cancel an auction that isn't owned by the `msg.sender`
    it('021) cannot cancel an auction you do not own', async function () {
      await expect(
        fantomauction.connect(other).cancelAuction(mockerc721.address, 4)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A19**:: Attempt to cancel an active auction with no bids that has not expired
    it('022) test auction cancelled successfully by user `seller`', async function () {
      await expect(
        fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)
      )
        .to.emit(fantomauction, 'AuctionCancelled')
        .withArgs(mockerc721.address, FOUR);
    });

    // Test case **ID: A20**:: Attempt to cancel an auction that was already cancelled
    it('023) cannot cancel an auction that has already been cancelled', async function () {
      await expect(
        fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A21**:: Cancelled auction NFT successfully transferred ownership back to `seller` from auction contract
    it('024) cancelled auction NFT successfully transferred ownership back to `seller`', async function () {
      const result = await mockerc721.connect(seller).ownerOf(FOUR);

      expect(result.toString()).to.equal(seller.address);
    });

    // Test case **ID: A22**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('025) successfully relisted auction for `seller` `_tokenId(4)` after cancelling', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 500)
          )
      )
        .to.emit(fantomauction, 'AuctionCreated')
        .withArgs(mockerc721.address, FOUR, mockerc20.address);
    });

    // Test case **ID: A23**:: Attempt to place a bid on the auction `seller` created before it starts
    it('026) cannot place a bid before auction starts', async function () {
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, 4, sellerReservePrice)
      ).to.be.revertedWith('bidding before auction started');
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 100 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 100);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 100 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 100);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A24**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('027) NFT successfully in escrow with auction contract after relisting by `seller`', async function () {
      const result = await mockerc721.connect(seller).ownerOf(FOUR);

      expect(result.toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A25**:: Attempt to place a bid of zero
    it('028) cannot place a bid of zero', async function () {
      await expect(
        fantomauction.connect(bidder).placeBid(mockerc721.address, FOUR, ZERO)
      ).to.be.revertedWith('failed to outbid highest bidder');
    });

    // Test case **ID: A26**:: Attempt to place a bid below `minBidIncrement`
    it('029) cannot place bids below `minBidIncrement`', async function () {
      const bidAttempt = new BigNumber.from('24000000000000000000');
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, FOUR, bidAttempt)
      ).to.be.revertedWith('failed to outbid highest bidder');
    });

    // Test case **ID: A27**:: Attempt to successfully place a bid
    it('030) bid successfully placed at `minBidIncrement`', async function () {
      const bidAttempt = new BigNumber.from('25000000000000000000');
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, FOUR, bidAttempt)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(mockerc721.address, FOUR, bidder.address, bidAttempt);
    });

    // Test case **ID: A**:: Ensure that bidders are properly transferred to auction contract
    it('031) `MockERC20` tokens properly transferred to auction contract', async function () {
      const amount = new BigNumber.from('1975000000000000000000');
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(owner).balanceOf(bidder.address)
      ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('032) auction contract has the correct amount of `MockERC20` tokens', async function () {
      const amount = new BigNumber.from('25000000000000000000');
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(owner).balanceOf(fantomauction.address)
      ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A28**:: Attempt to place a bid below `minBidIncrement` after another bid has been placed
    it('033) also cannot place bids below `minBidIncrement` after bid placed', async function () {
      const bidAttempt = new BigNumber.from('24000000000000000000');
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, FOUR, bidAttempt)
      ).to.be.revertedWith('failed to outbid highest bidder');
    });

    // Test case **ID: A29**:: Attempt to cancel an active auction that currently has a bid as `other`
    it('034) cannot cancel active auction that you dont own', async function () {
      // Cancel auction with `_tokenId` of `4` from `other`
      await expect(
        fantomauction.connect(other).cancelAuction(mockerc721.address, 4)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A30**:: Attempt to cancel an active auction that currently has a bid as `owner`
    it('035) auction contract cannot cancel an auction they dont own', async function () {
      // Cancel auction with `_tokenId` of `4` from `owner`
      await expect(
        fantomauction.connect(owner).cancelAuction(mockerc721.address, 4)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A31**:: Attempt to cancel an active auction that currently has a bid
    it('036) successfully cancelled auction that has bids below reserve price as `seller`', async function () {
      // Cancel auction with `_tokenId` of `4` from `seller`
      await expect(
        fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)
      )
        .to.emit(fantomauction, 'AuctionCancelled')
        .withArgs(mockerc721.address, FOUR);
    });

    // Test case **ID: A**:: Ensure that bidders are properly refunded
    it('037) `MockERC20` tokens properly refunded to bidder after cancelled auction', async function () {
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(bidder).balanceOf(bidder.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: A33**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('038) successfully relisted auction for `seller` `_tokenId(4)` after cancelling auction with bids', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 305)
          )
      )
        .to.emit(fantomauction, 'AuctionCreated')
        .withArgs(mockerc721.address, FOUR, mockerc20.address);
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 50 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 50);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 50 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 50);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A34**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('039) NFT successfully in escrow with auction contract after relisting by `seller`', async function () {
      const result = await mockerc721.connect(seller).ownerOf(4);

      expect(result.toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A35**:: Attempt to successfully place a bid
    it('040) bid successfully placed at `minBidIncrement` by `bidder`', async function () {
      const bidAttempt = new BigNumber.from('25000000000000000000');
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, FOUR, bidAttempt)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(mockerc721.address, FOUR, bidder.address, bidAttempt);
    });

    // Test case **ID: A6**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('041) auction contract has the correct amount of `MockERC20` tokens', async function () {
      const amount = new BigNumber.from('25000000000000000000');
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(owner).balanceOf(fantomauction.address)
      ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A37**:: Attempt to successfully outbid highest bidder
    it('042) previous bidder `bidder` successfully outbid by `other`', async function () {
      const bidAttempt = new BigNumber.from('50000000000000000000');
      await expect(
        fantomauction
          .connect(other)
          .placeBid(mockerc721.address, FOUR, bidAttempt)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(mockerc721.address, FOUR, other.address, bidAttempt);
    });

    // Test case **ID: A38**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('043) auction contract has the correct amount of `MockERC20` tokens', async function () {
      const amount = new BigNumber.from('50000000000000000000');
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(owner).balanceOf(fantomauction.address)
      ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A39**:: Attempt to successfully place a bid
    it('044) previous bidder `other` successfully outbid by `bidder`', async function () {
      const bidAttempt = new BigNumber.from('75000000000000000000');
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, FOUR, bidAttempt)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(mockerc721.address, FOUR, bidder.address, bidAttempt);
    });

    // Test case **ID: A40**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('045) auction contract has the correct amount of `MockERC20` tokens', async function () {
      const amount = new BigNumber.from('75000000000000000000');
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(owner).balanceOf(fantomauction.address)
      ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A41**:: Ensure that bidders are properly refunded after being outbid
    it('046) `MockERC20` tokens properly refunded to bidder after being outbid and placing new bid', async function () {
      const amount = new BigNumber.from('1925000000000000000000');
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(bidder).balanceOf(bidder.address)
      ).to.be.bignumber.equal(amount);
    });

    // Test case **ID: A42**:: Ensure that tokens are properly transferred after outbidding
    it('047) `MockERC20` tokens properly transferred back to `other` after `bidder` outbid `other`', async function () {
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(other).balanceOf(other.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    // Test case **ID: A43**:: Attempt to result an auction that hasn't ended yet as `seller`
    it('048) cannot result an auction that hasnt ended as `seller`', async function () {
      await expect(
        fantomauction.connect(seller).resultAuction(mockerc721.address, 4)
      ).to.be.revertedWith('auction not ended');
    });

    // Test case **ID: A44**:: Attempt to result an auction that hasn't ended yet as `other`
    it('049) cannot result an auction that hasnt ended as `other`', async function () {
      await expect(
        fantomauction.connect(other).resultAuction(mockerc721.address, 4)
      ).to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A45**:: Attempt to result a finished auction that ended with bids below the minimum reserve price
    it('050) cannot result a finished auction that ended with bids below the reserve price', async function () {
      await expect(
        fantomauction.connect(bidder).resultAuction(mockerc721.address, 4)
      ).to.be.revertedWith('highest bid is below reservePrice');
    });

    // Test case **ID: A46**:: Attempt to result a finished auction that ended with bids below the minimum reserve price as someone other than `seller` or `winner`
    it('051) cannot result a finished auction that ended with bids below the reserve price as non-owner', async function () {
      await expect(
        fantomauction.connect(hacker).resultAuction(mockerc721.address, 4)
      ).to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A47**:: Attempt to cancel an auction that ended  with bids below reserve price (with bids below reserve price)
    it('052) cannot cancel an auction that has ended with bids below reserve price as `bidder` or `winner` (must be arranged via resultFailedAuction())', async function () {
      await expect(
        fantomauction.connect(bidder).cancelAuction(mockerc721.address, 4)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A48**:: Attempt to cancel an auction that has ended with bids below reserve price
    it('053) successfully cancelled auction that ended with bids below reserve price as `seller`', async function () {
      await expect(
        fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)
      )
        .to.emit(fantomauction, 'AuctionCancelled')
        .withArgs(mockerc721.address, FOUR);
    });

    // Test case **ID: A49**:: Ensure the NFT has been properly transferred back to the `seller`
    it('054) cancelled auction NFT successfully transferred ownership back to `seller`', async function () {
      const result = await mockerc721.connect(seller).ownerOf(4);

      expect(result.toString()).to.equal(seller.address);
    });

    // Test case **ID: A50**:: Ensure the proper amount of MockERC20 tokens have been transferred back to the proper users after bidding, outbidding, cancelling, and refunding
    it('055) all users and auction contract have the correct amount of MockERC20 tokens', async function () {
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(owner).balanceOf(owner.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(bidder.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(seller.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(winner.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(other.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(hacker.address)
      ).to.be.bignumber.equal(ZERO);
      expect(
        await mockerc20.connect(owner).balanceOf(fantomauction.address)
      ).to.be.bignumber.equal(ZERO);
    });

    // Test case **ID: A51**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `4` and check for event
    it('056) successfully relisted auction for `seller` `_tokenId(4)` after cancelling ended auction with bids', async function () {
      time.advanceBlock();
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 305)
          )
      )
        .to.emit(fantomauction, 'AuctionCreated')
        .withArgs(mockerc721.address, FOUR, mockerc20.address);
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 50 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 50);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 50 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 50);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A52**:: Check to ensure auction contract now owns (escrow) the NFT auction `seller` relisted
    it('057) `_tokenId(4)` successfully in escrow with auction contract after relisting by `seller`', async function () {
      const result = await mockerc721.connect(seller).ownerOf(4);

      expect(result.toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A53**:: Attempt to successfully place a bid at the `bidderBidAmountMinimum` by `bidder`
    it('058) bid successfully placed at `bidderBidAmountMinimum` by `bidder`', async function () {
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, FOUR, bidderBidAmountMinimum)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(
          mockerc721.address,
          FOUR,
          bidder.address,
          bidderBidAmountMinimum
        );
    });

    // Test case **ID: A54**:: Attempt to successfully place a bid at the reserve price by `winner`
    it('059) bid successfully placed at `sellerReservePrice` by `winner`', async function () {
      await expect(
        fantomauction
          .connect(winner)
          .placeBid(mockerc721.address, FOUR, sellerReservePrice)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(mockerc721.address, FOUR, winner.address, sellerReservePrice);
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A56**:: Attempt to place a bid on the auction `seller` created after it ended
    it('061) cannot place a bid after auction has ended', async function () {
      await expect(
        fantomauction
          .connect(other)
          .placeBid(mockerc721.address, 4, sellerReservePrice)
      ).to.be.revertedWith('bidding outside auction window');
    });

    // Test case **ID: A57**:: Attempt to cancel an auction that has ended with a bid >= reserve price as `seller`
    it('062) cannot cancel an auction that has ended with bids >= reserve price as `seller`', async function () {
      await expect(
        fantomauction.connect(seller).cancelAuction(mockerc721.address, 4)
      ).to.be.revertedWith('Highest bid is currently above reserve price');
    });

    // Test case **ID: A58**:: Attempt to cancel an auction that has ended with a bid >= reserve price as `other`
    it('063) cannot cancel an auction that has ended with bids >= reserve price as `other`', async function () {
      await expect(
        fantomauction.connect(other).cancelAuction(mockerc721.address, 4)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A59**:: Attempt to cancel an auction that has ended with a bid >= reserve price `winner`
    it('064) cannot cancel an auction that has ended with bids >= reserve price as `winner`', async function () {
      await expect(
        fantomauction.connect(winner).cancelAuction(mockerc721.address, 4)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A60**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `seller`
    it('065) cannot resultFailedAuction() an auction that has met reserve price as `seller`', async function () {
      await expect(
        fantomauction.connect(seller).resultFailedAuction(mockerc721.address, 4)
      ).to.be.revertedWith('highest bid is >= reservePrice');
    });

    // Test case **ID: A61**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `winner`
    it('066) cannot resultFailedAuction() an auction that has met reserve price as `winner`', async function () {
      await expect(
        fantomauction.connect(winner).resultFailedAuction(mockerc721.address, 4)
      ).to.be.revertedWith('highest bid is >= reservePrice');
    });

    // Test case **ID: A62**:: Attempt to call resultFailedAuction on an auction that met the reserve price as `other`
    it('067) cannot resultFailedAuction() an auction that has met reserve price as `other`', async function () {
      await expect(
        fantomauction.connect(other).resultFailedAuction(mockerc721.address, 4)
      ).to.be.revertedWith('_msgSender() must be auction topBidder or seller');
    });

    // Test case **ID: A63**:: Attempt to relist an auction that has ended with bids >= reserve price as `seller`
    it('068) cannot relist an un-resulted auction that has successfully ended as `seller`', async function () {
      // Advance block once to get current block.timestamp
      time.advanceBlock();
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            Number(await time.latest()) + 5,
            false,
            Number(await time.latest()) + 305
          )
      ).to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A64**:: Attempt to relist an auction that has ended with bids >= reserve price as `other`
    it('069) cannot relist an un-resulted auction that has successfully ended as `other`', async function () {
      // Advance block once to get current block.timestamp
      time.advanceBlock();
      await expect(
        fantomauction
          .connect(other)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            Number(await time.latest()) + 5,
            false,
            Number(await time.latest()) + 305
          )
      ).to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A65**:: Attempt to result an auction that ended successfully by user `other`
    it('070) cannot result a successful auction as `other`', async function () {
      // Advance block once to get current block.timestamp
      time.advanceBlock();
      await expect(
        fantomauction.connect(other).resultAuction(mockerc721.address, FOUR)
      ).to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A66**:: Attempt to result a successful auction as the auction `seller`
    it('071) test auction `_tokenId(4)` successfully resulted by `seller`', async function () {
      // Advance block once to get current block.timestamp
      time.advanceBlock();
      await expect(
        fantomauction.connect(seller).resultAuction(mockerc721.address, FOUR)
      )
        .to.emit(fantomauction, 'AuctionResulted')
        .withArgs(
          seller.address,
          mockerc721.address,
          FOUR,
          winner.address,
          mockerc20.address,
          ZERO,
          sellerReservePrice
        );
    });

    // Test case **ID: A67**:: Attempt to result an auction that ended successfully by user `seller`
    it('072) cannot result an auction that has already been resulted as `seller`', async function () {
      time.advanceBlock();
      await expect(
        fantomauction.connect(seller).resultAuction(mockerc721.address, FOUR)
      ).to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A68**:: Attempt to result an auction that ended successfully by user `other`
    it('073) cannot result an auction that has already been resulted as `other`', async function () {
      await expect(
        fantomauction.connect(other).resultAuction(mockerc721.address, FOUR)
      ).to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A69**:: Attempt to result an auction that ended successfully by user `winner`
    it('074) cannot result an auction that has already been resulted as `winner`', async function () {
      await expect(
        fantomauction.connect(winner).resultAuction(mockerc721.address, FOUR)
      ).to.be.revertedWith('_msgSender() must be auction winner or seller');
    });

    // Test case **ID: A70**:: Attempt to list relist an auction that `seller` has already sold and resulted
    it('075) `seller` cannot relist an auction they sold and resulted already', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            Number(await time.latest()) + 5,
            false,
            Number(await time.latest()) + 305
          )
      ).to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A71**:: Attempt to list relist an auction that `other` has already sold and resulted
    it('076) `other` cannot relist a sold and resulted auction they didnt win', async function () {
      await expect(
        fantomauction
          .connect(other)
          .createAuction(
            mockerc721.address,
            FOUR,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 305)
          )
      ).to.be.revertedWith('not owner and or contract not approved');
    });

    // Test case **ID: A72**:: Attempt to cancel an auction that has ended successfully and has been resulted as user `seller`
    it('077) cannot cancel an auction that has ended successfully and has been resulted as `seller`', async function () {
      await expect(
        fantomauction.connect(seller).cancelAuction(mockerc721.address, FOUR)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A73**:: Attempt to cancel an auction that has ended successfully and has been resulted as user `other`
    it('078) cannot cancel an auction that has ended successfully and has been resulted as `other`', async function () {
      await expect(
        fantomauction.connect(other).cancelAuction(mockerc721.address, FOUR)
      ).to.be.revertedWith('sender must be owner');
    });

    // Test case **ID: A74**:: Ensure the proper amount of MockERC20 tokens have been transferred to users accordingly after a successful auction
    it('079) all users and auction contract have the correct amount of MockERC20 tokens after a successful auction', async function () {
      const newBalanceSeller = new BigNumber.from('2100000000000000000000');
      const newBalanceWinner = new BigNumber.from('1900000000000000000000');
      // Test if the ERC20 pay tokens reflect properly
      expect(
        await mockerc20.connect(owner).balanceOf(owner.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(bidder.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(seller.address)
      ).to.be.bignumber.equal(newBalanceSeller);
      expect(
        await mockerc20.connect(owner).balanceOf(winner.address)
      ).to.be.bignumber.equal(newBalanceWinner);
      expect(
        await mockerc20.connect(owner).balanceOf(other.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(hacker.address)
      ).to.be.bignumber.equal(ZERO);
      expect(
        await mockerc20.connect(owner).balanceOf(fantomauction.address)
      ).to.be.bignumber.equal(ZERO);
    });

    // Test case **ID: A75**:: Create a test auction using `MockERC20` as the `payToken`, `MockERC721` as the `_nftAddress`, using `_tokenId` `3` and check for event
    it('080) successfully listed auction for `seller` `_tokenId(3)`', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            FIVE,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 5),
            false,
            new BigNumber.from(Number(await time.latest()) + 305)
          )
      )
        .to.emit(fantomauction, 'AuctionCreated')
        .withArgs(mockerc721.address, FIVE, mockerc20.address);
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 50 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 50);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 50 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 50);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A76**:: Check to ensure auction contract now owns (escrow) `_tokenId(3)` auction `seller` relisted
    it('081) `_tokenId(3)` successfully in escrow with auction contract after relisting by `seller`', async function () {
      const result = await mockerc721.connect(seller).ownerOf(FIVE);

      expect(result.toString()).to.equal(fantomauction.address);
    });

    // Test case **ID: A77**:: Attempt to successfully place a bid at the `bidderBidAmountMinimum` by `bidder`
    it('082) bid successfully placed at `bidderBidAmountMinimum` by `bidder`', async function () {
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, FIVE, bidderBidAmountMinimum)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(
          mockerc721.address,
          FIVE,
          bidder.address,
          bidderBidAmountMinimum
        );
    });

    // Test case **ID: A78**:: Attempt to successfully place a bid at the reserve price by `winner`
    it('083) bid successfully placed at `sellerReservePrice` by `winner`', async function () {
      await expect(
        fantomauction
          .connect(winner)
          .placeBid(mockerc721.address, FIVE, sellerReservePrice)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(mockerc721.address, FIVE, winner.address, sellerReservePrice);
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A79**:: Ensure that auction contract now owns the proper amount of MockERC20 tokens
    it('084) auction contract has the correct amount of `MockERC20` tokens', async function () {
      // Test if the ERC20 pay tokens were refunded properly
      expect(
        await mockerc20.connect(owner).balanceOf(fantomauction.address)
      ).to.be.bignumber.equal(sellerReservePrice);
    });

    // Test case **ID: A80**:: Attempt to result a successful auction as the auction `winner`
    it('085) test auction `_tokenId(3)` successfully resulted by `winner`', async function () {
      await expect(
        fantomauction.connect(seller).resultAuction(mockerc721.address, FIVE)
      )
        .to.emit(fantomauction, 'AuctionResulted')
        .withArgs(
          seller.address,
          mockerc721.address,
          FIVE,
          winner.address,
          mockerc20.address,
          ZERO,
          sellerReservePrice
        );
    });

    // Test case **ID: A81**:: Check to ensure auction transferred `_tokenId(3)` to `winner` after winning auction and resulting
    it('086) `_tokenId(3)` successfully transferred from auction contract (escrow) to `winner` after resulting', async function () {
      const result = await mockerc721.connect(winner).ownerOf(FIVE);

      expect(result.toString()).to.equal(winner.address);
    });

    // Test case **ID: A82**:: Check to ensure auction transferred `_tokenId(4)` to `winner` after winning auction and resulting
    it('087) `_tokenId(4)` successfully transferred from auction contract (escrow) to `winner` after resulting', async function () {
      const result = await mockerc721.connect(winner).ownerOf(FOUR);

      expect(result.toString()).to.equal(winner.address);
    });

    // Test case **ID: A83**:: Ensure the proper amount of MockERC20 tokens have been transferred to users accordingly after a successful auction
    it('088) all users and auction contract have the correct amount of MockERC20 tokens after (2) successful auctions', async function () {
      const newBalanceSeller = new BigNumber.from('2200000000000000000000');
      const newBalanceWinner = new BigNumber.from('1800000000000000000000');
      // Test if the ERC20 pay tokens reflect properly
      expect(
        await mockerc20.connect(owner).balanceOf(owner.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(bidder.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(seller.address)
      ).to.be.bignumber.equal(newBalanceSeller);
      expect(
        await mockerc20.connect(owner).balanceOf(winner.address)
      ).to.be.bignumber.equal(newBalanceWinner);
      expect(
        await mockerc20.connect(owner).balanceOf(other.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
      expect(
        await mockerc20.connect(owner).balanceOf(hacker.address)
      ).to.be.bignumber.equal(ZERO);
      expect(
        await mockerc20.connect(owner).balanceOf(fantomauction.address)
      ).to.be.bignumber.equal(ZERO);
    });

    // Test case **ID: A84**::
    it('089) successfully listed auction for `seller` `_tokenId(2)`', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .createAuction(
            mockerc721.address,
            TWO,
            mockerc20.address,
            sellerReservePrice,
            new BigNumber.from(Number(await time.latest()) + 1),
            false,
            new BigNumber.from(Number(await time.latest()) + 604800)
          )
      )
        .to.emit(fantomauction, 'AuctionCreated')
        .withArgs(mockerc721.address, TWO, mockerc20.address);
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A**:: Attempt to successfully place a bid at the `bidderBidAmountMinimum` by `bidder`
    it('090) bid successfully placed at `bidderBidAmountMinimum` by `bidder`', async function () {
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, TWO, bidderBidAmountMinimum)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(
          mockerc721.address,
          TWO,
          bidder.address,
          bidderBidAmountMinimum
        );
    });

    // Test case **ID: A**::
    it('091) cannot withdraw a bid if youre not the current highest bidder', async function () {
      await expect(
        fantomauction.connect(hacker).withdrawBid(mockerc721.address, TWO)
      ).to.be.revertedWith('you are not the highest bidder');
    });

    // Test case **ID: A**::
    it('092) `bidder` cannot withdraw a bid before end of the auction even when bid is below reserve price', async function () {
      await expect(
        fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)
      )
        .to.be.revertedWith(
        'can withdraw only after 12 hours (after auction ended)'
      );
    });

    // Test case **ID: A**::
    it('093) cannot withdraw a bid if youre not the current highest bidder', async function () {
      await expect(
        fantomauction
          .connect(hacker)
          .updateAuctionReservePrice(
            mockerc721.address,
            TWO,
            sellerNewReservePrice
          )
      ).to.be.revertedWith(
        'Sender must be item owner and NFT must be in escrow'
      );
    });

    // Test case **ID: A**::
    it('094) `seller` cannot raise the auction reserve price', async function () {
      const greaterReservePrice = new BigNumber.from('101000000000000000000'); // 101 FTM
      await expect(
        fantomauction
          .connect(seller)
          .updateAuctionReservePrice(
            mockerc721.address,
            TWO,
            greaterReservePrice
          )
      ).to.be.revertedWith('Reserve price can only be decreased');
    });

    // Test case **ID: A**::
    it('095) `seller` successfully lowered reserve price to `sellerNewReservePrice`', async function () {
      await expect(
        fantomauction
          .connect(seller)
          .updateAuctionReservePrice(
            mockerc721.address,
            TWO,
            sellerNewReservePrice
          )
      )
        .to.emit(fantomauction, 'UpdateAuctionReservePrice')
        .withArgs(
          mockerc721.address,
          TWO,
          mockerc20.address,
          sellerNewReservePrice
        );
    });

    // Test case **ID: A**:: Attempt to successfully place a bid at the `bidderBidAmountMinimum` by `bidder`
    it('096) bid successfully placed at `sellerNewReservePrice` by `bidder`', async function () {
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, TWO, sellerNewReservePrice)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(
          mockerc721.address,
          TWO,
          bidder.address,
          sellerNewReservePrice
        );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 604250 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 604250);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A**::
    it('097) `bidder` cannot withdraw a bid immediately before auction ends', async function () {
      await expect(
        fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)
      ).to.be.revertedWith(
        'can withdraw only after 12 hours (after auction ended)'
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 43000 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 43000);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A**::
    it('098) `bidder` cannot withdraw a bid immediately before grace window', async function () {
      await expect(
        fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)
      ).to.be.revertedWith(
        'can withdraw only after 12 hours (after auction ended)'
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 500 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 500);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    // Test case **ID: A**::
    it('099 `bidder` successfully withdrew bid once grace window started', async function () {
      await expect(
        fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)
      )
        .to.emit(fantomauction, 'BidWithdrawn')
        .withArgs(
          mockerc721.address,
          TWO,
          bidder.address,
          sellerNewReservePrice
        );
    });

    // Test case **ID: A**:: Attempt to result an auction as `seller`
    it('100) cannot result an auction that ended and had the highest bidder withdraw', async function () {
      await expect(
        fantomauction.connect(seller).resultAuction(mockerc721.address, TWO)
      ).to.be.revertedWith('no open bids');
    });

    // Test case **ID: A**::
    it('101) successfully cancelled auction that ended successfully but had the bidder withdraw', async function () {
      await expect(
        fantomauction.connect(seller).cancelAuction(mockerc721.address, TWO)
      )
        .to.emit(fantomauction, 'AuctionCancelled')
        .withArgs(mockerc721.address, TWO);
    });

    // Test case **ID: A**::
    it('102) NFT successfully transferred back to seller', async function () {
      const result = await mockerc721.connect(seller).ownerOf(TWO);

      expect(result.toString()).to.equal(seller.address);
    });
  });
});
