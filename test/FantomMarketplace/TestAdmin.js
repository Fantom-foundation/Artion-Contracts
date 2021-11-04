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
  platformFee,
  marketPlatformFee,
  mintFee
} = require('../utils/marketplace');

const FantomMarketplace = artifacts.require('FantomMarketplace');

contract('FantomMarketplace - Buying Test', function([
  owner,
  platformFeeRecipient,
  artist,
  hacker,
  buyer,
  account1
]) {
  before(async function() {
    let result;
    let newPlatformFee;
    let newPlatformFeeRecipient;

    this.fantomMarketplace = await FantomMarketplace.new();
    await this.fantomMarketplace.initialize(
      platformFeeRecipient,
      marketPlatformFee
    );
  });

  it(`The contract owner updates the platform fee. UpdatePlatformFee event should 
      emitted with correct value`, async function() {
    result = await this.fantomMarketplace.updatePlatformFee(new BN('100'), {
      from: owner
    });
    await expectEvent(result, 'UpdatePlatformFee', {
      platformFee: new BN('100')
    });
  });

  it('The new platform fee should be correct', async function() {
    newPlatformFee = await this.fantomMarketplace.platformFee();
    expect(newPlatformFee.toString()).to.be.equal('100');
  });

  it(`The contract owner updates the platform fee recipient.
      UpdatePlatformFeeRecipient should be emitted with correct value`, async function() {
    result = await this.fantomMarketplace.updatePlatformFeeRecipient(account1, {
      from: owner
    });
    await expectEvent(result, 'UpdatePlatformFeeRecipient', {
      platformFeeRecipient: account1
    });
  });

  it('The new platform fee recipient should be correct', async function() {
    newPlatformFeeRecipient = await this.fantomMarketplace.feeReceipient();
    expect(newPlatformFeeRecipient).to.be.equal(account1);
  });

  it(`A hacker tries to update the platform fee. He/She will fail with "Ownable: caller is not the owner"`, async function() {
    await expectRevert(
      this.fantomMarketplace.updatePlatformFee(new BN('100'), {
        from: hacker
      }),
      'Ownable: caller is not the owner'
    );
  });

  it(`A hacker tries to update the platform fee recipient. He/She will fail with "Ownable: caller is not the owner"`, async function() {
    await expectRevert(
      this.fantomMarketplace.updatePlatformFeeRecipient(hacker, {
        from: hacker
      }),
      'Ownable: caller is not the owner'
    );
  });
});
