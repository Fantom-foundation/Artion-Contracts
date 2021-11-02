const hre = require('hardhat');
const {
  expectRevert,
  expectEvent,
  time,
  BN
} = require('@openzeppelin/test-helpers');

const { solidity } = require('ethereum-waffle');
const { expect } = require('chai').use(solidity);
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');
const FantomAuction = artifacts.require('FantomAuction');
const FantomArtion = artifacts.require('Artion');
const FantomMarketplace = artifacts.require('FantomMarketplace');
const FantomBundleMarketplace = artifacts.require('FantomBundleMarketplace');
const FantomAddressRegistry = artifacts.require('FantomAddressRegistry');
const FantomTokenRegistry = artifacts.require('FantomTokenRegistry');

const {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  mockPayTokenName,
  mockPayTokenSymbol,
  mockPayTokenMintAmount,
  mockNFTokenName,
  mockNFTokenSymbol
} = require('../utils/index.js');

const { sellerReservePrice } = require('../utils/auction.js');

contract('FantomAuction', function ([owner, seller, other]) {
  let mockERC20;
  let mockERC721;

  let fantomAuction;
  let fantomArtion;
  let fantomMarketplace;
  let fantomBundleMarketplace;
  let fantomAddressRegistry;
  let fantomTokenRegistry;

  before(async function () {
    mockERC20 = await MockERC20.new(mockPayTokenName, mockPayTokenSymbol, ZERO);
    mockERC721 = await MockERC721.new(mockNFTokenName, mockNFTokenSymbol);

    fantomAuction = await FantomAuction.new();
    fantomArtion = await FantomArtion.new(owner, ONE);
    fantomMarketplace = await FantomMarketplace.new();
    fantomBundleMarketplace = await FantomBundleMarketplace.new();
    fantomAddressRegistry = await FantomAddressRegistry.new();
    fantomTokenRegistry = await FantomTokenRegistry.new();

    await mockERC20.mintPay(owner, mockPayTokenMintAmount, {
      from: owner
    });
    await mockERC20.mintPay(seller, mockPayTokenMintAmount, {
      from: owner
    });
    await mockERC20.mintPay(other, mockPayTokenMintAmount, {
      from: owner
    });

    await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
      from: owner
    });
    await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
      from: seller
    });
    await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
      from: other
    });

    // 0 - Owner
    await mockERC721.mint(owner, { from: owner });

    // 1, 2 - Seller
    await mockERC721.mint(seller, { from: owner });
    await mockERC721.mint(seller, { from: owner });

    // 3, 4, 5 - Other
    await mockERC721.mint(other, { from: owner });
    await mockERC721.mint(other, { from: owner });
    await mockERC721.mint(other, { from: owner });

    await mockERC721.setApprovalForAll(fantomAuction.address, true, {
      from: owner
    });

    await mockERC721.setApprovalForAll(fantomAuction.address, true, {
      from: seller
    });

    await mockERC721.setApprovalForAll(fantomAuction.address, true, {
      from: other
    });
  });

  it('`owner` returns the initialized owner', async function () {
    // Call `initialize()`  and store owner address
    await fantomAuction.initialize(owner, { from: owner });

    // Test if the owner is properly reflected upon calling `initialize()`
    expect((await fantomAuction.owner({ from: owner })).toString()).to.equal(
      owner
    );
  });

  it('should not pause auction contract if not `owner`', async function () {
    // Test if non-owners can pause the auction contract upon calling `toggleIsPaused()`

    await expectRevert(
      fantomAuction.toggleIsPaused({ from: other }),
      'Ownable: caller is not the owner'
    );
  });

  describe('Update addresses', function () {
    // Setting addresses for FantomAddressRegistry
    it('should set `FantomAddressRegistry` to `FantomArtion`', async function () {
      await fantomAddressRegistry.updateArtion(fantomArtion.address, {
        from: owner
      });
      expect((await fantomAddressRegistry.artion()).toString()).to.equal(
        fantomArtion.address
      );
    });

    it('should set `FantomAddressRegistry` to `FantomAuction`', async function () {
      await fantomAddressRegistry.updateAuction(fantomAuction.address, {
        from: owner
      });
      expect((await fantomAddressRegistry.auction()).toString()).to.equal(
        fantomAuction.address
      );
    });

    it('should set `FantomAddressRegistry` to `FantomMarketplace`', async function () {
      await fantomAddressRegistry.updateMarketplace(fantomMarketplace.address, {
        from: owner
      });
      expect((await fantomAddressRegistry.marketplace()).toString()).to.equal(
        fantomMarketplace.address
      );
    });

    it('should set `FantomAddressRegistry` to `FantomBundleMarketplace`', async function () {
      await fantomAddressRegistry.updateBundleMarketplace(
        fantomBundleMarketplace.address,
        { from: owner }
      );
      expect(
        (await fantomAddressRegistry.bundleMarketplace()).toString()
      ).to.equal(fantomBundleMarketplace.address);
    });

    it('should set `FantomAddressRegistry` to `FantomTokenRegistry`', async function () {
      await fantomAddressRegistry.updateTokenRegistry(
        fantomTokenRegistry.address,
        { from: owner }
      );
      expect((await fantomAddressRegistry.tokenRegistry()).toString()).to.equal(
        fantomTokenRegistry.address
      );
    });

    it('should add `MockERC20` token to `FantomTokenRegistry', async function () {
      const _createTokenAddedEvent = await fantomTokenRegistry.add(
        mockERC20.address,
        { from: owner }
      );

      expectEvent(_createTokenAddedEvent, 'TokenAdded', {
        0: mockERC20.address
      });
    });

    it('should update `FantomAuction` address registry to `FantomAddressRegistry`', async function () {
      await fantomAuction.updateAddressRegistry(fantomAddressRegistry.address, {
        from: owner
      });
      expect(
        (await fantomAuction.addressRegistry({ from: owner })).toString()
      ).to.equal(fantomAddressRegistry.address);
    });
  });

  describe('Create Auction', function () {
    it('should create auction for a user', async function () {
      const _createdAuctionEvent = await fantomAuction.createAuction(
        mockERC721.address,
        ONE,
        mockERC20.address,
        sellerReservePrice,
        new BN(Number(await time.latest()) + 5),
        false,
        new BN(Number(await time.latest()) + 305),
        { from: seller }
      );

      expectEvent(_createdAuctionEvent, 'AuctionCreated', {
        0: mockERC721.address,
        1: ONE,
        2: mockERC20.address
      });
    });

    it('should confirm that NFT is in escrow with auction contract', async function () {
      const result = await mockERC721.ownerOf(ONE, { from: seller });

      expect(result.toString()).to.equal(fantomAuction.address);
    });

    it('should confirm that auction `seller` is `_owner`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomAuction.getAuction(mockERC721.address, ONE, {
        from: seller
      });
      // Assign the result's (return)
      const { 0: _owner } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_owner.toString()).to.equal(seller); // Expect created auction `_owner` to be `seller`
    });

    it('created auction `_payToken` is `MockERC20`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomAuction.getAuction(mockERC721.address, ONE, {
        from: owner
      });
      // Assign the result's (return)
      const { 1: _payToken } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_payToken.toString()).to.equal(mockERC20.address); // Expect created auction `_payToken` to be `MockERC20` (_payToken input)
    });

    it('created auction `_reservePrice` is `sellerReservePrice`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomAuction.getAuction(mockERC721.address, ONE, {
        from: owner
      });
      // Assign the result's (return)
      const { 2: _reservePrice } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_reservePrice.toString()).to.equal(sellerReservePrice.toString()); // Expect created auction `_reservePrice` to be `sellerReservePrice`
    });

    it('created auction `_resulted` is `false`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomAuction.getAuction(mockERC721.address, ONE, {
        from: owner
      });
      // Assign the result's (return)
      const { 5: _resulted } = result;

      // Test the `createAuction` data calling `getAuction`
      assert.isFalse(_resulted); // Expect created auction `_resulted` to be `false`
    });

    it('created auction `_minBid` is `0`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomAuction.getAuction(mockERC721.address, ONE, {
        from: owner
      });
      // Assign the result's (return)
      const { 6: _minBid } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_minBid.toString()).to.equal('0'); // Expect created auction `_minBid` to be `0`
    });

    it('should create auction [with minimum bid] for a user', async function () {
      const _createdAuctionEvent = await fantomAuction.createAuction(
        mockERC721.address,
        THREE,
        mockERC20.address,
        sellerReservePrice,
        new BN(Number(await time.latest()) + 5),
        true,
        new BN(Number(await time.latest()) + 305),
        { from: other }
      );

      expectEvent(_createdAuctionEvent, 'AuctionCreated', {
        0: mockERC721.address,
        1: THREE,
        2: mockERC20.address
      });
    });

    it('created auction [with minimum bid] `_minBid` is `reservePrice`', async function () {
      // Get result of the created auction with `getAuction()`
      const result = await fantomAuction.getAuction(mockERC721.address, THREE, {
        from: owner
      });
      // Assign the result's (return)
      const { 6: _minBid } = result;

      // Test the `createAuction` data calling `getAuction`
      expect(_minBid.toString()).to.equal('100000000000000000000'); // Expect created auction `_minBid` to be `0`
    });

    it('should not allow `seller` to relist the same NFT while active auction exists', async function () {
      await expect(
        fantomAuction.createAuction(
          mockERC721.address,
          ONE,
          mockERC20.address,
          sellerReservePrice,
          new BigNumber.from(Number(await time.latest()) + 5),
          false,
          new BigNumber.from(Number(await time.latest()) + 305),
          { from: seller }
        )
      ).to.be.revertedWith('not owner and or contract not approved');
    });

    it('should not allow creation of auction if not owner of NFT', async function () {
      await expect(
        fantomAuction.createAuction(
          mockERC721.address,
          TWO,
          mockERC20.address,
          sellerReservePrice,
          new BigNumber.from(Number(await time.latest()) + 5),
          false,
          new BigNumber.from(Number(await time.latest()) + 305),
          { from: other }
        )
      ).to.be.revertedWith('not owner and or contract not approved');
    });

    it('`createAuction()` `_endTimestamp` cannot be `0`', async function () {
      await expect(
        fantomAuction.createAuction(
          mockERC721.address,
          TWO,
          mockERC20.address,
          sellerReservePrice,
          new BigNumber.from(Number(await time.latest()) + 5),
          false,
          0,
          { from: seller }
        )
      ).to.be.revertedWith(
        'end time must be greater than start (by 5 minutes)'
      );
    });

    it('`createAuction()` `_endTimestamp` cannot be `1`', async function () {
      await expect(
        fantomAuction.createAuction(
          mockERC721.address,
          TWO,
          mockERC20.address,
          sellerReservePrice,
          new BigNumber.from(Number(await time.latest()) + 5),
          false,
          1,
          { from: seller }
        )
      ).to.be.revertedWith(
        'end time must be greater than start (by 5 minutes)'
      );
    });

    it('`_endTimestamp` cannot be less than `_startTimestamp`', async function () {
      await expect(
        fantomAuction.createAuction(
          mockERC721.address,
          TWO,
          mockERC20.address,
          sellerReservePrice,
          new BigNumber.from(Number(await time.latest()) + 300),
          false,
          new BigNumber.from(Number(await time.latest()) + 299),
          { from: seller }
        )
      ).to.be.revertedWith(
        'end time must be greater than start (by 5 minutes)'
      );
    });

    it('`_endTimestamp` must be greater than 5 minutes past `_startTimestamp`', async function () {
      await expect(
        fantomAuction.createAuction(
          mockERC721.address,
          TWO,
          mockERC20.address,
          sellerReservePrice,
          new BigNumber.from(Number(await time.latest()) + 5),
          false,
          new BigNumber.from(Number(await time.latest()) + 304),
          { from: seller }
        )
      ).to.be.revertedWith(
        'end time must be greater than start (by 5 minutes)'
      );
    });

    it('should not cancel an auction owned by the auction contract', async function () {
      await expect(
        fantomAuction.cancelAuction(mockERC721.address, TWO, { from: seller })
      ).to.be.revertedWith('sender must be owner');
    });

    it('should not cancel an auction if not an owner', async function () {
      await expect(
        fantomAuction.cancelAuction(mockERC721.address, FOUR, { from: other })
      ).to.be.revertedWith('sender must be owner');
    });

    it('should allow cancellation of auction by owner', async function () {
      const _auctionCancelledEvent = await fantomAuction.cancelAuction(
        mockERC721.address,
        ONE,
        { from: seller }
      );

      expectEvent(_auctionCancelledEvent, 'AuctionCancelled', {
        0: mockERC721.address,
        1: ONE
      });
    });

    it('should not cancel an auction that has already been cancelled', async function () {
      await expect(
        fantomAuction.cancelAuction(mockERC721.address, ONE, {
          from: seller
        })
      ).to.be.revertedWith('sender must be owner');
    });

    it('should transfer NFT ownership of cancelled auction back to `owner`', async function () {
      const result = await mockERC721.ownerOf(ONE);

      expect(result.toString()).to.equal(seller);
    });

    it('should allow relisting of auction for owner after cancelling', async function () {
      const _createdAuctionEvent = await fantomAuction.createAuction(
        mockERC721.address,
        ONE,
        mockERC20.address,
        sellerReservePrice,
        new BigNumber.from(Number(await time.latest()) + 5),
        false,
        new BigNumber.from(Number(await time.latest()) + 500),
        { from: seller }
      );

      expectEvent(_createdAuctionEvent, 'AuctionCreated', {
        0: mockERC721.address,
        1: ONE,
        2: mockERC20.address
      });
    });
  });
});
