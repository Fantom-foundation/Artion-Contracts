const hre = require('hardhat');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { solidity } = require('ethereum-waffle');
const { expect } = require('chai').use(solidity);
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');
const FantomAuction = artifacts.require('FantomAuction');

const {
  ZERO,
  ONE,
  FOUR,
  FIVE,
  mockPayTokenName,
  mockPayTokenSymbol,
  mockPayTokenMintAmount,
  mockNFTokenName,
  mockNFTokenSymbol
} = require('./utils/index.js');

contract('Mint', async function ([owner, seller, other]) {
  let mockERC20;
  let mockERC721;

  let fantomAuction;

  before(async function () {
    mockERC20 = await MockERC20.new(mockPayTokenName, mockPayTokenSymbol, ZERO);
    mockERC721 = await MockERC721.new(mockNFTokenName, mockNFTokenSymbol);

    fantomAuction = await FantomAuction.new();
  });

  describe('MockERC20 tokens minted to users', function () {
    // Test if the ERC20 pay tokens were minted properly
    it('Owner', async () => {
      await mockERC20.mintPay(owner, mockPayTokenMintAmount, {
        from: owner
      });
      expect(
        (await mockERC20.balanceOf(owner, { from: owner })).toString()
      ).to.equal(mockPayTokenMintAmount.toString());
    });

    it('Seller', async () => {
      await mockERC20.mintPay(seller, mockPayTokenMintAmount, {
        from: owner
      });
      expect(
        (await mockERC20.balanceOf(seller, { from: owner })).toString()
      ).to.equal(mockPayTokenMintAmount.toString());
    });

    it('Other', async () => {
      await mockERC20.mintPay(other, mockPayTokenMintAmount, {
        from: owner
      });
      expect(
        (await mockERC20.balanceOf(other, { from: owner })).toString()
      ).to.equal(mockPayTokenMintAmount.toString());
    });
  });

  describe('MockERC20 approve set to FantomAuction for all users', function () {
    it('Owner', async () => {
      await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
        from: owner
      });

      expect(
        await mockERC20.allowance(owner, fantomAuction.address, {
          from: owner
        })
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    it('Seller', async () => {
      await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
        from: seller
      });

      expect(
        await mockERC20.allowance(seller, fantomAuction.address, {
          from: seller
        })
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });

    it('Other', async () => {
      await mockERC20.approve(fantomAuction.address, mockPayTokenMintAmount, {
        from: other
      });

      expect(
        await mockERC20.allowance(other, fantomAuction.address, {
          from: other
        })
      ).to.be.bignumber.equal(mockPayTokenMintAmount);
    });
  });

  describe('MockERC721 tokens minted to users properly', function () {
    it('Owner', async () => {
      await mockERC721.mint(owner, { from: owner });
      expect(
        await mockERC721.balanceOf(owner, { from: owner })
      ).to.be.bignumber.equal(ONE);
    });

    it('Seller', async () => {
      // 5 NFTS
      await mockERC721.mint(seller, { from: owner });
      await mockERC721.mint(seller, { from: owner });
      await mockERC721.mint(seller, { from: owner });
      await mockERC721.mint(seller, { from: owner });
      await mockERC721.mint(seller, { from: owner });

      expect(
        await mockERC721.balanceOf(seller, { from: owner })
      ).to.be.bignumber.equal(FIVE);
    });
    it('Other', async () => {
      await mockERC721.mint(other), { from: owner };
      await mockERC721.mint(other), { from: owner };
      await mockERC721.mint(other), { from: owner };
      await mockERC721.mint(other), { from: owner };

      expect(
        await mockERC721.balanceOf(other, { from: owner })
      ).to.be.bignumber.equal(FOUR);
    });
  });

  describe('MockERC721 `setApprovalForAll` set to `FantomAuction` for all test users', function () {
    // Test if the MockERC721 `isApprovedForAll` is properly set to the `FantomAuction` instance
    it('Owner', async function () {
      await mockERC721.setApprovalForAll(fantomAuction.address, true, {
        from: owner
      });
      assert.isTrue(
        await mockERC721.isApprovedForAll(owner, fantomAuction.address, {
          from: owner
        })
      );
    });

    it('Seller', async function () {
      await mockERC721.setApprovalForAll(fantomAuction.address, true, {
        from: seller
      });
      assert.isTrue(
        await mockERC721.isApprovedForAll(seller, fantomAuction.address, {
          from: seller
        })
      );
    });

    it('Other', async function () {
      await mockERC721.setApprovalForAll(fantomAuction.address, true, {
        from: other
      });
      assert.isTrue(
        await mockERC721.isApprovedForAll(other, fantomAuction.address, {
          from: other
        })
      );
    });
  });
});
