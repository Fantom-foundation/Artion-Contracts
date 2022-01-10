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
  mockPayTokenName,
  mockPayTokenSymbol,
  mockNFTokenName,
  mockNFTokenSymbol,
  sellerReservePrice,
  sellerNewReservePrice,
  bidderBidAmountMinimum
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
    MockPriceOracleProxy = await ethers.getContractFactory(
      'MockPriceOracleProxy'
    );

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
    mockPriceOracleProxy = await MockPriceOracleProxy.deploy();
    await mockPriceOracleProxy.deployed();

    // Call function `callBefore()` in `./utils/before.js` to establish testing environment
    await callBefore();

    // Create initial test auction for the `cancelAuction()` test
    await fantomauction
      .connect(seller)
      .createAuction(
        mockerc721.address,
        TWO,
        mockerc20.address,
        sellerReservePrice,
        new BigNumber.from(Number(await time.latest()) + 1),
        false,
        new BigNumber.from(Number(await time.latest()) + 604800)
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
    it('blockchain time increased 10 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 10);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    it('bid successfully placed at `sellerReservePrice` by `bidder`', async function () {
      await expect(
        fantomauction
          .connect(bidder)
          .placeBid(mockerc721.address, TWO, sellerReservePrice)
      )
        .to.emit(fantomauction, 'BidPlaced')
        .withArgs(mockerc721.address, TWO, bidder.address, sellerReservePrice);
    });

    it('1) cannot withdraw a bid if youre not the current highest bidder', async function () {
      await expect(
        fantomauction.connect(hacker).withdrawBid(mockerc721.address, TWO)
      ).to.be.revertedWith('you are not the highest bidder');
    });

    it('2) `bidder` cannot withdraw a bid before auction ends', async function () {
      await expect(
        fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)
      ).to.be.revertedWith(
        'can withdraw only after 12 hours (after auction ended)'
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 604250 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 604750);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    it('3) `bidder` cannot withdraw a bid immediately before auction ends', async function () {
      await expect(
        fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)
      ).to.be.revertedWith(
        'can withdraw only after 12 hours (after auction ended)'
      );
    });

    // Increase blockchain time with a test expect (hardhat workaround)
    it('blockchain time increased 43200 seconds', async function () {
      time.advanceBlock();
      time.increaseTo(Number(await time.latest()) + 43200);
      time.advanceBlock();
      expect((await fantomauction.connect(owner).owner()).toString()).to.equal(
        owner.address
      );
    });

    it('4) `bidder` cannot withdraw a bid immediately before grace window', async function () {
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

    it('5) `bidder` successfully withdrew bid once grace window started', async function () {
      await expect(
        fantomauction.connect(bidder).withdrawBid(mockerc721.address, TWO)
      )
        .to.emit(fantomauction, 'BidWithdrawn')
        .withArgs(mockerc721.address, TWO, bidder.address, sellerReservePrice);
    });
  });
});
