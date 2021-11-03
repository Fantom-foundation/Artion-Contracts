// npx hardhat test .\test\TestFantomMarketplace_1.js --network localhost; run first in another shell: npx hardhat node
const {
  expectRevert,
  expectEvent,
  BN,
  ether,
  constants,
  balance,
  send
} = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const {
  ZERO,
  ONE,
  TWO,
  mockPayTokenName,
  mockPayTokenSymbol,
  mockPayTokenMintAmount,
  mockNFTokenName,
  mockNFTokenSymbol
} = require('../utils/index.js');

const {
  platformFee,
  marketPlatformFee,
  mintFee
} = require('../utils/marketplace');

const FantomMarketplace = artifacts.require('MockFantomMarketplace');
const FantomBundleMarketplace = artifacts.require('FantomBundleMarketplace');
const FantomAuction = artifacts.require('MockFantomAuction');
const FantomPriceFeed = artifacts.require('FantomPriceFeed');
const FantomAddressRegistry = artifacts.require('FantomAddressRegistry');
const FantomTokenRegistry = artifacts.require('FantomTokenRegistry');
const FantomNFTFactory = artifacts.require('FantomNFTFactory');
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');

contract(
  'FantomMarketplace - Royalty Test',
  function ([owner, platformFeeRecipient, artist, hacker, buyer, account1]) {
    before(async function () {
      this.mockERC20 = await MockERC20.new(
        mockPayTokenName,
        mockPayTokenSymbol,
        ZERO
      );

      this.mockERC20_invalid = await MockERC20.new(
        mockPayTokenName,
        mockPayTokenSymbol,
        ZERO
      );

      this.fantomAddressRegistry = await FantomAddressRegistry.new();

      this.mockERC721 = await MockERC721.new(
        mockPayTokenSymbol,
        mockPayTokenSymbol
      );

      this.fantomMarketplace = await FantomMarketplace.new();
      await this.fantomMarketplace.initialize(
        platformFeeRecipient,
        marketPlatformFee
      );
      await this.fantomMarketplace.updateAddressRegistry(
        this.fantomAddressRegistry.address
      );

      this.fantomBundleMarketplace = await FantomBundleMarketplace.new();
      await this.fantomBundleMarketplace.initialize(
        platformFeeRecipient,
        marketPlatformFee
      );

      await this.fantomBundleMarketplace.updateAddressRegistry(
        this.fantomAddressRegistry.address
      );

      this.fantomAuction = await FantomAuction.new();
      await this.fantomAuction.initialize(platformFeeRecipient);
      await this.fantomAuction.updateAddressRegistry(
        this.fantomAddressRegistry.address
      );

      this.fantomTokenRegistry = await FantomTokenRegistry.new();
      this.fantomTokenRegistry.add(this.mockERC20.address);

      await this.fantomAddressRegistry.updateTokenRegistry(
        this.fantomTokenRegistry.address
      );

      this.fantomPriceFeed = await FantomPriceFeed.new(
        this.fantomAddressRegistry.address,
        this.mockERC20.address
      );

      await this.fantomAddressRegistry.updateMarketplace(
        this.fantomMarketplace.address
      );
      await this.fantomAddressRegistry.updateBundleMarketplace(
        this.fantomBundleMarketplace.address
      );

      await this.fantomAddressRegistry.updateAuction(
        this.fantomAuction.address
      );

      await this.fantomAddressRegistry.updatePriceFeed(
        this.fantomPriceFeed.address
      );

      this.fantomNFTFactory = await FantomNFTFactory.new(
        this.fantomAuction.address,
        this.fantomMarketplace.address,
        this.fantomBundleMarketplace.address,
        mintFee,
        platformFeeRecipient,
        platformFee
      );

      await this.fantomNFTFactory.registerTokenContract(
        this.mockERC721.address
      );

      await this.fantomAddressRegistry.updateNFTFactory(
        this.fantomNFTFactory.address
      );

      await this.mockERC721.mint(artist, { from: artist });
    });

    it('An artist registers a royalty [1% (100)] for his NFT', async function () {
      await this.fantomMarketplace.registerRoyalty(
        this.mockERC721.address,
        ZERO,
        new BN('100'),
        { from: artist }
      );
    });

    it('should return correct minter [artist] and royalty value [1% (100)]', async function () {
      let minter = await this.fantomMarketplace.minters(
        this.mockERC721.address,
        ZERO
      );

      let royalty = await this.fantomMarketplace.royalties(
        this.mockERC721.address,
        ZERO
      );

      expect(royalty.toString()).to.be.equal('100');
      expect(minter.toString()).to.be.equal(artist);
    });

    it('An artist fails to register a royalty [101% (10001)] for his NFT', async function () {
      await expectRevert(
        this.fantomMarketplace.registerRoyalty(
          this.mockERC721.address,
          ZERO,
          new BN('10001'),
          { from: artist }
        ),
        'invalid royalty'
      );
    });
  }
);
