// npx hardhat test .\test\TestFantomMarketplace.js --network localhost; run first in another shell: npx hardhat node
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
  FOUR,
  FIVE,
  mockPayTokenName,
  mockPayTokenSymbol,
  mockPayTokenMintAmount,
  mockNFTokenName,
  mockNFTokenSymbol
} = require('../../utils/index.js');

const {
  platformFee,
  marketPlatformFee,
  mintFee
} = require('../../utils/marketplace');

const FantomMarketplace = artifacts.require('MockFantomMarketplace');
const FantomBundleMarketplace = artifacts.require('FantomBundleMarketplace');
const FantomAuction = artifacts.require('MockFantomAuction');
const FantomPriceFeed = artifacts.require('FantomPriceFeed');
const FantomAddressRegistry = artifacts.require('FantomAddressRegistry');
const FantomTokenRegistry = artifacts.require('FantomTokenRegistry');
const FantomRoyaltyRegistry = artifacts.require('FantomRoyaltyRegistry');
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');

contract(
  'FantomMarketplace test',
  function ([owner, platformFeeRecipient, artist, buyer, hacker]) {
    beforeEach(async function () {
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
      
      this.royaltyRegistry = await FantomRoyaltyRegistry.new();

      await this.fantomAddressRegistry.updateRoyaltyRegistry(
        this.royaltyRegistry.address
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
    });

    describe('Minting and listing an NFT without reverts', function () {
      it(`An artist mints an NFT then lists it on the marketplace with price of 20 wFTM.
        *Check if the nft is now on the listing.
        After the listing starts a buyer purchases the nft.
        *Check if ItemListed and ItemSold events are emitted correctly.
        *Check if the artist receives the correct amount of wFTMs.
        *Check if the wFTM balance of the buyer is correct.
        *Check if the marketplace contract gets the fees correctly.
        *Check if the nft now is no longer on the listing
        *Check if the nft now belongs to the buyer`, async function () {
        //An artist mints an NFT
        let result = await this.mockERC721.mint(artist, { from: artist });

        let tokenId = result.logs[0].args.tokenId;

        //The artist approves the marketplace
        await this.mockERC721.setApprovalForAll(
          this.fantomMarketplace.address,
          true,
          {
            from: artist
          }
        );

        //Let's mock that the current time: 2021-09-21 10:00:00`);
        await this.fantomMarketplace.setTime(new BN('1632218400'));

        //The artist lists the nft on the marketplace with price 20 wFTM and and start time 2021-09-22 10:00:00 GMT`);
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

        //The nft should be on the listing
        let listing = await this.fantomMarketplace.listings(
          this.mockERC721.address,
          tokenId,
          artist
        );
        expect(listing.quantity.toString()).to.be.equal('1');
        expect(listing.payToken).to.be.equal(this.mockERC20.address);
        expect(listing.pricePerItem.toString()).to.be.equal(
          ether('20').toString()
        );
        expect(listing.startingTime.toString()).to.be.equal('1632304800');

        //Let's mint 100 wFTMs to the buyer so he/she can purchase the nft
        await this.mockERC20.mintPay(buyer, ether('100'));

        //The buyer approve his/her wFTM to the marketplace
        await this.mockERC20.approve(
          this.fantomMarketplace.address,
          ether('20'),
          { from: buyer }
        );

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

        //The nft shouldn't be on the listing anymore
        listing = await this.fantomMarketplace.listings(
          this.mockERC721.address,
          tokenId,
          artist
        );
        expect(listing.quantity.toString()).to.be.equal(ZERO.toString());
        expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
        expect(listing.pricePerItem.toString()).to.be.equal(
          ether('0').toString()
        );
        expect(listing.startingTime.toString()).to.be.equal(ZERO.toString());

        //Check the wFTM balance of the artist
        //He/She should get 19 wFTM for his/her nft
        let balance = await this.mockERC20.balanceOf(artist);
        expect(balance.toString()).to.be.equal(ether('19').toString());

        //Check the wFTM balance of the buyer
        //He/She should have 80 wFTM left
        balance = await this.mockERC20.balanceOf(buyer);
        expect(balance.toString()).to.be.equal(ether('80').toString());

        //Check the wFTM balance of the platform fee recipient
        //It should get 1 wFTM
        balance = await this.mockERC20.balanceOf(platformFeeRecipient);
        expect(balance.toString()).to.be.equal(ether('1').toString());

        //The owner of nft now should be the buyer
        let nftOwner = await this.mockERC721.ownerOf(tokenId);
        expect(nftOwner).to.be.equal(buyer);
      });

      it(`The artist mints another NFT then lists it on the marketplace with price of 20 wFTM.
        After the listing starts the buyer makes an offer for the nft for 18 wFTM.
        The artist then accepts the offer.
        *Check if ItemListed, createOffer and ItemSold events are emitted correctly.
        *Check if the artist receives the correct amount of wFTMs.
        *Check if the wFTM balance of the buyer is correct.
        *Check if the marketplace contract gets the fees correctly.
        *Check if the nft now belongs to the buyer`, async function () {
        //An artist mints an NFT
        let result = await this.mockERC721.mint(artist, { from: artist });

        let tokenId = result.logs[0].args.tokenId;

        //The artist approves the marketplace
        await this.mockERC721.setApprovalForAll(
          this.fantomMarketplace.address,
          true,
          {
            from: artist
          }
        );

        //Let's mock that the current time: 2021-09-21 10:00:00`);
        await this.fantomMarketplace.setTime(new BN('1632218400'));

        //The artist lists the nft on the marketplace with price 20 wFTM and and start time 2021-09-22 10:00:00 GMT`);
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

        //Let's mint 100 wFTMs to the buyer so he/she can purchase the nft
        await this.mockERC20.mintPay(buyer, ether('100'));

        //The buyer approve his/her wFTM to the marketplace
        await this.mockERC20.approve(
          this.fantomMarketplace.address,
          ether('18'),
          { from: buyer }
        );

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

        //Check the wFTM balance of the artist
        //He/She should get 17.1 wFTM for his/her nft
        let balance = await this.mockERC20.balanceOf(artist);
        expect(balance.toString()).to.be.equal(ether('17.1').toString());

        //Check the wFTM balance of the buyer
        //He/She should have 82 wFTM left
        balance = await this.mockERC20.balanceOf(buyer);
        expect(balance.toString()).to.be.equal(ether('82').toString());

        //Check the wFTM balance of the platform fee recipient
        //It should get 0.9 wFTM
        balance = await this.mockERC20.balanceOf(platformFeeRecipient);
        expect(balance.toString()).to.be.equal(ether('0.9').toString());

        //The owner of nft now should be the buyer
        let nftOwner = await this.mockERC721.ownerOf(tokenId);
        expect(nftOwner).to.be.equal(buyer);
      });
    });

    describe('Minting and listing an NFT reverts', function () {
      it(`An artist mints an NFT then lists it on the marketplace with price of 20 wFTM.
        Before the listing starts a buyer tries to purchases the nft.        
        It should cause revert 'item not buyable'`, async function () {
        //An artist mints an NFT
        let result = await this.mockERC721.mint(artist, { from: artist });

        let tokenId = result.logs[0].args.tokenId;

        //The artist approves the marketplace
        await this.mockERC721.setApprovalForAll(
          this.fantomMarketplace.address,
          true,
          {
            from: artist
          }
        );

        //Let's mock that the current time: 2021-09-21 10:00:00`);
        await this.fantomMarketplace.setTime(new BN('1632218400'));

        //The artist lists the nft on the marketplace with price 20 wFTM and and start time 2021-09-22 10:00:00 GMT`);
        await this.fantomMarketplace.listItem(
          this.mockERC721.address,
          tokenId,
          ONE,
          this.mockERC20.address,
          ether('20'),
          new BN('1632304800'), // 2021-09-22 10:00:00 GMT
          { from: artist }
        );

        //Let's mint 100 wFTMs to the buyer so he/she can purchase the nft
        await this.mockERC20.mintPay(buyer, ether('100'));

        //The buyer approve his/her wFTM to the marketplace
        await this.mockERC20.approve(
          this.fantomMarketplace.address,
          ether('20'),
          { from: buyer }
        );

        //The buyer tries to purchase the nft but it will fail with 'item not buyable'
        await expectRevert(
          this.fantomMarketplace.buyItem(
            this.mockERC721.address,
            tokenId,
            this.mockERC20.address,
            artist,
            { from: buyer }
          ),
          'item not buyable'
        );
      });
    });
  }
);
