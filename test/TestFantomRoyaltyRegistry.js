// npx hardhat test .\test\TestFantomMarketplace_1.js --network localhost; run first in another shell: npx hardhat node
const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const {
  ZERO,
  ONE,
  TWO,
  mockPayTokenName,
  mockPayTokenSymbol,
  etherToWei,
  weiToEther
} = require('./utils/index.js');

const _INTERFACE_ID_ROYALTIES_EIP2981 = '0x2a55205a';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const FantomPriceFeed = artifacts.require('FantomPriceFeed');
const FantomAddressRegistry = artifacts.require('FantomAddressRegistry');
const FantomTokenRegistry = artifacts.require('FantomTokenRegistry');
const FantomRoyaltyRegistry = artifacts.require('FantomRoyaltyRegistry');
const MockERC20 = artifacts.require('MockERC20');
const MockERC721 = artifacts.require('MockERC721');
const ERC721WithRoyalties = artifacts.require('ERC721WithRoyalties');
const ERC721WithContractWideRoyalties = artifacts.require(
  'ERC721WithContractWideRoyalties'
);

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
      this.mockCollectionThree = await MockERC721.new('zFTM', 'zFTM');

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

      // Collection with individual NFT royalties
      this.erc721WithRoyalties = await ERC721WithRoyalties.new(
        'firstCollection',
        'f2981'
      );

      // Collection with single royalty
      this.ercWithContractWideRoyalties =
        await ERC721WithContractWideRoyalties.new('secondCollection', 's2981');
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

      it('It should return empty receiver address and zero amount [if not found]', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.mockCollectionThree.address,
          ONE,
          etherToWei(1)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(ZERO_ADDRESS);
        expect(weiToEther(_royaltyAmount)).to.be.equal('0');
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

      it('It should return correct royalty details', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.mockCollectionTwo.address,
          ZERO,
          etherToWei(1)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(receiver);
        expect(weiToEther(_royaltyAmount)).to.be.equal('0.03');
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

    describe('Mock IERC2981 -- Individual Royalty', function () {
      before(async function () {
        await this.erc721WithRoyalties.mint(
          receiver,
          receiver,
          250 // 2.5% royalty
        );
      });

      it('It should support IERC2981', async function () {
        expect(
          await this.erc721WithRoyalties.supportsInterface(
            _INTERFACE_ID_ROYALTIES_EIP2981
          ),
          'Error Royalties 2981'
        ).to.be.true;
      });

      it('RoyaltyRegistry should return correct details for IERC2981 Supported collection', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.erc721WithRoyalties.address,
          ZERO,
          etherToWei(10000)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(receiver);
        expect(weiToEther(_royaltyAmount)).to.be.equal('250'); //2.5% of 10000
      });
    });

    describe('Mock IERC2981 -- Collection-wide Royalty', function () {
      before(async function () {
        await this.ercWithContractWideRoyalties.setRoyalties(receiver, 350); //3.5% royalty
        await this.ercWithContractWideRoyalties.mint(receiver);
      });

      it('It should support IERC2981', async function () {
        expect(
          await this.ercWithContractWideRoyalties.supportsInterface(
            _INTERFACE_ID_ROYALTIES_EIP2981
          ),
          'Error Royalties 2981'
        ).to.be.true;
      });

      it('RoyaltyRegistry should return correct details for IERC2981 Supported collection', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.ercWithContractWideRoyalties.address,
          ZERO, //this argument won't be used
          etherToWei(11000)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(receiver);
        expect(weiToEther(_royaltyAmount)).to.be.equal('385'); //3.5% of 11000
      });
    });
  }
);
