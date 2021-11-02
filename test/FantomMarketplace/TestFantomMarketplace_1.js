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

contract('FantomMarketplace test', function([
  owner,
  platformFeeRecipient,
  artist,
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

  it('An NFT for an artist with token id 0 should be able to be minted', async function() {
    result = await this.mockERC721.mint(artist, { from: artist });
    tokenId = result.logs[0].args.tokenId;
    expect(tokenId.toString()).to.be.equal(ZERO.toString());
  });

  it('The nft should be approved to the marketplace', async function() {
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

  it('ItemListed event should be emitted with correct values', async function() {
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

  it('ItemSold event should be emitted with correct values', async function() {
    //Let's mint 20 wFTMs to the buyer so he/she can purchase the nft
    await this.mockERC20.mintPay(buyer, ether('20'));

    //The buyer approve his/her wFTM to the marketplace
    await this.mockERC20.approve(this.fantomMarketplace.address, ether('20'), {
      from: buyer
    });

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
      tokenId: tokenId,
      quantity: ONE,
      unitPrice: ZERO,
      pricePerItem: ether('20')
    });
  });

  it('The nft should no longer on the list', async function() {
    //The nft shouldn't be on the listing anymore
    listing = await this.fantomMarketplace.listings(
      this.mockERC721.address,
      tokenId,
      artist
    );
    expect(listing.quantity.toString()).to.be.equal(ZERO.toString());
    expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
    expect(listing.pricePerItem.toString()).to.be.equal(ether('0').toString());
    expect(listing.startingTime.toString()).to.be.equal(ZERO.toString());
  });

  it('The artist should get 19 wFTMs as the fee is 5%', async function() {
    //Check the wFTM balance of the artist
    //He/She should get 19 wFTM for his/her nft
    wFTMBalance = await this.mockERC20.balanceOf(artist);
    expect(wFTMBalance.toString()).to.be.equal(ether('19').toString());
  });

  it('The platform fee recipient should get 1 wFTM', async function() {
    wFTMBalance = await this.mockERC20.balanceOf(platformFeeRecipient);
    expect(wFTMBalance.toString()).to.be.equal(ether('1').toString());
  });

  it('The buyer now should have 0 wFTM', async function() {
    wFTMBalance = await this.mockERC20.balanceOf(buyer);
    expect(wFTMBalance.toString()).to.be.equal(ether('0').toString());
  });

  it('The artist mints another nft. The token id now should be 1', async function() {
    result = await this.mockERC721.mint(artist, { from: artist });
    tokenId = result.logs[0].args.tokenId;
    expect(tokenId.toString()).to.be.equal(ONE.toString());
  });

  it('The artist list it on the marketplace', async function() {
    await this.mockERC721.setApprovalForAll(
      this.fantomMarketplace.address,
      true,
      {
        from: artist
      }
    );

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

  it('Event Offer created should be emitted with correct values', async function() {
    await this.mockERC20.mintPay(buyer, ether('18'));
    //The buyer approve his/her wFTM to the marketplace
    await this.mockERC20.approve(this.fantomMarketplace.address, ether('18'), {
      from: buyer
    });

    //Let's mock that the current time:2021-09-22 11:00:00 GMT
    await this.fantomMarketplace.setTime(new BN('1632308400'));

    //The buyer makes an offer for the nft for 18 wFTMs with deadline on 2021-09-22 15:00:00 GMT
    result = await this.fantomMarketplace.createOffer(
      this.mockERC721.address,
      tokenId,
      this.mockERC20.address,
      ONE,
      ether('18'),
      new BN('1632322800'),
      { from: buyer }
    );

    //Event OfferCreated should be emitted with correct values
    expectEvent(result, 'OfferCreated', {
      creator: buyer,
      nft: this.mockERC721.address,
      tokenId: tokenId,
      quantity: ONE,
      payToken: this.mockERC20.address,
      pricePerItem: ether('18'),
      deadline: new BN('1632322800')
    });
  });

  it('The artist accepts the offer. ItemSold event should be emitted', async function() {
    //Let's mock the current time: 2021-09-22 14:30:00 GMT
    await this.fantomMarketplace.setTime(new BN('1632321000'));

    //The artist accepts the offer
    result = await this.fantomMarketplace.acceptOffer(
      this.mockERC721.address,
      tokenId,
      buyer,
      { from: artist }
    );

    //Event ItemSold should be emitted
    expectEvent(result, 'ItemSold', {
      seller: artist,
      buyer: buyer,
      nft: this.mockERC721.address,
      tokenId: tokenId,
      quantity: ONE,
      unitPrice: ZERO,
      pricePerItem: ether('18')
    });
  });

  it('The artist mints another nft. The token id now should be 2', async function() {
    result = await this.mockERC721.mint(artist, { from: artist });
    tokenId = result.logs[0].args.tokenId;
    expect(tokenId.toString()).to.be.equal(TWO.toString());
  });

  it('The artist lists it on the marketplace', async function() {
    await this.mockERC721.setApprovalForAll(
      this.fantomMarketplace.address,
      true,
      {
        from: artist
      }
    );

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

  it('The artist lists againt the nft on the marketplace', async function() {
    await this.mockERC721.setApprovalForAll(
      this.fantomMarketplace.address,
      true,
      {
        from: artist
      }
    );

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

  it('Event Offer created should be emitted with correct values', async function() {
    await this.mockERC20.mintPay(buyer, ether('18'));
    //The buyer approve his/her wFTM to the marketplace
    await this.mockERC20.approve(this.fantomMarketplace.address, ether('18'), {
      from: buyer
    });

    //Let's mock that the current time:2021-09-22 11:00:00 GMT
    await this.fantomMarketplace.setTime(new BN('1632308400'));

    //The buyer makes an offer for the nft for 18 wFTMs with deadline on 2021-09-22 15:00:00 GMT
    result = await this.fantomMarketplace.createOffer(
      this.mockERC721.address,
      tokenId,
      this.mockERC20.address,
      ONE,
      ether('18'),
      new BN('1632322800'),
      { from: buyer }
    );

    //Event OfferCreated should be emitted with correct values
    expectEvent(result, 'OfferCreated', {
      creator: buyer,
      nft: this.mockERC721.address,
      tokenId: tokenId,
      quantity: ONE,
      payToken: this.mockERC20.address,
      pricePerItem: ether('18'),
      deadline: new BN('1632322800')
    });
  });

  it('The buyer cancels the offer. OfferCanceled event should be emitted with correct values', async function() {
    result = await this.fantomMarketplace.cancelOffer(
      this.mockERC721.address,
      tokenId,
      { from: buyer }
    );
    //Event OfferCreated should be emitted with correct values
    expectEvent(result, 'OfferCanceled', {
      creator: buyer,
      nft: this.mockERC721.address,
      tokenId: tokenId
    });
  });

  it('The contract owner updates the platformfee. UpdatePlatformFee event should be emitted with correct values', async function() {
    result = await this.fantomMarketplace.updatePlatformFee(new BN('10'), {
      from: owner
    });
    expectEvent(result, 'UpdatePlatformFee', {
      platformFee: new BN('10')
    });
  });

  it('The new platform fees should be correct', async function() {
    expect((await this.fantomMarketplace.platformFee()).toString()).to.be.equal(
      new BN('10').toString()
    );
  });

  it('The contract owner updates the platformfee recipient. UpdatePlatformFeeRecipient event should be emitted with correct values', async function() {
    result = await this.fantomMarketplace.updatePlatformFeeRecipient(account1, {
      from: owner
    });
    expectEvent(result, 'UpdatePlatformFeeRecipient', {
      platformFeeRecipient: account1
    });
  });

  it('The new platformfee recipient should be correct', async function() {
    expect(await this.fantomMarketplace.feeReceipient()).to.be.equal(account1);
  });
});
