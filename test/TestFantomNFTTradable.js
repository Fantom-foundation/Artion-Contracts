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
const _INTERFACE_ID_ERC2981_SETTER = '0x3bea9a6a';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const FantomRoyaltyRegistry = artifacts.require('FantomRoyaltyRegistry');
const MockERC20 = artifacts.require('MockERC20');
const FantomNFTTradable = artifacts.require('FantomNFTTradable');

contract(
  'FantomNFTTradable',
  function ([
    owner,
    receiver,
    tradableManager,
    platformFeeRecipient,
    royaltyMigrationManager,
    other
  ]) {
    before(async function () {
      this.mockERC20 = await MockERC20.new(
        mockPayTokenName,
        mockPayTokenSymbol,
        ZERO
      );

      this.fantomNFTTradable = await FantomNFTTradable.new(
        mockPayTokenName,
        mockPayTokenSymbol,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        etherToWei(1),
        platformFeeRecipient,
        false,
        ZERO_ADDRESS
      );

      this.fantomNFTTradablePrivate = await FantomNFTTradable.new(
        'Artion',
        'ART',
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        etherToWei(1),
        platformFeeRecipient,
        true,
        tradableManager
      );

      this.fantomNFTTradableCollection = await FantomNFTTradable.new(
        'Artion',
        'ART',
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        etherToWei(1),
        platformFeeRecipient,
        false,
        ZERO_ADDRESS
      );

      this.fantomNFTTradableIndividual = await FantomNFTTradable.new(
        'Artion',
        'ART',
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        etherToWei(1),
        platformFeeRecipient,
        true,
        tradableManager
      );

      this.fantomRoyaltyRegistry = await FantomRoyaltyRegistry.new();
      this.fantomRoyaltyRegistry.updateMigrationManager(
        royaltyMigrationManager
      );
    });

    describe('NFTTradable (Public)', function () {
      it('It should support IERC2981', async function () {
        expect(
          await this.fantomNFTTradable.supportsInterface(
            _INTERFACE_ID_ROYALTIES_EIP2981
          )
        ).to.be.true;
      });

      it('It should support IERC2981RoyaltySetter', async function () {
        expect(
          await this.fantomNFTTradable.supportsInterface(
            _INTERFACE_ID_ERC2981_SETTER
          )
        ).to.be.true;
      });

      it('It should allow minting', async function () {
        await this.fantomNFTTradable.mint(owner, '', receiver, new BN('100'), {
          value: etherToWei(1)
        });
      });

      it('It should not allow invalid royalty', async function () {
        await expectRevert(
          this.fantomNFTTradable.mint(owner, '', receiver, new BN('10001'), {
            value: etherToWei(1)
          }),
          'Royalty Too high'
        );
      });

      it('RoyaltyRegistry should return correct details', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.fantomNFTTradable.address,
          ONE,
          etherToWei(1000)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(receiver);
        expect(weiToEther(_royaltyAmount)).to.be.equal('10'); //1% of 1000
      });

      it('RoyaltyRegistry should return empty receiver address and zero amount [if not found]', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.fantomNFTTradable.address,
          TWO,
          etherToWei(1000)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(ZERO_ADDRESS);
        expect(weiToEther(_royaltyAmount)).to.be.equal('0'); //1% of 1000
      });
    });

    describe('NFTTradable (Private)', function () {
      it('It should not allow a random user to mint', async function () {
        await expectRevert(
          this.fantomNFTTradablePrivate.mint(
            owner,
            '',
            receiver,
            new BN('200'),
            {
              value: etherToWei(1),
              from: other
            }
          ),
          'not authorized'
        );
      });

      it('It should allow a tradable manager to mint', async function () {
        await this.fantomNFTTradablePrivate.mint(
          owner,
          '',
          receiver,
          new BN('200'),
          {
            value: etherToWei(1),
            from: tradableManager
          }
        );
      });

      it('RoyaltyRegistry should return correct details', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.fantomNFTTradablePrivate.address,
          ONE,
          etherToWei(1000)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(receiver);
        expect(weiToEther(_royaltyAmount)).to.be.equal('20'); //1% of 1000
      });

      it('RoyaltyRegistry should return empty receiver address and zero amount [if not found]', async function () {
        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.fantomNFTTradablePrivate.address,
          TWO,
          etherToWei(1000)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(ZERO_ADDRESS);
        expect(weiToEther(_royaltyAmount)).to.be.equal('0'); //1% of 1000
      });
    });

    describe('NFTTradable Collection Royalty', function () {
      it('It should allow minting (no royalty included)', async function () {
        await this.fantomNFTTradableCollection.mint(
          owner,
          '',
          ZERO_ADDRESS,
          new BN('0'),
          { value: etherToWei(1) }
        );
      });

      it('It should not allow a non-owner to set collection-wide royalty ', async function () {
        await expectRevert(
          this.fantomRoyaltyRegistry.setDefaultRoyalty(
            this.fantomNFTTradableCollection.address,
            receiver,
            new BN('200'),
            { from: tradableManager }
          ),
          'Ownable: caller is not the owner'
        );
      });

      it('It should allow an owner to set collection-wide royalty through RoyaltyRegistry [IERC2981RoyaltySetter]', async function () {
        await this.fantomRoyaltyRegistry.setDefaultRoyalty(
          this.fantomNFTTradableCollection.address,
          receiver,
          new BN('200')
        );

        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.fantomNFTTradableCollection.address,
          ZERO,
          etherToWei(1000)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(receiver);
        expect(weiToEther(_royaltyAmount)).to.be.equal('20'); //2% of 1000
      });
    });

    describe('NFTTradable Individual Royalty', function () {
      it('It should allow minting (no royalty included)', async function () {
        await this.fantomNFTTradableIndividual.mint(
          owner,
          '',
          ZERO_ADDRESS,
          new BN('0'),
          { value: etherToWei(1), from: tradableManager }
        );
      });

      it('It should royalty migration manager to set individual royalty through RoyaltyRegistry [IERC2981RoyaltySetter]', async function () {
        await this.fantomRoyaltyRegistry.setRoyalty(
          this.fantomNFTTradableIndividual.address,
          ONE,
          receiver,
          new BN('300'),
          { from: royaltyMigrationManager }
        );

        let details = await this.fantomRoyaltyRegistry.royaltyInfo(
          this.fantomNFTTradableIndividual.address,
          ONE,
          etherToWei(1000)
        );

        const { 0: _receiver, 1: _royaltyAmount } = details;

        expect(_receiver.toString()).to.be.equal(receiver);
        expect(weiToEther(_royaltyAmount)).to.be.equal('30'); //2% of 1000
      });
    });
  }
);
