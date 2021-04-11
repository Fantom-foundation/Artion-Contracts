const {
    expectRevert,
    expectEvent,
    BN,
    ether,
    constants,
    balance,
    send
  } = require('@openzeppelin/test-helpers');
  
  const {expect} = require('chai');

  const FantomNFT = artifacts.require('FantomNifty');
  const FantomAuction = artifacts.require('FantomAuctionMock');
  const FantomAuctionReal = artifacts.require('FantomAuction');
  const BiddingContractMock = artifacts.require('BiddingContractMock');
  const MockERC20 = artifacts.require('MockERC20');
  
  contract('FantomAuction', (accounts) => {
    const [admin, smartContract, platformFeeAddress, minter, owner, designer, bidder, bidder2, provider] = accounts;
  
    const ZERO = new BN('0');
    const TOKEN_ONE_ID = new BN('1');
    const TOKEN_TWO_ID = new BN('2');
    const TWENTY_TOKENS = new BN('20000000000000000000');
    const ONE_THOUSAND_TOKENS = new BN('1000000000000000000000');
  
    const randomTokenURI = 'rand';
  
    beforeEach(async () => {  
      this.token = await FantomNFT.new({ from: admin });
  
      this.mockToken = await MockERC20.new(
        'Mock ERC20',
        'MOCK',
        ONE_THOUSAND_TOKENS,
        {from: minter}
      );
  
      this.auction = await FantomAuction.new(
        platformFeeAddress,
        {from: admin}
      );

      await this.token.setApprovalForAll(this.auction.address, true, {from: minter});
      await this.token.setApprovalForAll(this.auction.address, true, {from: admin});
    });
  
    describe('Contract deployment', () => {  
      it('Reverts when platform fee recipient is zero', async () => {
        await expectRevert(
          FantomAuction.new(
            constants.ZERO_ADDRESS,
            {from: admin}
          ),
          "FantomAuction: Invalid Platform Fee Recipient"
        );
      });
    });
  
    describe('createAuction()', async () => {
  
      describe('validation', async () => {
        beforeEach(async () => {
          await this.token.mint(minter, randomTokenURI, {from: minter});
        });
  
        it('fails if endTime is in the past', async () => {
          await this.auction.setNowOverride('12');
          await expectRevert(
            this.auction.createAuction(this.token.address, TOKEN_ONE_ID, '1', '0', '10', {from: minter}),
            "FantomAuction.createAuction: End time passed. Nobody can bid."
          );
        });
  
        it('fails if endTime greater than startTime', async () => {
          await this.auction.setNowOverride('2');
          await expectRevert(
            this.auction.createAuction(this.token.address, TOKEN_ONE_ID, '1', '1', '0', {from: minter}),
            'FantomAuction.createAuction: End time must be greater than start'
          );
        });
  
        it('fails if token already has auction in play', async () => {
          await this.auction.setNowOverride('2');
          await this.auction.createAuction(this.token.address, TOKEN_ONE_ID, '1', '0', '10', {from: minter});
  
          await expectRevert(
            this.auction.createAuction(this.token.address, TOKEN_ONE_ID, '1', '1', '3', {from: minter}),
            'FantomAuction.createAuction: Cannot relist'
          );
        });
  
        it('fails if you dont own the token', async () => {
          await this.auction.setNowOverride('2');
          await this.token.mint(bidder, randomTokenURI, {from: minter});
  
          await this.auction.createAuction(this.token.address, TOKEN_ONE_ID, '1', '0', '10', {from: minter});
  
          await expectRevert(
            this.auction.createAuction(this.token.address, TOKEN_TWO_ID, '1', '1', '3', {from: minter}),
            'FantomAuction.createAuction: Not owner and or contract not approved'
          );
        });
  
        it('fails if token does not exist', async () => {
          await this.auction.setNowOverride('10');
  
          await expectRevert(
            this.auction.createAuction(this.token.address, '99', '1', '1', '11', {from: minter}),
            'ERC721: owner query for nonexistent token'
          );
        });
  
        it('fails if contract is paused', async () => {
          await this.auction.setNowOverride('2');
          await this.auction.toggleIsPaused({from: admin});
          await expectRevert(
            this.auction.createAuction(this.token.address, TOKEN_ONE_ID, '1', '0', '10', {from: minter}),
            "Function is currently paused"
          );
        });
      });
  
      describe('successful creation', async () => {
        it('Token retains in the ownership of the auction creator', async () => {
          await this.auction.setNowOverride('2');
          await this.token.mint(minter, randomTokenURI, {from: minter});
          await this.auction.createAuction(this.token.address, TOKEN_ONE_ID, '1', '0', '10', {from: minter});
  
          const owner = await this.token.ownerOf(TOKEN_ONE_ID);
          expect(owner).to.be.equal(minter);
        });
      });
    });
  
    describe('placeBid()', async () => {
  
      describe('validation', () => {
  
        beforeEach(async () => {
          await this.token.mint(minter, randomTokenURI, {from: minter});
          await this.token.mint(minter, randomTokenURI, {from: minter});
          await this.auction.setNowOverride('2');
  
          await this.auction.createAuction(
            this.token.address, 
            TOKEN_ONE_ID, // ID
            '1',  // reserve
            '1', // start
            '10', // end
            {from: minter}
          );
        });
  
        it('will revert if sender is smart contract', async () => {
          this.biddingContract = await BiddingContractMock.new(this.auction.address);
          await expectRevert(
            this.biddingContract.bid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')}),
            "FantomAuction.placeBid: No contracts permitted"
          );
        });
  
        it('will fail with 721 token not on auction', async () => {
          await expectRevert(
            this.auction.placeBid(this.token.address, 999, {from: bidder, value: 1}),
            'FantomAuction.placeBid: Bidding outside of the auction window'
          );
        });
  
        it('will fail with valid token but no auction', async () => {
          await expectRevert(
            this.auction.placeBid(this.token.address, TOKEN_TWO_ID, {from: bidder, value: 1}),
            'FantomAuction.placeBid: Bidding outside of the auction window'
          );
        });
  
        it('will fail when auction finished', async () => {
          await this.auction.setNowOverride('11');
          await expectRevert(
            this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: 1}),
            'FantomAuction.placeBid: Bidding outside of the auction window'
          );
        });
  
        it('will fail when contract is paused', async () => {
          await this.auction.toggleIsPaused({from: admin});
          await expectRevert(
            this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('1.0')}),
            "Function is currently paused"
          );
        });
  
        it('will fail when outbidding someone by less than the increment', async () => {
          await this.auction.setNowOverride('2');
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
  
          await expectRevert(
            this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')}),
            'FantomAuction.placeBid: Failed to outbid highest bidder'
          );
        });
      });
  
      describe('successfully places bid', () => {
  
        beforeEach(async () => {
          await this.token.mint(minter, randomTokenURI, {from: minter});
          await this.auction.setNowOverride('1');
          await this.auction.createAuction(
            this.token.address,
            TOKEN_ONE_ID, // ID
            '1',  // reserve
            '1', // start
            '10', // end
            {from: minter}
          );
        });
  
        it('places bid and you are the top owner', async () => {
          await this.auction.setNowOverride('2');
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
  
          const {_bidder, _bid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
          expect(_bid).to.be.bignumber.equal(ether('0.2'));
          expect(_bidder).to.equal(bidder);
  
          const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(this.token.address, TOKEN_ONE_ID);
          expect(_reservePrice).to.be.bignumber.equal('1');
          expect(_startTime).to.be.bignumber.equal('1');
          expect(_endTime).to.be.bignumber.equal('10');
          expect(_resulted).to.be.equal(false);
        });
  
        it('will refund the top bidder if found', async () => {
          await this.auction.setNowOverride('2');
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
  
          const {_bidder: originalBidder, _bid: originalBid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
          expect(originalBid).to.be.bignumber.equal(ether('0.2'));
          expect(originalBidder).to.equal(bidder);
  
          const bidderTracker = await balance.tracker(bidder);
  
          // make a new bid, out bidding the previous bidder
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder2, value: ether('0.4')});
  
          // Funds sent back to original bidder
          const changes = await bidderTracker.delta('wei');
          expect(changes).to.be.bignumber.equal(ether('0.2'));
  
          const {_bidder, _bid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
          expect(_bid).to.be.bignumber.equal(ether('0.4'));
          expect(_bidder).to.equal(bidder2);
        });
  
        it('successfully increases bid', async () => {
          await this.auction.setNowOverride('2');
  
          const bidderTracker = await balance.tracker(bidder);
          const receipt = await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
  
          expect(await bidderTracker.delta()).to.be.bignumber.equal(ether('0.2').add(await getGasCosts(receipt)).mul(new BN('-1')));
  
          const {_bidder, _bid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
          expect(_bid).to.be.bignumber.equal(ether('0.2'));
          expect(_bidder).to.equal(bidder);
  
          const receipt2 = await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('1')});
  
          // check that the bidder has only really spent 0.8 ETH plus gas due to 0.2 ETH refund
          expect(await bidderTracker.delta()).to.be.bignumber.equal((ether('1').sub(ether('0.2'))).add(await getGasCosts(receipt2)).mul(new BN('-1')));
  
          const {_bidder: newBidder, _bid: newBid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
          expect(newBid).to.be.bignumber.equal(ether('1'));
          expect(newBidder).to.equal(bidder);
        })
  
        it('successfully outbid bidder', async () => {
          await this.auction.setNowOverride('2');
  
          const bidderTracker = await balance.tracker(bidder);
          const bidder2Tracker = await balance.tracker(bidder2);
  
          // Bidder 1 makes first bid
          const receipt = await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
          expect(await bidderTracker.delta()).to.be.bignumber.equal(ether('0.2').add(await getGasCosts(receipt)).mul(new BN('-1')));
          const {_bidder, _bid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
          expect(_bid).to.be.bignumber.equal(ether('0.2'));
          expect(_bidder).to.equal(bidder);
  
          // Bidder 2 outbids bidder 1
          const receipt2 = await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder2, value: ether('1')});
  
          // check that the bidder has only really spent 0.8 ETH plus gas due to 0.2 ETH refund
          expect(await bidder2Tracker.delta()).to.be.bignumber.equal(ether('1').add(await getGasCosts(receipt2)).mul(new BN('-1')));
          expect(await bidderTracker.delta()).to.be.bignumber.equal(ether('0.2'));
  
          const {_bidder: newBidder, _bid: newBid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
          expect(newBid).to.be.bignumber.equal(ether('1'));
          expect(newBidder).to.equal(bidder2);
        })
      });
    });
  
    describe('withdrawBid()', async () => {
  
      beforeEach(async () => {
        await this.token.mint(minter, randomTokenURI, {from: minter});
        await this.auction.setNowOverride('2');
        await this.auction.createAuction(
          this.token.address, 
          TOKEN_ONE_ID,
          '1',
          '0',
          '10',
          {from: minter}
        );
        await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
      });
  
      it('fails with withdrawing a bid which does not exist', async () => {
        await expectRevert(
          this.auction.withdrawBid(this.token.address, 999, {from: bidder2}),
          'FantomAuction.withdrawBid: You are not the highest bidder'
        );
      });
  
      it('fails with withdrawing a bid which you did not make', async () => {
        await expectRevert(
          this.auction.withdrawBid(this.token.address, TOKEN_ONE_ID, {from: bidder2}),
          'FantomAuction.withdrawBid: You are not the highest bidder'
        );
      });
  
      it('fails with withdrawing when lockout time not passed', async () => {
        await this.auction.updateBidWithdrawalLockTime('6');
        await this.auction.setNowOverride('5');
        await expectRevert(
          this.auction.withdrawBid(this.token.address, TOKEN_ONE_ID, {from: bidder}),
          "FantomAuction.withdrawBid: Cannot withdraw until lock time has passed"
        );
      });
  
      it('fails when withdrawing after auction end', async () => {
        await this.auction.setNowOverride('12');
        await this.auction.updateBidWithdrawalLockTime('0', {from: admin});
        await expectRevert(
          this.auction.withdrawBid(this.token.address, TOKEN_ONE_ID, {from: bidder}),
          "FantomAuction.withdrawBid: Past auction end"
        );
      });
  
      it('fails when the contract is paused', async () => {
        const {_bidder: originalBidder, _bid: originalBid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
        expect(originalBid).to.be.bignumber.equal(ether('0.2'));
        expect(originalBidder).to.equal(bidder);
  
        const bidderTracker = await balance.tracker(bidder);
  
        // remove the withdrawal lock time for the test
        await this.auction.updateBidWithdrawalLockTime('0', {from: admin});
  
        await this.auction.toggleIsPaused({from: admin});
        await expectRevert(
          this.auction.withdrawBid(this.token.address, TOKEN_ONE_ID, {from: bidder}),
          "Function is currently paused"
        );
      });
  
      it('successfully withdraw the bid', async () => {
        const {_bidder: originalBidder, _bid: originalBid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
        expect(originalBid).to.be.bignumber.equal(ether('0.2'));
        expect(originalBidder).to.equal(bidder);
  
        const bidderTracker = await balance.tracker(bidder);
  
        // remove the withdrawal lock time for the test
        await this.auction.updateBidWithdrawalLockTime('0', {from: admin});
  
        const receipt = await this.auction.withdrawBid(this.token.address, TOKEN_ONE_ID, {from: bidder});
  
        // Funds sent back to original bidder, minus GAS costs
        const changes = await bidderTracker.delta('wei');
        expect(changes).to.be.bignumber.equal(
          ether('0.2').sub(await getGasCosts(receipt))
        );
  
        const {_bidder, _bid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
        expect(_bid).to.be.bignumber.equal('0');
        expect(_bidder).to.equal(constants.ZERO_ADDRESS);
      });
    });
  
    describe('resultAuction()', async () => {
  
      describe('validation', () => {
  
        beforeEach(async () => {
          await this.token.mint(minter, randomTokenURI, {from: minter});
          await this.auction.setNowOverride('2');
          await this.auction.createAuction(
            this.token.address, 
            TOKEN_ONE_ID,
            ether('1'),
            '0',
            '10',
            {from: minter}
          );
        });
  
        it('cannot result if not an owner', async () => {
          await expectRevert(
            this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: bidder}),
            'FantomAuction.resultAuction: Sender must be item owner'
          );
        });
  
        it('cannot result if auction has not ended', async () => {
          await expectRevert(
            this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter}),
            'FantomAuction.resultAuction: The auction has not ended'
          );
        });
  
        it('cannot result if the auction is reserve not reached', async () => {
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: (await this.auction.minBidIncrement())});
          await this.auction.setNowOverride('12');
          await expectRevert(
            this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter}),
            'FantomAuction.resultAuction: reserve not reached'
          );
        });
  
        it('cannot result if the auction has no winner', async () => {
          // Lower reserve to zero
          await this.auction.updateAuctionReservePrice(this.token.address, TOKEN_ONE_ID, '0', {from: minter});
          await this.auction.setNowOverride('12');
          await expectRevert(
            this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter}),
            'FantomAuction.resultAuction: no open bids'
          );
        });
  
        it('cannot result if the auction if its already resulted', async () => {
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('1')});
          await this.auction.setNowOverride('12');
  
          // result it
          await this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
          // try result it again
          await expectRevert(
            this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter}),
            'FantomAuction.resultAuction: Sender must be item owner'
          );
        });
      });
  
      describe('successfully resulting an auction', async () => {
  
        beforeEach(async () => {
          await this.token.mint(minter, randomTokenURI, {from: minter});
          await this.auction.setNowOverride('2');
          await this.auction.createAuction(
            this.token.address, 
            TOKEN_ONE_ID,
            ether('0.1'),
            '0',
            '10',
            {from: minter}
          );
        });
  
        it('transfer token to the winner', async () => {
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
          await this.auction.setNowOverride('12');
  
          expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(minter);
  
          await this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
          expect(await this.token.ownerOf(TOKEN_ONE_ID)).to.be.equal(bidder);
        });
  
        it('transfer funds to the token creator and platform', async () => {
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.4')});
          await this.auction.setNowOverride('12');
  
          const platformFeeTracker = await balance.tracker(platformFeeAddress);
          const minterTracker = await balance.tracker(minter);
  
          // Result it successfully
          await this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
          // Platform gets 12%
          const platformChanges = await platformFeeTracker.delta('wei');
          expect(platformChanges).to.be.bignumber.equal(
            (ether('0.4').sub(ether('0.1'))) // total minus reserve
              .div(new BN('1000'))
              .mul(new BN('120')) // only 12% of total
          );
  
          // Remaining funds sent to minter on completion
          const changes = await minterTracker.delta('wei');
          expect(changes).to.be.bignumber.greaterThan(ether('0'));
        });
  
        it('transfer funds to the token to only the creator when reserve meet directly', async () => {
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.1')});
          await this.auction.setNowOverride('12');
  
          const platformFeeTracker = await balance.tracker(platformFeeAddress);
          const minterTracker = await balance.tracker(minter);
  
          // Result it successfully
          await this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
          // Platform gets 12%
          const platformChanges = await platformFeeTracker.delta('wei');
          expect(platformChanges).to.be.bignumber.equal('0');
  
          // Remaining funds sent to designer on completion
          const changes = await minterTracker.delta('wei');
          expect(changes).to.be.bignumber.greaterThan(ether('0'));
        });
  
        it('records primary sale price on garment NFT', async () => {
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.4')});
          await this.auction.setNowOverride('12');
  
          // Result it successfully
          await this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
        });
  
      });
  
    });
  
    describe('cancelAuction()', async () => {
  
      beforeEach(async () => {
        await this.token.mint(minter, randomTokenURI, {from: minter});
        await this.auction.setNowOverride('2');
        await this.auction.createAuction(
            this.token.address, 
          TOKEN_ONE_ID,
          '1',
          '0',
          '10',
          {from: minter}
        );
      });
  
      describe('validation', async () => {
  
        it('cannot cancel if not an admin', async () => {
          await expectRevert(
            this.auction.cancelAuction(this.token.address, TOKEN_ONE_ID, {from: bidder}),
            'FantomAuction.cancelAuction: Sender must be item owner'
          );
        });
  
        it('cannot cancel if auction already cancelled', async () => {
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
          await this.auction.setNowOverride('12');
  
          await this.auction.cancelAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
          await expectRevert(
            this.auction.cancelAuction(this.token.address, TOKEN_ONE_ID, {from: minter}),
            'FantomAuction.cancelAuction: Sender must be item owner'
          );
        });
  
        it('cannot cancel if auction already resulted', async () => {
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
          await this.auction.setNowOverride('12');
  
          await this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
          await expectRevert(
            this.auction.cancelAuction(this.token.address, TOKEN_ONE_ID, {from: minter}),
            'FantomAuction.cancelAuction: Sender must be item owner'
          );
        });
  
        it('Cancel clears down auctions and top bidder', async () => {
          // Stick a bid on it
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
  
          // Cancel it
          await this.auction.cancelAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
          // Check auction cleaned up
          const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(this.token.address, TOKEN_ONE_ID);
          expect(_reservePrice).to.be.bignumber.equal('0');
          expect(_startTime).to.be.bignumber.equal('0');
          expect(_endTime).to.be.bignumber.equal('0');
          expect(_resulted).to.be.equal(false);
  
          // Check auction cleaned up
          const {_bidder, _bid} = await this.auction.getHighestBidder(this.token.address, TOKEN_ONE_ID);
          expect(_bid).to.be.bignumber.equal('0');
          expect(_bidder).to.equal(constants.ZERO_ADDRESS);
        });
  
        it('funds are sent back to the highest bidder if found', async () => {
          // Stick a bid on it
          await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
  
          const bidderTracker = await balance.tracker(bidder);
  
          //cancel it
          await this.auction.cancelAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
          // Funds sent back
          const changes = await bidderTracker.delta('wei');
          expect(changes).to.be.bignumber.equal(ether('0.2'));
        });
  
        it('no funds transferred if no bids', async () => {
          //cancel it
          await this.auction.cancelAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
        });
      });
  
    });
  
    describe('create, cancel and re-create an auction', async () => {
  
      beforeEach(async () => {
        await this.token.mint(minter, randomTokenURI, {from: minter});
        await this.auction.setNowOverride('2');
        await this.auction.createAuction(
          this.token.address, 
          TOKEN_ONE_ID, // ID
          '1',  // reserve
          '1', // start
          '10', // end
          {from: minter}
        );
      });
  
      it('once created and then cancelled, can be created and resulted properly', async () => {
  
        // Stick a bid on it
        await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
  
        const bidderTracker = await balance.tracker(bidder);
  
        // Cancel it
        await this.auction.cancelAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
  
        // Funds sent back to bidder
        const changes = await bidderTracker.delta('wei');
        expect(changes).to.be.bignumber.equal(ether('0.2'));
  
        // Check auction cleaned up
        const {_reservePrice, _startTime, _endTime, _resulted} = await this.auction.getAuction(this.token.address, TOKEN_ONE_ID);
        expect(_reservePrice).to.be.bignumber.equal('0');
        expect(_startTime).to.be.bignumber.equal('0');
        expect(_endTime).to.be.bignumber.equal('0');
        expect(_resulted).to.be.equal(false);
  
        // Crate new one
        await this.auction.createAuction(
          this.token.address,
          TOKEN_ONE_ID, // ID
          '1',  // reserve
          '1', // start
          '10', // end
          {from: minter}
        );
  
        // Check auction newly setup
        const {
          _reservePrice: newReservePrice,
          _startTime: newStartTime,
          _endTime: newEndTime,
          _resulted: newResulted
        } = await this.auction.getAuction(this.token.address, TOKEN_ONE_ID);
        expect(newReservePrice).to.be.bignumber.equal('1');
        expect(newStartTime).to.be.bignumber.equal('1');
        expect(newEndTime).to.be.bignumber.equal('10');
        expect(newResulted).to.be.equal(false);
  
        // Stick a bid on it
        await this.auction.placeBid(this.token.address, TOKEN_ONE_ID, {from: bidder, value: ether('0.2')});
  
        await this.auction.setNowOverride('12');
  
        // Result it
        const {receipt} = await this.auction.resultAuction(this.token.address, TOKEN_ONE_ID, {from: minter});
        await expectEvent(receipt, 'AuctionResulted', {
          nftAddress: this.token.address,
          tokenId: TOKEN_ONE_ID,
          winner: bidder,
          winningBid: ether('0.2')
        });
      });
  
    });
  
    describe('reclaimERC20()', async () => {
      describe('validation', async () => {
        it('cannot reclaim erc20 if it is not Admin', async () => {
          await expectRevert(
              this.auction.reclaimERC20(this.mockToken.address, {from: bidder}),
              'Ownable: caller is not the owner'
          );
        });
  
        it('can reclaim Erc20', async () => {
          // Send some wrapped eth
          await this.mockToken.transfer(this.auction.address, TWENTY_TOKENS, { from: minter });
  
          const adminBalanceBeforeReclaim = await this.mockToken.balanceOf(admin);
          expect(await this.mockToken.balanceOf(this.auction.address)).to.be.bignumber.equal(TWENTY_TOKENS);
  
          // Reclaim erc20 from contract
          await this.auction.reclaimERC20(this.mockToken.address, {from: admin});
  
          expect(await this.mockToken.balanceOf(this.auction.address)).to.be.bignumber.equal(new BN('0'));
  
          // Admin receives eth minus gas fees.
          expect(await this.mockToken.balanceOf(admin)).to.be.bignumber.greaterThan(adminBalanceBeforeReclaim);
        });
      });
    });
  
    async function getGasCosts(receipt) {
      const tx = await web3.eth.getTransaction(receipt.tx);
      const gasPrice = new BN(tx.gasPrice);
      return gasPrice.mul(new BN(receipt.receipt.gasUsed));
    }
  });
  