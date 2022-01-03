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
  mockNFTokenSymbol,
  weiToEther
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
const FantomRoyaltyRegistry = artifacts.require('FantomRoyaltyRegistry');
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');

contract('FantomMarketplace - Buying Test', function([
  owner,
  platformFeeRecipient,
  artist,
  nftMinter,
  hacker,
  buyer,
  buyer2,
  royaltyMigrationManager
]) {
  before(async function() {
    let result;
    let tokenId;
    let listing;
    let wFTMBalance;
    let nftOwner;
    let minter;
    let royalty;

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

    this.fantomRoyaltyRegistry = await FantomRoyaltyRegistry.new();
    this.fantomRoyaltyRegistry.updateMigrationManager(
        royaltyMigrationManager
    );

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

    await this.fantomAddressRegistry.updateRoyaltyRegistry(
      this.fantomRoyaltyRegistry.address
    );

    this.fantomNFTFactory = await FantomNFTFactory.new(
      this.fantomAuction.address,
      this.fantomMarketplace.address,
      this.fantomBundleMarketplace.address,
      mintFee,
      platformFeeRecipient,
      platformFee
    );

    await this.fantomNFTFactory.registerTokenContract(this.mockERC721.address);

    await this.fantomAddressRegistry.updateNFTFactory(
      this.fantomNFTFactory.address
    );

    await this.mockERC721.mint(artist, { from: artist });

    await this.mockERC721.mint(artist, { from: artist });

    await this.mockERC721.setApprovalForAll(
      this.fantomMarketplace.address,
      true,
      {
        from: artist
      }
    );

    await this.fantomRoyaltyRegistry.setRoyalty(
      this.mockERC721.address,
      ZERO,
      artist,
      new BN('100'),
      { from: artist }
    );

    await this.fantomMarketplace.listItem(
      this.mockERC721.address,
      ZERO,
      ONE,
      this.mockERC20.address,
      ether('20'),
      new BN('1632304800'), // 2021-09-22 10:00:00 GMT
      { from: artist }
    );
  });

  it('A buyer tries to buy an nft which is not listed. He/She will fail with "not listed item"', async function() {
    await expectRevert(
      this.fantomMarketplace.buyItem(
        this.mockERC721.address,
        ONE,
        this.mockERC20.address,
        artist,
        { from: buyer }
      ),
      'not listed item'
    );
  });

  it('A buyer tries to buy a listed nft with an invalid pay token. He/She will fail with "invalid pay token"', async function() {
    //Let's mock that the current time:2021-09-22 11:00:00 GMT
    await this.fantomMarketplace.setTime(new BN('1632308400'));
    await expectRevert(
      this.fantomMarketplace.buyItem(
        this.mockERC721.address,
        ZERO,
        this.mockERC20_invalid.address,
        artist,
        { from: buyer }
      ),
      'invalid pay token'
    );
  });

  it('A buyer tries to buy a listed nft which hasnt started. He/She will fail with "item not buyable"', async function() {
    //Let's mint 20 wFTMs to the buyer so he/she can purchase the nft
    await this.mockERC20.mintPay(buyer, ether('20'));
    //The buyer approve his/her wFTM to the marketplace
    await this.mockERC20.approve(this.fantomMarketplace.address, ether('20'), {
      from: buyer
    });
    //Let's mock that the current time:2021-09-21 10:00:00 GMT
    await this.fantomMarketplace.setTime(new BN('1632218400'));
    await expectRevert(
      this.fantomMarketplace.buyItem(
        this.mockERC721.address,
        ZERO,
        this.mockERC20.address,
        artist,
        { from: buyer }
      ),
      'item not buyable'
    );
  });

  it('A buyer buys a listed nft. Event ItemSold should be emitted with  correct values', async function() {
    //Let's mock that the current time:2021-09-22 11:00:00 GMT
    await this.fantomMarketplace.setTime(new BN('1632308400'));

    //The buyer purchases the nft
    result = await this.fantomMarketplace.buyItem(
      this.mockERC721.address,
      ZERO,
      this.mockERC20.address,
      artist,
      { from: buyer }
    );

    //Event ItemSold should be emitted
    expectEvent(result, 'ItemSold', {
      seller: artist,
      buyer: buyer,
      nft: this.mockERC721.address,
      tokenId: ZERO,
      quantity: ONE,
      unitPrice: ZERO,
      pricePerItem: ether('20')
    });
  });

  it('The seller should get the correct amount of wFTMs', async function() {
    wFTMBalance = await this.mockERC20.balanceOf(artist);
    expect(wFTMBalance.toString()).to.be.equal(ether('19').toString());
  });

  it('The platform fee recipient should get the correct amount of wFTMs', async function() {
    wFTMBalance = await this.mockERC20.balanceOf(platformFeeRecipient);
    expect(wFTMBalance.toString()).to.be.equal(ether('1').toString());
  });

  it('The nft should no longer on the list', async function() {
    //The nft shouldn't be on the listing anymore
    listing = await this.fantomMarketplace.listings(
      this.mockERC721.address,
      ZERO,
      artist
    );
    expect(listing.quantity.toString()).to.be.equal(ZERO.toString());
    expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
    expect(listing.pricePerItem.toString()).to.be.equal(ether('0').toString());
    expect(listing.startingTime.toString()).to.be.equal(ZERO.toString());
  });

  it('The owner of the nft should be the buyer now', async function() {
    nftOwner = await this.mockERC721.ownerOf(ZERO);
    expect(nftOwner).to.be.equal(buyer);
  });

  it('It should return correct minter and royalty fee [1% of 20]', async function() {
    let details = await this.fantomRoyaltyRegistry.royaltyInfo(this.mockERC721.address, ZERO, ether('20'))

    const { 0: minter, 1: royalty } = details;

    expect(weiToEther(royalty)).to.be.equal('0.2');
    expect(minter.toString()).to.be.equal(artist);
  });

  it(`The buyer sells the nft for 100 wFTM on the marketplace. Another buyer buys that.
     The minter (the artist) should get 1% of 95 and the fee recipient gets 5% of 100`, async function() {
    //Let's mock the current time: 2021-09-25-10:00:00 GMT
    await this.fantomMarketplace.setTime(new BN('1632564000'));

    await this.mockERC721.setApprovalForAll(
      this.fantomMarketplace.address,
      true,
      {
        from: buyer
      }
    );

    await this.fantomMarketplace.listItem(
      this.mockERC721.address,
      ZERO,
      ONE,
      this.mockERC20.address,
      ether('100'),
      new BN('1632565800'), // 2021-09-25 10:30:00 GMT
      { from: buyer }
    );

    //Let's mock the current time: 2021-09-25-11:00:00 GMT
    await this.fantomMarketplace.setTime(new BN('1632567600'));

    //Let's mint 100 wFTMs to the buyer2 so he/she can purchase the nft
    await this.mockERC20.mintPay(buyer2, ether('100'));
    //The buyer approve his/her wFTM to the marketplace
    await this.mockERC20.approve(this.fantomMarketplace.address, ether('100'), {
      from: buyer2
    });
    //Buyer2 buys the nft
    await this.fantomMarketplace.buyItem(
      this.mockERC721.address,
      ZERO,
      this.mockERC20.address,
      buyer,
      { from: buyer2 }
    );

    wFTMBalance = await this.mockERC20.balanceOf(artist);
    expect(wFTMBalance.toString()).to.be.equal(ether('19.95').toString());

    wFTMBalance = await this.mockERC20.balanceOf(platformFeeRecipient);
    expect(wFTMBalance.toString()).to.be.equal(ether('6').toString());

    wFTMBalance = await this.mockERC20.balanceOf(buyer);
    expect(wFTMBalance.toString()).to.be.equal(ether('94.05').toString());
  });
});
