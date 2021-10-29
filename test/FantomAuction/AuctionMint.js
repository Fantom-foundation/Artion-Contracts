const hre = require('hardhat');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { solidity } = require('ethereum-waffle');
const { expect } = require('chai').use(solidity);
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

const {
  ZERO,
  ONE,
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
} = require('../utils/auction.js');

contract('FantomAuction', async function () {
  let mockERC20;
  let mockERC721;

  let fantomAuction;
  let fantomArtion;
  let fantomMarketplace;
  let fantomBundleMarketplace;
  let fantomAddressRegistry;
  let fantomTokenRegistry;

  let owner, bidder, seller, winner, hacker, other;

  before(async function () {
    const MockERC20 = await ethers.getContractFactory('MockERC20');
    const MockERC721 = await ethers.getContractFactory('MockERC721');
    const FantomAuction = await ethers.getContractFactory('FantomAuction');
    const FantomArtion = await ethers.getContractFactory('Artion');
    const FantomMarketplace = await ethers.getContractFactory(
      'FantomMarketplace'
    );
    const FantomBundleMarketplace = await ethers.getContractFactory(
      'FantomBundleMarketplace'
    );
    const FantomAddressRegistry = await ethers.getContractFactory(
      'FantomAddressRegistry'
    );
    const FantomTokenRegistry = await ethers.getContractFactory(
      'FantomTokenRegistry'
    );

    [owner, bidder, seller, winner, hacker, other] = await ethers.getSigners();

    mockERC20 = await MockERC20.deploy(
      mockPayTokenName,
      mockPayTokenSymbol,
      ZERO
    );
    await mockERC20.deployed();

    mockERC721 = await MockERC721.deploy(mockNFTokenName, mockNFTokenSymbol);
    await mockERC721.deployed();

    fantomAuction = await FantomAuction.deploy();
    await fantomAuction.deployed();

    fantomArtion = await FantomArtion.deploy(owner.address, ONE);
    await fantomArtion.deployed();

    fantomMarketplace = await FantomMarketplace.deploy();
    await fantomMarketplace.deployed();

    fantomBundleMarketplace = await FantomBundleMarketplace.deploy();
    await fantomBundleMarketplace.deployed();

    fantomAddressRegistry = await FantomAddressRegistry.deploy();
    await fantomAddressRegistry.deployed();

    fantomTokenRegistry = await FantomTokenRegistry.deploy();
    await fantomTokenRegistry.deployed();
  });

  describe('MockERC20 tokens minted to users', function () {
    // Test if the ERC20 pay tokens were minted properly
    it('Owner', async () => {
      await mockERC20
        .connect(owner)
        .mintPay(owner.address, mockPayTokenMintAmount);
      expect(
        (await mockERC20.connect(owner).balanceOf(owner.address)).toString()
      ).to.equal(mockPayTokenMintAmount.toString());
    });

    it('Bidder', async () => {
      await mockERC20
        .connect(owner)
        .mintPay(bidder.address, mockPayTokenMintAmount);
      expect(
        (await mockERC20.connect(owner).balanceOf(bidder.address)).toString()
      ).to.equal(mockPayTokenMintAmount.toString());
    });

    it('Seller', async () => {
      await mockERC20
        .connect(owner)
        .mintPay(seller.address, mockPayTokenMintAmount);
      expect(
        (await mockERC20.connect(owner).balanceOf(seller.address)).toString()
      ).to.equal(mockPayTokenMintAmount.toString());
    });

    it('Winner', async () => {
      await mockERC20
        .connect(owner)
        .mintPay(winner.address, mockPayTokenMintAmount);
      expect(
        (await mockERC20.connect(owner).balanceOf(winner.address)).toString()
      ).to.equal(mockPayTokenMintAmount.toString());
    });

    it('Other', async () => {
      await mockERC20
        .connect(owner)
        .mintPay(other.address, mockPayTokenMintAmount);
      expect(
        (await mockERC20.connect(owner).balanceOf(other.address)).toString()
      ).to.equal(mockPayTokenMintAmount.toString());
    });
  });

  describe('MockERC20 approve set to FantomAuction for all users', function () {
    it('Owner', async () => {
      await mockERC20
        .connect(owner)
        .approve(fantomAuction.address, mockPayTokenMintAmount);

      expect(
        await mockERC20
          .connect(owner)
          .allowance(owner.address, fantomAuction.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });
    it('Bidder', async () => {
      await mockERC20
        .connect(bidder)
        .approve(fantomAuction.address, mockPayTokenMintAmount);

      expect(
        await mockERC20
          .connect(bidder)
          .allowance(bidder.address, fantomAuction.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });
    it('Seller', async () => {
      await mockERC20
        .connect(seller)
        .approve(fantomAuction.address, mockPayTokenMintAmount);

      expect(
        await mockERC20
          .connect(seller)
          .allowance(seller.address, fantomAuction.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });
    it('Winner', async () => {
      await mockERC20
        .connect(winner)
        .approve(fantomAuction.address, mockPayTokenMintAmount);

      expect(
        await mockERC20
          .connect(winner)
          .allowance(winner.address, fantomAuction.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });
    it('Other', async () => {
      await mockERC20
        .connect(other)
        .approve(fantomAuction.address, mockPayTokenMintAmount);

      expect(
        await mockERC20
          .connect(other)
          .allowance(other.address, fantomAuction.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });
    it('Hacker', async () => {
      await mockERC20
        .connect(hacker)
        .approve(fantomAuction.address, mockPayTokenMintAmount);

      expect(
        await mockERC20
          .connect(hacker)
          .allowance(hacker.address, fantomAuction.address)
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });
  });

  describe('MockERC721 tokens minted to users properly', function () {
    it('Owner', async () => {
      await mockERC721.connect(owner).mint(owner.address);
      expect(
        await mockERC721.connect(owner).balanceOf(owner.address)
      ).to.be.bignumber.equal(ONE);
    });
    it('Bidder', async () => {
      expect(
        await mockERC721.connect(owner).balanceOf(bidder.address)
      ).to.be.bignumber.equal(ZERO);
    });
    it('Seller', async () => {
      // 5 NFTS
      await mockERC721.connect(owner).mint(seller.address);
      await mockERC721.connect(owner).mint(seller.address);
      await mockERC721.connect(owner).mint(seller.address);
      await mockERC721.connect(owner).mint(seller.address);
      await mockERC721.connect(owner).mint(seller.address);

      expect(
        await mockERC721.connect(owner).balanceOf(seller.address)
      ).to.be.bignumber.equal(FIVE);
    });
    it('Other', async () => {
      await mockERC721.connect(owner).mint(other.address);
      await mockERC721.connect(owner).mint(other.address);
      await mockERC721.connect(owner).mint(other.address);
      await mockERC721.connect(owner).mint(other.address);

      expect(
        await mockERC721.connect(owner).balanceOf(other.address)
      ).to.be.bignumber.equal(FOUR);
    });
  });

  describe('MockERC721 `setApprovalForAll` set to `FantomAuction` for all test users', function () {
    // Test if the MockERC721 `isApprovedForAll` is properly set to the `FantomAuction` instance
    it('Owner', async function () {
      await mockERC721
        .connect(owner)
        .setApprovalForAll(fantomAuction.address, true);
      assert.isTrue(
        await mockERC721
          .connect(owner)
          .isApprovedForAll(owner.address, fantomAuction.address)
      );
    });

    it('Bidder', async function () {
      await mockERC721
        .connect(bidder)
        .setApprovalForAll(fantomAuction.address, true);
      assert.isTrue(
        await mockERC721
          .connect(bidder)
          .isApprovedForAll(bidder.address, fantomAuction.address)
      );
    });

    it('Seller', async function () {
      await mockERC721
        .connect(seller)
        .setApprovalForAll(fantomAuction.address, true);
      assert.isTrue(
        await mockERC721
          .connect(seller)
          .isApprovedForAll(seller.address, fantomAuction.address)
      );
    });

    it('Winner', async function () {
      await mockERC721
        .connect(winner)
        .setApprovalForAll(fantomAuction.address, true);
      assert.isTrue(
        await mockERC721
          .connect(winner)
          .isApprovedForAll(winner.address, fantomAuction.address)
      );
    });

    it('Other', async function () {
      await mockERC721
        .connect(other)
        .setApprovalForAll(fantomAuction.address, true);
      assert.isTrue(
        await mockERC721
          .connect(other)
          .isApprovedForAll(other.address, fantomAuction.address)
      );
    });

    it('Hacker', async function () {
      await mockERC721
        .connect(hacker)
        .setApprovalForAll(fantomAuction.address, true);
      assert.isTrue(
        await mockERC721
          .connect(hacker)
          .isApprovedForAll(hacker.address, fantomAuction.address)
      );
    });
  });
});
