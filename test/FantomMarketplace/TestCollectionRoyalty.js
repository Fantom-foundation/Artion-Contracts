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
const FantomNFTFactoryPrivate = artifacts.require('FantomNFTFactoryPrivate');
const FantomArtFactory = artifacts.require('FantomArtFactory');
const FantomArtFactoryPrivate = artifacts.require('FantomArtFactoryPrivate');
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');

contract('FantomMarketplace - Collection Royalty Test', function([
  owner,
  platformFeeRecipient,
  artist,
  feeRecipient
]) {
  before(async function() {
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

    await this.fantomAddressRegistry.updateAuction(this.fantomAuction.address);

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

    this.fantomNFTFactoryPrivate = await FantomNFTFactoryPrivate.new(
      this.fantomAuction.address,
      this.fantomMarketplace.address,
      this.fantomBundleMarketplace.address,
      mintFee,
      platformFeeRecipient,
      platformFee
    );

    this.fantomArtFactory = await FantomArtFactory.new(
      this.fantomMarketplace.address,
      this.fantomBundleMarketplace.address,
      mintFee,
      platformFeeRecipient,
      platformFee
    );

    this.fantomArtFactoryPrivate = await FantomArtFactoryPrivate.new(
      this.fantomMarketplace.address,
      this.fantomBundleMarketplace.address,
      mintFee,
      platformFeeRecipient,
      platformFee
    );

    await this.fantomAddressRegistry.updateNFTFactory(
      this.fantomNFTFactory.address
    );

    await this.fantomAddressRegistry.updateNFTFactoryPrivate(
      this.fantomNFTFactoryPrivate.address
    );

    await this.fantomAddressRegistry.updateArtFactory(
      this.fantomArtFactory.address
    );

    await this.fantomAddressRegistry.updateArtFactoryPrivate(
      this.fantomArtFactoryPrivate.address
    );
  });

  it('It should register a collection royalty [1% (100)]', async function() {
    await this.fantomMarketplace.registerCollectionRoyalty(
      this.mockERC721.address,
      artist,
      new BN('100'),
      feeRecipient,
      { from: owner }
    );
  });

  it('It should update a collection royalty [1% -> 5%]', async function() {
    await this.fantomMarketplace.registerCollectionRoyalty(
      this.mockERC721.address,
      artist,
      new BN('500'),
      feeRecipient,
      { from: owner }
    );
  });

  it('It should not register a collection royalty if not an owner', async function() {
    await expectRevert(
      this.fantomMarketplace.registerCollectionRoyalty(
        this.mockERC721.address,
        artist,
        new BN('100'),
        feeRecipient,
        { from: artist }
      ),
      'Ownable: caller is not the owner'
    );
  });

  it('It should not register a collection royalty if creator address is 0', async function() {
    await expectRevert(
      this.fantomMarketplace.registerCollectionRoyalty(
        this.mockERC721.address,
        constants.ZERO_ADDRESS,
        new BN('100'),
        feeRecipient,
        { from: owner }
      ),
      'invalid creator address'
    );
  });

  it('It should not register a collection royalty if fee recipient address is 0', async function() {
    await expectRevert(
      this.fantomMarketplace.registerCollectionRoyalty(
        this.mockERC721.address,
        artist,
        new BN('100'),
        constants.ZERO_ADDRESS,
        { from: owner }
      ),
      'invalid fee recipient address'
    );
  });

  it('It should fail to register a collection royalty [101% (10001)]', async function() {
    await expectRevert(
      this.fantomMarketplace.registerCollectionRoyalty(
        this.mockERC721.address,
        artist,
        new BN('10001'),
        feeRecipient,
        { from: owner }
      ),
      'invalid royalty'
    );
  });

  it('It should fail to register a collection royalty if collection exists in Factory', async function() {
    await this.fantomNFTFactory.registerTokenContract(this.mockERC721.address);

    await expectRevert(
      this.fantomMarketplace.registerCollectionRoyalty(
        this.mockERC721.address,
        artist,
        new BN('100'),
        feeRecipient,
        { from: owner }
      ),
      'invalid nft address'
    );
  });
});
