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
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');

contract('FantomMarketplace - Listing Test', function([
  owner,
  platformFeeRecipient,
  artist,
  hacker,
  buyer,
  account1
]) {
  before(async function() {
    let result;
    let tokenId;
    let listing;
    let wFTMBalance;

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
  });

  it('An artist mints an NFT and token id should 0', async function() {
    result = await this.mockERC721.mint(artist, { from: artist });
    tokenId = result.logs[0].args.tokenId;
    expect(tokenId.toString()).to.be.equal(ZERO.toString());
  });

  it('The artist tries to list the nft before approving it. He/She will fail with "item not approved"', async function() {
    await expectRevert(
      this.fantomMarketplace.listItem(
        this.mockERC721.address,
        tokenId,
        ONE,
        this.mockERC20.address,
        ether('20'),
        new BN('1632304800'), // 2021-09-22 10:00:00 GMT
        { from: artist }
      ),
      'item not approved'
    );
  });
  it('The artist should be able to approve the nft the marketplace', async function() {
    await this.mockERC721.setApprovalForAll(
      this.fantomMarketplace.address,
      true,
      {
        from: artist
      }
    );
    expect(
      await this.mockERC721.isApprovedForAll(
        artist,
        this.fantomMarketplace.address
      )
    ).to.be.equal(true);
  });

  it('A hacker tries to list the nft. He/She will fail with "not owning item"', async function() {
    await expectRevert(
      this.fantomMarketplace.listItem(
        this.mockERC721.address,
        tokenId,
        ONE,
        this.mockERC20.address,
        ether('20'),
        new BN('1632304800'), // 2021-09-22 10:00:00 GMT
        { from: hacker }
      ),
      'not owning item'
    );
  });

  it('The artist lists the nft to the marketplace. ItemListed event should be emitted with correct values', async function() {
    //Let's mock that the current time: 2021-09-21 10:00:00`);
    await this.fantomMarketplace.setTime(new BN('1632218400'));
    result = await this.fantomMarketplace.listItem(
      this.mockERC721.address,
      tokenId,
      ONE,
      this.mockERC20.address,
      ether('20'),
      new BN('1632304800'), // 2021-09-22 10:00:00 GMT
      { from: artist }
    );

    //Event ItemListed should be emitted with correct values
    expectEvent(result, 'ItemListed', {
      owner: artist,
      nft: this.mockERC721.address,
      tokenId: tokenId,
      quantity: ONE,
      payToken: this.mockERC20.address,
      pricePerItem: ether('20'),
      startingTime: new BN('1632304800')
    });
  });

  it('The nft should be on the list now', async function() {
    listing = await this.fantomMarketplace.listings(
      this.mockERC721.address,
      tokenId,
      artist
    );
    expect(listing.quantity.toString()).to.be.equal('1');
    expect(listing.payToken).to.be.equal(this.mockERC20.address);
    expect(listing.pricePerItem.toString()).to.be.equal(ether('20').toString());
    expect(listing.startingTime.toString()).to.be.equal('1632304800');
  });

  it('The artist by mistake tries to list the nft again. He/She will fail with "already listed"', async function() {
    await expectRevert(
      this.fantomMarketplace.listItem(
        this.mockERC721.address,
        tokenId,
        ONE,
        this.mockERC20.address,
        ether('20'),
        new BN('1632304800'), // 2021-09-22 10:00:00 GMT
        { from: artist }
      ),
      'already listed'
    );
  });

  it('A hacker tries to cancel the listing. He/She will fail with "not listed item"', async function() {
    await expectRevert(
      this.fantomMarketplace.cancelListing(this.mockERC721.address, tokenId, {
        from: hacker
      }),
      'not listed item'
    );
  }); //note when not the owner tries to cancel the listing, 'not owning item' revert will never occur with the current code IE 02/11/2021

  it('A hacker tries to update the listing. He/She will fail with "not listed item"', async function() {
    await expectRevert(
      this.fantomMarketplace.updateListing(
        this.mockERC721.address,
        tokenId,
        this.mockERC20.address,
        ether('25'),
        { from: hacker }
      ),
      'not listed item'
    );
  }); //note when not the owner tries to update the listing, 'not owning item' revert will never occur with the current code IE 02/11/2021

  it('The artist updates the ntf listing. Event ItemUpdated should be emitted with correct values', async function() {
    result = await this.fantomMarketplace.updateListing(
      this.mockERC721.address,
      tokenId,
      this.mockERC20.address,
      ether('25'),
      { from: artist }
    );
    //Event ItemUpdated should be emitted with correct values
    expectEvent(result, 'ItemUpdated', {
      owner: artist,
      nft: this.mockERC721.address,
      tokenId: tokenId,
      payToken: this.mockERC20.address,
      newPrice: ether('25')
    });
  });

  it('The artist cancels a non existing listing. He/She will fail with "not listed item"', async function() {
    await expectRevert(
      this.fantomMarketplace.cancelListing(this.mockERC721.address, ONE, {
        from: artist
      }),
      'not listed item'
    );
  });

  it('The artist cancels the nft listing. Event ItemCanceled should be emitted with correct values', async function() {
    result = await this.fantomMarketplace.cancelListing(
      this.mockERC721.address,
      tokenId,
      { from: artist }
    );
    //Event ItemUpdated should be emitted with correct values
    expectEvent(result, 'ItemCanceled', {
      owner: artist,
      nft: this.mockERC721.address,
      tokenId: tokenId
    });
  });

  it('The artist tries to list an nft with an invalid token. He/She will fail with "invalid pay token"', async function() {
    await expectRevert(
      this.fantomMarketplace.listItem(
        this.mockERC721.address,
        tokenId,
        ONE,
        this.mockERC20_invalid.address,
        ether('20'),
        new BN('1632304800'), // 2021-09-22 10:00:00 GMT
        { from: artist }
      ),
      'invalid pay token'
    );
  });
});
