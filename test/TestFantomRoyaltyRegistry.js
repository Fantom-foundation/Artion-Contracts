// npx hardhat test .\test\TestFantomMarketplace_1.js --network localhost; run first in another shell: npx hardhat node
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

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
  etherToWei,
  weiToEther
} = require('./utils/index.js');

const {
  platformFee,
  marketPlatformFee,
  mintFee
} = require('./utils/marketplace');

const FantomPriceFeed = artifacts.require('FantomPriceFeed');
const FantomAddressRegistry = artifacts.require('FantomAddressRegistry');
const FantomTokenRegistry = artifacts.require('FantomTokenRegistry');
const FantomRoyaltyRegistry = artifacts.require('FantomRoyaltyRegistry');
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');

contract(
  'FantomRoyaltyRegistry',
  function ([owner, royaltyMigrationManager, receiver]) {
    before(async function () {
      this.mockERC20 = await MockERC20.new(
        mockPayTokenName,
        mockPayTokenSymbol,
        ZERO
      );

      this.fantomAddressRegistry = await FantomAddressRegistry.new();

      this.mockCollectionOne = await MockERC721.new(
        mockPayTokenSymbol,
        mockPayTokenSymbol
      );

      this.mockCollectionTwo = await MockERC721.new('xFTM', 'xFTM');

      this.fantomRoyaltyRegistry = await FantomRoyaltyRegistry.new();
      this.fantomRoyaltyRegistry.updateMigrationManager(
        royaltyMigrationManager
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

      await this.fantomAddressRegistry.updatePriceFeed(
        this.fantomPriceFeed.address
      );

      await this.fantomAddressRegistry.updateRoyaltyRegistry(
        this.fantomRoyaltyRegistry.address
      );
    });

    describe('Collection royalty', function () {
      it('It should register a collection royalty [5% (500)]', async function () {
        await this.fantomRoyaltyRegistry.setDefaultRoyalty(
          this.mockCollectionOne.address,
          receiver,
          new BN('500'),
          { from: owner }
        );
      });

      it('It should return correct royalty details', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.mockCollectionOne.address,
          ZERO,
          etherToWei(1)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(receiver);
        expect(weiToEther(_royaltyAmount)).to.be.equal('0.05');
      });

      it('It should not allow to re-register a collection royalty', async function () {
        await expectRevert(
          this.fantomRoyaltyRegistry.setDefaultRoyalty(
            this.mockCollectionOne.address,
            receiver,
            new BN('500'),
            { from: owner }
          ),
          'Royalty already set'
        );
      });

      it('It should not allow invalid royalty value', async function () {
        await expectRevert(
          this.fantomRoyaltyRegistry.setDefaultRoyalty(
            this.mockCollectionTwo.address,
            receiver,
            new BN('10001'),
            { from: owner }
          ),
          'Royalty too high'
        );
      });
    });

    describe('Invidual Royalty', function () {
      before(async function () {
        await this.mockCollectionTwo.mint(receiver, { from: receiver }); //Token 0
        await this.mockCollectionTwo.mint(receiver, { from: receiver }); //Token 1
      });

      it('It should allow NFT owner to register royalty [3% (300)]', async function () {
        await this.fantomRoyaltyRegistry.setRoyalty(
          this.mockCollectionTwo.address,
          ZERO,
          receiver,
          new BN('300'),
          { from: receiver }
        );
      });

      it('It should not allow to re-register NFT royalty', async function () {
        await expectRevert(
          this.fantomRoyaltyRegistry.setRoyalty(
            this.mockCollectionTwo.address,
            ZERO,
            receiver,
            new BN('300'),
            { from: receiver }
          ),
          'Royalty already set'
        );
      });

      it('It should not allow invalid royalty value', async function () {
        await expectRevert(
          this.fantomRoyaltyRegistry.setRoyalty(
            this.mockCollectionTwo.address,
            ONE,
            receiver,
            new BN('10001'),
            { from: receiver }
          ),
          'Royalty too high'
        );
      });

      it('It should not allow a non-owner to register NFT royalty', async function () {
        await expectRevert(
          this.fantomRoyaltyRegistry.setRoyalty(
            this.mockCollectionTwo.address,
            ONE,
            owner,
            new BN('300'),
            { from: owner }
          ),
          'not authorized'
        );
      });

      it('It should allow Royalty migration manager to register royalty [3% (300)]', async function () {
        await this.fantomRoyaltyRegistry.setRoyalty(
          this.mockCollectionTwo.address,
          ONE,
          receiver,
          new BN('300'),
          { from: royaltyMigrationManager }
        );
      });
    });
  }
);
