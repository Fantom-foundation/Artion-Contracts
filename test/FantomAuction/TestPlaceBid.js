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

const {
  sellerReservePrice,
  bidderBidAmountMinimum
} = require('../utils/auction.js');

contract(
  'FantomAuction',
  function ([owner, seller, bidder, winner, hacker, other]) {
    let mockERC20;
    let mockERC721;

    let fantomAuction;
    let fantomArtion;
    let fantomMarketplace;
    let fantomBundleMarketplace;
    let fantomAddressRegistry;
    let fantomTokenRegistry;

    before(async function () {
      mockERC20 = await MockERC20.new(
        mockPayTokenName,
        mockPayTokenSymbol,
        ZERO
      );
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
      await mockERC20.mintPay(bidder, mockPayTokenMintAmount, {
        from: owner
      });
      await mockERC20.mintPay(winner, mockPayTokenMintAmount, {
        from: owner
      });
      await mockERC20.mintPay(hacker, mockPayTokenMintAmount, {
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
      await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
        from: winner
      });
      await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
        from: bidder
      });
      await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
        from: hacker
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

      await fantomAuction.initialize(owner, { from: owner });

      // Update address
      await fantomAddressRegistry.updateArtion(fantomArtion.address, {
        from: owner
      });

      await fantomAddressRegistry.updateAuction(fantomAuction.address, {
        from: owner
      });

      await fantomAddressRegistry.updateMarketplace(fantomMarketplace.address, {
        from: owner
      });

      await fantomAddressRegistry.updateBundleMarketplace(
        fantomBundleMarketplace.address,
        { from: owner }
      );

      await fantomAddressRegistry.updateTokenRegistry(
        fantomTokenRegistry.address,
        { from: owner }
      );

      await fantomTokenRegistry.add(mockERC20.address, { from: owner });

      await fantomAuction.updateAddressRegistry(fantomAddressRegistry.address, {
        from: owner
      });
    });

    // Do this after each unit test
    afterEach(async function () {
      const timeNow = new BigNumber.from(Number(await time.latest()));
      fantomAuction.hardhatTimestamp(timeNow, { from: owner });
    });

    describe('Place Bid', function () {
      before(async function () {
        await fantomAuction.createAuction(
          mockERC721.address,
          ONE,
          mockERC20.address,
          sellerReservePrice,
          new BN(Number(await time.latest()) + 5),
          false,
          new BN(Number(await time.latest()) + 305),
          { from: seller }
        );
      });

      it('should place a bid', async function () {
        time.advanceBlock();
        time.increaseTo(Number(await time.latest()) + 50);
        time.advanceBlock();

        let _placeBidEvent = await fantomAuction.placeBid(
          mockERC721.address,
          ONE,
          bidderBidAmountMinimum,
          { from: bidder }
        );

        expectEvent(_placeBidEvent, 'BidPlaced', {
          0: mockERC721.address,
          1: ONE,
          2: bidder,
          3: bidderBidAmountMinimum
        });
      });

      it('should not place a bid if auction does not exist', async function () {
        await expect(
          fantomAuction.placeBid(mockERC721.address, FOUR, sellerReservePrice, {
            from: bidder
          })
        ).to.be.revertedWith('No auction exists');
      });
    });
  }
);
