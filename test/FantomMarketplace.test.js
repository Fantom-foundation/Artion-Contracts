const {
    BN,
    constants,
    expectEvent,
    expectRevert,
    balance,
} = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

const FantomNFT = artifacts.require('FantomNFT');
const FantomMarketplace = artifacts.require('FantomMarketplace');

contract('Core ERC721 tests for FantomNFT', function ([
    owner,
    minter,
    buyer,
    feeRecipient,
]) {
    const firstTokenId = new BN('1');
    const secondTokenId = new BN('2');
    const nonExistentTokenId = new BN('99');
    const platformFee = new BN('25'); // marketplace platform fee: 2.5%
    const pricePerItem = new BN('1000000000000000000');
    const newPrice = new BN('500000000000000000');
  
    const RECEIVER_MAGIC_VALUE = '0x150b7a02';
  
    const randomTokenURI = 'ipfs';
  
    beforeEach(async function () {
      this.nft = await FantomNFT.new({ from: owner });
      this.marketplace = await FantomMarketplace.new(
        '0xFC00FACE00000000000000000000000000000000',
        platformFee,
        { from: owner }
      );
      this.nft.mint(minter, randomTokenURI, { from: owner });
      this.nft.mint(owner, randomTokenURI, { from: owner });
    });

    describe('Listing Item', function () {
        it('reverts when not owning NFT', async function() {
            await expectRevert(
                this.marketplace.listItem(
                    this.nft.address,
                    firstTokenId,
                    '1',
                    pricePerItem,
                    '0',
                    ZERO_ADDRESS,
                    { from: owner }
                ),
                "Must be owner of NFT."
            );
        });

        it('reverts when not approved', async function() {
            await expectRevert(
                this.marketplace.listItem(
                    this.nft.address,
                    firstTokenId,
                    '1',
                    pricePerItem,
                    '0',
                    ZERO_ADDRESS,
                    { from: minter }
                ),
                "Must be approved before list."
            );
        });

        it('successfuly lists item', async function() {
            await this.nft.setApprovalForAll(this.marketplace.address, true, { from: minter });
            await this.marketplace.listItem(
                this.nft.address,
                firstTokenId,
                '1',
                pricePerItem,
                '0',
                ZERO_ADDRESS,
                { from: minter }
            );
        })
    });

    describe('Canceling Item', function() {
        this.beforeEach(async function() {
            await this.nft.setApprovalForAll(this.marketplace.address, true, { from: minter });
            await this.marketplace.listItem(
                this.nft.address,
                firstTokenId,
                '1',
                pricePerItem,
                '0',
                ZERO_ADDRESS,
                { from: minter }
            );
        });

        it('reverts when item is not listed', async function() {
            await expectRevert(
                this.marketplace.cancelListing(
                    this.nft.address,
                    secondTokenId,
                    { from: owner }
                ),
                "Not listed Item or not owning the item."
            );
        });

        it('reverts when not owning the item', async function() {
            await expectRevert(
                this.marketplace.cancelListing(
                    this.nft.address,
                    firstTokenId,
                    { from: owner }
                ),
                "Not listed Item or not owning the item."
            );
        });

        it('successfully cancel the item', async function() {
            await this.marketplace.cancelListing(
                this.nft.address,
                firstTokenId,
                { from: minter }
            );
        })
    });


    describe('Updating Item Price', function() {
        this.beforeEach(async function() {
            await this.nft.setApprovalForAll(this.marketplace.address, true, { from: minter });
            await this.marketplace.listItem(
                this.nft.address,
                firstTokenId,
                '1',
                pricePerItem,
                '0',
                ZERO_ADDRESS,
                { from: minter }
            );
        });

        it('reverts when item is not listed', async function() {
            await expectRevert(
                this.marketplace.updateListing(
                    this.nft.address,
                    secondTokenId,
                    newPrice,
                    { from: owner }
                ),
                "Not listed Item or not owning the item."
            );
        });

        it('reverts when not owning the item', async function() {
            await expectRevert(
                this.marketplace.updateListing(
                    this.nft.address,
                    firstTokenId,
                    newPrice,
                    { from: owner }
                ),
                "Not listed Item or not owning the item."
            );
        });

        it('successfully update the item', async function() {
            await this.marketplace.updateListing(
                this.nft.address,
                firstTokenId,
                newPrice,
                { from: minter }
            );
        })
    });

    describe('Buying Item', function() {
        beforeEach(async function() {
            await this.nft.setApprovalForAll(this.marketplace.address, true, { from: minter });
            await this.marketplace.listItem(
                this.nft.address,
                firstTokenId,
                '1',
                pricePerItem,
                '0',
                ZERO_ADDRESS,
                { from: minter }
            );
        });

        it('reverts when seller doesnt own the item', async function() {
            await this.nft.safeTransferFrom(minter, owner, firstTokenId, { from: minter });
            await expectRevert(
                this.marketplace.buyItem(
                    this.nft.address,
                    firstTokenId,
                    {
                        from: buyer,
                        value: pricePerItem
                    }
                ),
                "Seller doesn't own the item."
            );
        });

        it('reverts when buying before the scheduled time', async function() {
            await this.nft.setApprovalForAll(this.marketplace.address, true, { from: owner });
            await this.marketplace.listItem(
                this.nft.address,
                secondTokenId,
                '1',
                pricePerItem,
                constants.MAX_UINT256,
                ZERO_ADDRESS,
                { from: owner }
            );
            await expectRevert(
                this.marketplace.buyItem(
                    this.nft.address,
                    secondTokenId,
                    {
                        from: buyer,
                        value: pricePerItem
                    }
                ),
                "Item is not buyable yet."
            );
        });

        it('reverts when the amount is not enough', async function() {
            await expectRevert(
                this.marketplace.buyItem(
                    this.nft.address,
                    firstTokenId,
                    {
                        from: buyer
                    }
                ),
                "Not enough amount to buy item."
            );
        });

        it('successfully purchase item', async function() {
            const feeBalanceTracker = await balance.tracker('0xFC00FACE00000000000000000000000000000000', 'ether');
            const minterBalanceTracker = await balance.tracker(minter, 'ether');
            const receipt = await this.marketplace.buyItem(
                this.nft.address,
                firstTokenId,
                {
                    from: buyer,
                    value: pricePerItem
                }
            );
            const cost = await getGasCosts(receipt);
            console.log(cost);
            expect(await this.nft.ownerOf(firstTokenId)).to.be.equal(buyer);
            expect(await feeBalanceTracker.delta('ether')).to.be.bignumber.equal('0.025');
            expect(await minterBalanceTracker.delta('ether')).to.be.bignumber.equal('0.975');
        })
    })
  
    async function getGasCosts(receipt) {
      const tx = await web3.eth.getTransaction(receipt.tx);
      const gasPrice = new BN(tx.gasPrice);
      return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
})
