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
  THREE,
  FOUR,
  mockPayTokenName,
  mockPayTokenSymbol,
  mockNFTokenName,
  mockNFTokenSymbol,
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
  });

  // The `afterEach()` function will run after each test and is used to keep track of
  // block time as the test moves time around to account for time-constrained functionality.
  afterEach(async function () {
    const timeNow = new BigNumber.from(Number(await time.latest()));
    fantomauction.connect(owner).hardhatTimestamp(timeNow);
  });

  describe('Testing `createAuction()` individually', function () {
    it('1) test auction created successfully for user `seller`', async function () {
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

    it('2) NFT successfully in escrow with auction contract', async function () {
      const result = await mockerc721.connect(seller).ownerOf(FOUR);

      expect(result.toString()).to.equal(fantomauction.address);
    });

    it('3) created auction `seller` is `_owner`', async function () {
      const result = await fantomauction
        .connect(seller)
        .getAuction(mockerc721.address, FOUR);
      const { 0: _owner } = result;
      expect(_owner.toString()).to.equal(seller.address);
    });

    it('4) created auction `_payToken` is `MockERC20`', async function () {
      const result = await fantomauction
        .connect(owner)
        .getAuction(mockerc721.address, FOUR);
      const { 1: _payToken } = result;
      expect(_payToken.toString()).to.equal(mockerc20.address);
    });

    it('5) created auction `_reservePrice` is `sellerReservePrice`', async function () {
      const result = await fantomauction
        .connect(owner)
        .getAuction(mockerc721.address, FOUR);
      const { 2: _reservePrice } = result;
      expect(_reservePrice.toString()).to.equal(sellerReservePrice.toString());
    });

    it('6) created auction `_resulted` is `false`', async function () {
      const result = await fantomauction
        .connect(owner)
        .getAuction(mockerc721.address, FOUR);
      const { 5: _resulted } = result;
      assert.isFalse(_resulted);
    });

    it('7) created auction `_minBid` is `0`', async function () {
      const result = await fantomauction
        .connect(owner)
        .getAuction(mockerc721.address, FOUR);
      const { 6: _minBid } = result;
      expect(_minBid.toString()).to.equal('0');
    });

    it('8) `seller` cannot relist the same NFT while active auction exists', async function () {
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

    it('9) cannot list auction if not owner of NFT', async function () {
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

    it('10) `createAuction()` `_endTimestamp` cannot be `0`', async function () {
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

    it('11) `createAuction()` `_endTimestamp` cannot be `1`', async function () {
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

    it('12) `_endTimestamp` cannot be less than `_startTimestamp`', async function () {
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

    it('13) `_endTimestamp` must be greater than 5 minutes past `_startTimestamp`', async function () {
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
  });
});
