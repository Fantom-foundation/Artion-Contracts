// npx hardhat test .\test\HardhatOverAll.test.js --network localhost; run first in another shell: npx hardhat node
const {
  expectRevert,
  expectEvent,
  BN,
  ether,
  constants,
  balance,
  send,
} = require("@openzeppelin/test-helpers");

const { expect } = require("chai");

const FantomAddressRegistry = artifacts.require("FantomAddressRegistry");
const Artion = artifacts.require("Artion");
const FantomAuction = artifacts.require("MockFantomAuction");
const FantomMarketplace = artifacts.require("MockFantomMarketplace");
const FantomBundleMarketplace = artifacts.require("FantomBundleMarketplace");
const FantomNFTFactory = artifacts.require("FantomNFTFactory");
const FantomArtFactory = artifacts.require("FantomArtFactory");
const FantomTokenRegistry = artifacts.require("FantomTokenRegistry");
const FantomPriceFeed = artifacts.require("FantomPriceFeed");
const MockERC20 = artifacts.require("MockERC20");

const PLATFORM_FEE = "2";
const MARKETPLACE_PLATFORM_FEE = "50"; // 5%
const MINT_FEE = "1";

const weiToEther = (n) => {
  return web3.utils.fromWei(n.toString(), "ether");
};

contract("Overall Test", function([
  owner,
  platformFeeRecipient,
  artist,
  buyer,
  bidder1,
  bidder2,
  bidder3,
  hacker,
]) {
  const platformFee = ether(PLATFORM_FEE);
  const marketPlatformFee = new BN(MARKETPLACE_PLATFORM_FEE);
  const mintFee = ether(MINT_FEE);

  beforeEach(async function() {
    this.fantomAddressRegistry = await FantomAddressRegistry.new();
    this.artion = await Artion.new(platformFeeRecipient, platformFee);

    this.fantomAuction = await FantomAuction.new();
    await this.fantomAuction.initialize(platformFeeRecipient);
    await this.fantomAuction.updateAddressRegistry(
      this.fantomAddressRegistry.address
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

    this.fantomNFTFactory = await FantomNFTFactory.new(
      this.fantomAuction.address,
      this.fantomMarketplace.address,
      this.fantomBundleMarketplace.address,
      mintFee,
      platformFeeRecipient,
      platformFee
    );
    this.fantomTokenRegistry = await FantomTokenRegistry.new();

    this.mockERC20 = await MockERC20.new("wFTM", "wFTM", ether("1000000"));

    this.fantomTokenRegistry.add(this.mockERC20.address);

    this.fantomPriceFeed = await FantomPriceFeed.new(
      this.fantomAddressRegistry.address,
      this.mockERC20.address
    );

    this.fantomArtFactory = await FantomArtFactory.new(
      this.fantomMarketplace.address,
      this.fantomBundleMarketplace.address,
      mintFee,
      platformFeeRecipient,
      platformFee
    );

    await this.fantomAddressRegistry.updateArtion(this.artion.address);
    await this.fantomAddressRegistry.updateAuction(this.fantomAuction.address);
    await this.fantomAddressRegistry.updateMarketplace(
      this.fantomMarketplace.address
    );
    await this.fantomAddressRegistry.updateBundleMarketplace(
      this.fantomBundleMarketplace.address
    );
    await this.fantomAddressRegistry.updateNFTFactory(
      this.fantomNFTFactory.address
    );
    await this.fantomAddressRegistry.updateTokenRegistry(
      this.fantomTokenRegistry.address
    );
    await this.fantomAddressRegistry.updatePriceFeed(
      this.fantomPriceFeed.address
    );
    await this.fantomAddressRegistry.updateArtFactory(
      this.fantomArtFactory.address
    );
  });

  describe("Minting and auctioning NFT", function() {
    it("Scenario 1", async function() {
      console.log(`
            Scenario 1:
            An artist mints an NFT for him/herself
            He/She then put it on the marketplace with price of 20 wFTMs
            A buyer then buys that NFT
            `);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of platform fee recipient after minting: ${weiToEther(
              balance4
            )}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTM as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTM as the platform fee is ${PLATFORM_FEE} FTM `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the market`);
      await this.artion.setApprovalForAll(
        this.fantomMarketplace.address,
        true,
        { from: artist }
      );

      console.log(`
            Let's mock that the current time: 2021-09-21 10:00:00`);
      await this.fantomMarketplace.setTime(new BN("1632218400"));

      console.log(`
            The artist lists the nft in the market with price 20 wFTM and 
            start time 2021-09-22 10:00:00 GMT`);
      result = await this.fantomMarketplace.listItem(
        this.artion.address,
        new BN("1"),
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632304800"), // 2021-09-22 10:00:00 GMT
        { from: artist }
      );

      console.log(`
            *Event ItemListed should be emitted with correct values:
            owner: ${artist},
            nft: ${this.artion.address},
            tokenId: 1,
            quantity: 1,
            payToken:  ${this.mockERC20.address},
            pricePerItem: ${ether("20")},
            startingTime: 1632304800`);
      expectEvent.inLogs(result.logs, "ItemListed", {
        owner: artist,
        nft: this.artion.address,
        tokenId: new BN("1"),
        quantity: new BN("1"),
        payToken: this.mockERC20.address,
        pricePerItem: ether("20"),
        startingTime: new BN("1632304800"),
      });

      let listing = await this.fantomMarketplace.listings(
        this.artion.address,
        new BN("1"),
        artist
      );
      console.log(`
            *The nft should be on the marketplace listing`);
      expect(listing.quantity.toString()).to.be.equal("1");
      expect(listing.payToken).to.be.equal(this.mockERC20.address);
      expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(20);
      expect(listing.startingTime.toString()).to.be.equal("1632304800");

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomMarketplace.setTime(new BN("1632560400"));

      console.log(`
            Mint 50 wFTMs to buyer so he can buy the nft`);
      await this.mockERC20.mint(buyer, ether("50"));

      console.log(`
            Buyer approves FantomMarketplace to transfer up to 50 wFTM`);
      await this.mockERC20.approve(
        this.fantomMarketplace.address,
        ether("50"),
        { from: buyer }
      );

      console.log(`
            Buyer buys the nft for 20 wFTMs`);
      result = await this.fantomMarketplace.buyItem(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        artist,
        { from: buyer }
      );

      console.log(`
            *Event ItemSold should be emitted with correct values: 
            seller = ${artist}, 
            buyer = ${buyer}, 
            nft = ${this.artion.address},
            tokenId = 1,
            quantity =1,
            payToken = ${this.mockERC20.address},
            unitPrice = 20,
            pricePerItem = 20`);
      expectEvent.inLogs(result.logs, "ItemSold", {
        seller: artist,
        buyer: buyer,
        nft: this.artion.address,
        tokenId: new BN("1"),
        quantity: new BN("1"),
        payToken: this.mockERC20.address,
        unitPrice: ether("0"),
        pricePerItem: ether("20"),
      });

      balance = await this.mockERC20.balanceOf(buyer);
      console.log(`
            *The wFTM balance of buyer now should be 30 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(30);

      let nftOwner = await this.artion.ownerOf(new BN("1"));
      console.log(`
            The owner of the nft now should be the buyer`);
      expect(nftOwner).to.be.equal(buyer);

      balance = await this.mockERC20.balanceOf(artist);
      console.log(`
            *The wFTM balance of the artist should be 19 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(19);

      listing = await this.fantomMarketplace.listings(
        this.artion.address,
        new BN("1"),
        artist
      );
      console.log(`
            *The nft now should be removed from the listing`);
      expect(listing.quantity.toString()).to.be.equal("0");
      expect(listing.payToken).to.be.equal(constants.ZERO_ADDRESS);
      expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(0);
      expect(listing.startingTime.toString()).to.be.equal("0");

      console.log("");
    });

    it("Scenario 2", async function() {
      console.log(`
            Scenario 2:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1, bidder2, bidder3 then bid the auction with 20 wFTMs, 25 wFTMs, and 30 wFTMs respectively`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder1, ether("50"));

      console.log(`
            Bidder1 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder1,
      });

      console.log(`
            Mint 50 wFTMs to bidder2 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder2, ether("50"));

      console.log(`
            Bidder2 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder2,
      });

      console.log(`
            Mint 50 wFTMs to bidder3 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder3, ether("50"));

      console.log(`
            Bidder3 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder3,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 10:30:00`);
      await this.fantomAuction.setTime(new BN("1632565800"));

      console.log(`
            Bidder1 place a bid of 20 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("20"),
        { from: bidder1 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidding should be 30 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(30);

      console.log(`
            Bidder2 place a bid of 25 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("25"),
        { from: bidder2 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidder2 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidding should be 25`);
      expect(weiToEther(balance) * 1).to.be.equal(25);

      console.log(`
            Bidder3 place a bid of 30 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("30"),
        { from: bidder3 }
      );

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidder3 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder3);
      console.log(`
            *Bidder3's wFTM balance after bidding should be 20`);
      expect(weiToEther(balance) * 1).to.be.equal(20);

      console.log(`
            Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
      await this.fantomAuction.setTime(new BN("1632999600"));

      console.log(`
            The artist tries to make the auction complete`);
      result = await this.fantomAuction.resultAuction(
        this.artion.address,
        new BN("1"),
        { from: artist }
      );

      console.log(`
            *As the platformFee is 2.5%, the platform fee recipient should get 2.5% of (30 - 20) which is 0.25 wFTM.`);
      balance = await this.mockERC20.balanceOf(platformFeeRecipient);
      expect(weiToEther(balance) * 1).to.be.equal(0.25);

      console.log(`
            *The artist should get 29.75 wFTM.`);
      balance = await this.mockERC20.balanceOf(artist);
      expect(weiToEther(balance) * 1).to.be.equal(29.75);

      let nftOwner = await this.artion.ownerOf(new BN("1"));
      console.log(`
            *The owner of the nft now should be the bidder3`);
      expect(nftOwner).to.be.equal(bidder3);

      console.log(`
            *Event AuctionResulted should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1,
            winner = ${bidder3} ,
            payToken = ${this.mockERC20.address},
            unitPrice = 0,
            winningBid = 30`);
      expectEvent.inLogs(result.logs, "AuctionResulted", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        winner: bidder3,
        payToken: this.mockERC20.address,
        unitPrice: ether("0"),
        winningBid: ether("30"),
      });

      console.log("");
    });

    it("Scenario 3", async function() {
      console.log(`
            Scenario 3:
            An artist mints two NFTs from him/herself
            He/She then put them on the marketplace as bundle price of 20 wFTMs
            A buyer then buys them for 20 wFTMs`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting the first NFT...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            NFT1 minted successfully`);

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            Now minting the second NFT...`);
      result = await this.artion.mint(artist, "http://artist.com/art2.jpeg", {
        from: artist,
        value: ether(PLATFORM_FEE),
      });
      console.log(`
            NFT2 minted successfully`);

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 2, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art2.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("2"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art2.jpeg",
        minter: artist,
      });

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${2 *
              PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 2);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 2 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE *
              2} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 2
      );

      console.log(`
            The artist approves the nft to the market`);
      await this.artion.setApprovalForAll(
        this.fantomBundleMarketplace.address,
        true,
        { from: artist }
      );

      console.log(`
            The artist lists the 2 nfts in the bundle market with price 20 wFTM and 
            start time 2021-09-22 10:00:00 GMT`);
      await this.fantomBundleMarketplace.listItem(
        "mynfts",
        [this.artion.address, this.artion.address],
        [new BN("1"), new BN("2")],
        [new BN("1"), new BN("1")],
        this.mockERC20.address,
        ether("20"),
        new BN("1632304800"), // 2021-09-22 10:00:00 GMT
        { from: artist }
      );

      let listing = await this.fantomBundleMarketplace.getListing(
        artist,
        "mynfts"
      );
      //console.log(listing);
      console.log(`
            *The nfts should be on the bundle marketplace listing`);
      expect(listing.nfts.length).to.be.equal(2);
      expect(listing.nfts[0]).to.be.equal(this.artion.address);
      expect(listing.nfts[1]).to.be.equal(this.artion.address);
      expect(listing.tokenIds[0].toString()).to.be.equal("1");
      expect(listing.tokenIds[1].toString()).to.be.equal("2");
      expect(listing.quantities[0].toString()).to.be.equal("1");
      expect(listing.quantities[1].toString()).to.be.equal("1");
      //expect(listing.payToken).to.be.equal(this.mockERC20.address);
      expect(weiToEther(listing.price) * 1).to.be.equal(20);
      expect(listing.startingTime.toString()).to.be.equal("1632304800");

      console.log(`
            Mint 50 wFTMs to buyer so he can buy the two nfts`);
      await this.mockERC20.mint(buyer, ether("50"));

      console.log(`
            The buyer approves FantomBundleMarketplace to transfer up to 50 wFTM`);
      await this.mockERC20.approve(
        this.fantomBundleMarketplace.address,
        ether("50"),
        { from: buyer }
      );

      console.log(`
            The buyer buys the nfts for 20 wFTMs`);
      result = await this.fantomBundleMarketplace.buyItem(
        "mynfts",
        this.mockERC20.address,
        { from: buyer }
      );

      console.log(`
            *Event ItemSold should be emitted with correct values: 
            seller = ${artist}, 
            buyer = ${buyer}, 
            bundleId = ${"mynfts"},
            payToken = ${this.mockERC20.address},
            unitPrice = ${ether("0")},
            price = ${ether("20")}`);
      expectEvent.inLogs(result.logs, "ItemSold", {
        seller: artist,
        buyer: buyer,
        bundleID: "mynfts",
        payToken: this.mockERC20.address,
        unitPrice: ether("0"),
        price: ether("20"),
      });

      console.log(`
            *The two nfts now should belong to buyer`);
      let nftOwner = await this.artion.ownerOf(new BN("1"));
      expect(nftOwner).to.be.equal(buyer);
      nftOwner = await this.artion.ownerOf(new BN("2"));
      expect(nftOwner).to.be.equal(buyer);

      console.log(`
            *The artist's wFTM balance now should be 19 wTFM`);
      balance = await this.mockERC20.balanceOf(artist);
      expect(weiToEther(balance) * 1).to.be.equal(19);

      console.log(`
            *The platform fee recipient's wFTM balance now should be 1 wTFM`);
      balance = await this.mockERC20.balanceOf(platformFeeRecipient);
      expect(weiToEther(balance) * 1).to.be.equal(1);

      console.log("");
    });

    it("Scenario 4", async function() {
      console.log(`
            Scenario 4:
            An artist mints an NFT for him/herself
            He/She then put it on the marketplace with price of 20 wFTMs
            A buyer then buys that NFT
            `);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTM as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTM as the platform fee is ${PLATFORM_FEE} FTM `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            *The artist doesn't approve the nft to the market yet this it should be reverted with 'item not approved'
            when he/she tries to list the nft`);
      await expectRevert(
        this.fantomMarketplace.listItem(
          this.artion.address,
          new BN("1"),
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632304800"), // 2021-09-22 10:00:00 GMT
          { from: artist }
        ),
        "item not approved"
      );

      console.log("");
    });

    it("Scenario 5", async function() {
      console.log(`
            Scenario 5:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            But he/she forgets to approve the nft to the auction contract
            so when he/she tries to create the action, it will be reverted`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            *The artist forgets to approve the nft to the auction so he/she will fail to create an auction`);
      //await this.artion.setApprovalForAll(this.fantomAuction.address, true, {from: artist});

      await expectRevert(
        this.fantomAuction.createAuction(
          this.artion.address,
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632564000"), //2021-09-25 10:00:00
          false,
          new BN("1632996000"), //2021-09-30 10:00:00
          { from: artist }
        ),
        `not owner and or contract not approved`
      );

      console.log("");
    });

    it("Scenario 6", async function() {
      console.log(`
            Scenario 3:
            An artist mints two NFTs from him/herself
            He/She then put them on the marketplace as bundle price of 20 wFTMs
            But he/she forgets to approve the nfts to the bundle marketplace
            so he/she fails to list the nfts`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting the first NFT...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            NFT1 minted successfully`);

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            Now minting the second NFT...`);
      result = await this.artion.mint(artist, "http://artist.com/art2.jpeg", {
        from: artist,
        value: ether(PLATFORM_FEE),
      });
      console.log(`
            NFT2 minted successfully`);

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 2, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art2.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("2"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art2.jpeg",
        minter: artist,
      });

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${2 *
              PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 2);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 2 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE *
              2} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 2
      );

      console.log(`
            *The artist forgets to approve the nfts to the bundle market so he/she will fail to list the nfts
            with 'not owner and or contract not approved'`);
      //await this.artion.setApprovalForAll(this.fantomBundleMarketplace.address, true, {from: artist});

      await expectRevert(
        this.fantomBundleMarketplace.listItem(
          "mynfts",
          [this.artion.address, this.artion.address],
          [new BN("1"), new BN("2")],
          [new BN("1"), new BN("1")],
          this.mockERC20.address,
          ether("20"),
          new BN("1632304800"), // 2021-09-22 10:00:00 GMT
          { from: artist }
        ),
        "item not approved"
      );

      console.log("");
    });

    it("Scenario 7", async function() {
      console.log(`
            Scenario 7:
            An artist mints an NFT for him/herself
            He/She then put it on the marketplace with price of 20 wFTM2s
            But because wFTM2 is not a valid pay token, so he/she will fail with 'invalid pay token'
            `);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTM as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTM as the platform fee is ${PLATFORM_FEE} FTM `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the market`);
      await this.artion.setApprovalForAll(
        this.fantomMarketplace.address,
        true,
        { from: artist }
      );

      this.mockERC20_2 = await MockERC20.new(
        "wFTM2",
        "wFTM2",
        ether("1000000")
      );

      console.log(`
            *The artist lists the nft in the market with price 20 wFTM2 and 
            start time 2021-09-22 10:00:00 GMT but the listing will fail with 'invalid pay token' 
            as the token is not registered`);
      await expectRevert(
        this.fantomMarketplace.listItem(
          this.artion.address,
          new BN("1"),
          new BN("1"),
          this.mockERC20_2.address,
          ether("20"),
          new BN("1632304800"), // 2021-09-22 10:00:00 GMT
          { from: artist }
        ),
        "invalid pay token"
      );

      console.log("");
    });

    it("Scenario 8", async function() {
      console.log(`
            Scenario 8:
            An artist mints an NFT from him/herself
            The contract owner pauses the auction
            The artist then tries to put the nft on an auction with reserve price of 20 wFTMs
            but it will fail with 'xxx'`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The contract owner pauses the acution`);
      result = await this.fantomAuction.toggleIsPaused({ from: owner });

      console.log(`
            *PauseToggled event should be emitted with true value`);

      expectEvent.inLogs(result.logs, "PauseToggled", {
        isPaused: true,
      });

      console.log(`
            *The artist tries to auction his/her nfts with reserve price of 20 wFTMs
            but it will fail with 'contract paused'`);
      await expectRevert(
        this.fantomAuction.createAuction(
          this.artion.address,
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632564000"), //2021-09-25 10:00:00
          false,
          new BN("1632996000"), //2021-09-30 10:00:00
          { from: artist }
        ),
        "contract paused"
      );

      console.log("");
    });

    it("Scenario 9", async function() {
      console.log(`
            Scenario 9:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            A hacker tries to cancel the auction but he/she will fail with 'sender must be the owner'`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            *A hacker tries to cancel the auction but he/she will fail with 'sender must be owner'`);

      expectRevert(
        this.fantomAuction.cancelAuction(this.artion.address, new BN("1"), {
          from: hacker,
        }),
        "sender must be owner"
      );

      console.log("");
    });

    it("Scenario 10", async function() {
      console.log(`
            Scenario 10:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs but the start time is in the past
            so the auction creation will fail with 'invalid start time'`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            *The artist auctions his nfts with reserve price of 20 wFTMs but the start time is in the past
            so the auction creation will fail with 'invalid start time'`);
      await expectRevert(
        this.fantomAuction.createAuction(
          this.artion.address,
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632477600"), //2021-09-24 10:00:00
          false,
          new BN("1632996000"), //2021-09-30 10:00:00
          { from: artist }
        ),
        "invalid start time"
      );

      console.log("");
    });

    it("Scenario 11", async function() {
      console.log(`
            Scenario 11:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs but the end time is earlier
            than the start time so the auction creation will fail 
            with 'end time must be greater than start (by 5 minutes)'`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            *The artist auctions his nfts with reserve price of 20 wFTMs but the end time is
            earlier than the start time so the auction creation will 
            fail with 'end time must be greater than start (by 5 minutes)' `);
      await expectRevert(
        this.fantomAuction.createAuction(
          this.artion.address,
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632650400"), //2021-09-26 10:00:00
          false,
          new BN("1632564000"), //2021-09-25 10:00:00
          { from: artist }
        ),
        "end time must be greater than start (by 5 minutes)"
      );

      console.log("");
    });

    it("Scenario 12", async function() {
      console.log(`
            Scenario 12:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs but the end time is only 3 minutes after
            the start time so the auction creation will fail with 'end time must be greater than start (by 5 minutes)'`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            *The artist auctions his nfts with reserve price of 20 wFTMs but the end time is
            earlier than the start time so the auction 
            creation will fail with 'end time must be greater than start (by 5 minutes)' `);
      await expectRevert(
        this.fantomAuction.createAuction(
          this.artion.address,
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632650400"), //2021-09-26 10:00:00
          false,
          new BN("1632650580"), //2021-09-26 10:03:00
          { from: artist }
        ),
        "end time must be greater than start (by 5 minutes)"
      );

      console.log("");
    });

    it("Scenario 13", async function() {
      console.log(`
            Scenario 13:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            He/She then tries to put the same nft again and 
            this attempt will fail with 'auction already started'`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            *The artist tries to auction his nfts with reserve price of 20 wFTMs but
            this will fail with 'auction already started'`);
      await expectRevert(
        this.fantomAuction.createAuction(
          this.artion.address,
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632564000"), //2021-09-25 10:00:00
          false,
          new BN("1632996000"), //2021-09-30 10:00:00
          { from: artist }
        ),
        "auction already started"
      );

      console.log("");
    });

    it("Scenario 14", async function() {
      console.log(`
            Scenario 14:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1 then bids the auction with 20 wFTMs but the auction hasn't started yet
            so it will fail with 'bidding outside of the auction window' `);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder1, ether("50"));

      console.log(`
            Bidder1 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder1,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:30:00`);
      await this.fantomAuction.setTime(new BN("1632562200"));

      console.log(`
            *Bidder1 place a bid of 20 wFTMs but it will fail with 'bidding outside of the auction window'
            as the auction will only start 30 minutes later.`);
      await expectRevert(
        this.fantomAuction.placeBid(
          this.artion.address,
          new BN("1"),
          ether("20"),
          { from: bidder1 }
        ),
        "bidding outside of the auction window"
      );

      console.log("");
    });

    it("Scenario 15", async function() {
      console.log(`
            Scenario 15:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1, then bids the auction with 19 wFTMs thus it will fail 
            with 'bid cannot be lower than reserve price' as it's below the reserve price`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder1, ether("50"));

      console.log(`
            Bidder1 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder1,
      });

      console.log(`
            Mint 50 wFTMs to bidder2 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder2, ether("50"));

      console.log(`
            Bidder2 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder2,
      });

      console.log(`
            Mint 50 wFTMs to bidder3 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder3, ether("50"));

      console.log(`
            Bidder3 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder3,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 10:30:00`);
      await this.fantomAuction.setTime(new BN("1632565800"));

      console.log(`
            *Bidder1 place a bid of 19 wFTMs which will fail with 'bid cannot be lower than reserve price'`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("19"),
        { from: bidder1 }
      );

      console.log("");
    });

    it("Scenario 16", async function() {
      console.log(`
            Scenario 16:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1 bids with 25 wFTMs then bidder2 then bid with 22 wFTMs, which will fail
            with 'failed to outbid highest bidder'`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder1, ether("50"));

      console.log(`
            Bidder1 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder1,
      });

      console.log(`
            Mint 50 wFTMs to bidder2 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder2, ether("50"));

      console.log(`
            Bidder2 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder2,
      });

      console.log(`
            Mint 50 wFTMs to bidder3 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder3, ether("50"));

      console.log(`
            Bidder3 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder3,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 10:30:00`);
      await this.fantomAuction.setTime(new BN("1632565800"));

      console.log(`
            Bidder1 place a bid of 25 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("25"),
        { from: bidder1 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidding should be 25 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(25);

      console.log(`
            Bidder2 place a bid of 23 wFTMs`);
      await expectRevert(
        this.fantomAuction.placeBid(
          this.artion.address,
          new BN("1"),
          ether("23"),
          { from: bidder2 }
        ),
        "failed to outbid highest bidder"
      );

      console.log("");
    });

    it("Scenario 17", async function() {
      console.log(`
            Scenario 17:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1, bidder2, bidder3 then bid the auction with 20 wFTMs, 25 wFTMs, and 30 wFTMs respectively
            Then bidder3 withdraws the bid after more than 12 hours after the auction ended`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder1, ether("50"));

      console.log(`
            Bidder1 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder1,
      });

      console.log(`
            Mint 50 wFTMs to bidder2 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder2, ether("50"));

      console.log(`
            Bidder2 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder2,
      });

      console.log(`
            Mint 50 wFTMs to bidder3 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder3, ether("50"));

      console.log(`
            Bidder3 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder3,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 10:30:00`);
      await this.fantomAuction.setTime(new BN("1632565800"));

      console.log(`
            Bidder1 place a bid of 20 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("20"),
        { from: bidder1 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidding should be 30 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(30);

      console.log(`
            Bidder2 place a bid of 25 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("25"),
        { from: bidder2 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidder2 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidding should be 25`);
      expect(weiToEther(balance) * 1).to.be.equal(25);

      console.log(`
            Bidder3 place a bid of 30 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("30"),
        { from: bidder3 }
      );

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidder3 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder3);
      console.log(`
            *Bidder3's wFTM balance after bidding should be 20`);
      expect(weiToEther(balance) * 1).to.be.equal(20);

      console.log(`
            Let's mock that the current time: 2021-09-30 23:00:00 which is more than 12 hours after the auction ended`);
      await this.fantomAuction.setTime(new BN("1633042800"));

      console.log(`
            Bidder3 then witwdraws his/her bidding`);
      result = await this.fantomAuction.withdrawBid(
        this.artion.address,
        new BN("1"),
        { from: bidder3 }
      );

      console.log(`
            *Event BidRefunded should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            bidder = ${bidder3},
            bid = 30`);
      expectEvent.inLogs(result.logs, "BidRefunded", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        bidder: bidder3,
        bid: ether("30"),
      });

      console.log(`
            *Event BidWithdrawn also should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            bidder = ${bidder3},
            bid = 30`);
      expectEvent.inLogs(result.logs, "BidWithdrawn", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        bidder: bidder3,
        bid: ether("30"),
      });

      balance = await this.mockERC20.balanceOf(bidder3);
      console.log(`
            *Bidder3's wFTM balance after withdrawing should be back to 50`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      console.log("");
    });

    it("Scenario 18", async function() {
      console.log(`
            Scenario 18:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1, bidder2, bidder3 then bid the auction with 20 wFTMs, 25 wFTMs, and 30 wFTMs respectively
            After the auction ended and has been resulted, bidder3 tries to withdraw
            This will fail with 'you are not the highest bidder' `); //note I think the withdrawBid function should first check if the auction still exist or not IE 27/10/2021

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder1, ether("50"));

      console.log(`
            Bidder1 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder1,
      });

      console.log(`
            Mint 50 wFTMs to bidder2 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder2, ether("50"));

      console.log(`
            Bidder2 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder2,
      });

      console.log(`
            Mint 50 wFTMs to bidder3 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder3, ether("50"));

      console.log(`
            Bidder3 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder3,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 10:30:00`);
      await this.fantomAuction.setTime(new BN("1632565800"));

      console.log(`
            Bidder1 place a bid of 20 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("20"),
        { from: bidder1 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidding should be 30 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(30);

      console.log(`
            Bidder2 place a bid of 25 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("25"),
        { from: bidder2 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidder2 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidding should be 25`);
      expect(weiToEther(balance) * 1).to.be.equal(25);

      console.log(`
            Bidder3 place a bid of 30 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("30"),
        { from: bidder3 }
      );

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidder3 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder3);
      console.log(`
            *Bidder3's wFTM balance after bidding should be 20`);
      expect(weiToEther(balance) * 1).to.be.equal(20);

      console.log(`
            Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
      await this.fantomAuction.setTime(new BN("1632999600"));

      console.log(`
            The artist tries to make the auction complete`);
      result = await this.fantomAuction.resultAuction(
        this.artion.address,
        new BN("1"),
        { from: artist }
      );

      console.log(`
            *As the platformFee is 2.5%, the platform fee recipient should get 2.5% of (30 - 20) which is 0.25 wFTM.`);
      balance = await this.mockERC20.balanceOf(platformFeeRecipient);
      expect(weiToEther(balance) * 1).to.be.equal(0.25);

      console.log(`
            *The artist should get 29.75 wFTM.`);
      balance = await this.mockERC20.balanceOf(artist);
      expect(weiToEther(balance) * 1).to.be.equal(29.75);

      let nftOwner = await this.artion.ownerOf(new BN("1"));
      console.log(`
            *The owner of the nft now should be the bidder3`);
      expect(nftOwner).to.be.equal(bidder3);

      console.log(`
            *Event AuctionResulted should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1,
            winner = ${bidder3} ,
            payToken = ${this.mockERC20.address},
            unitPrice = 0,
            winningBid = 30`);
      expectEvent.inLogs(result.logs, "AuctionResulted", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        winner: bidder3,
        payToken: this.mockERC20.address,
        unitPrice: ether("0"),
        winningBid: ether("30"),
      });

      console.log(`
            *Bidder3 then tries to witwdraw his/her bidding but he/she will fail
            with 'you are not the highest bidder'`);
      await expectRevert(
        this.fantomAuction.withdrawBid(this.artion.address, new BN("1"), {
          from: bidder3,
        }),
        "you are not the highest bidder"
      );
      //note I think the withdrawBid function should first check if the auction still exist or not IE 27/10/2021

      console.log("");
    });

    it("Scenario 19", async function() {
      console.log(`
            Scenario 19:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1, bidder2, bidder3 then bid the auction with 20 wFTMs, 25 wFTMs, and 30 wFTMs 
            respectively bidder3 only approve 25 wFTMs thus his/her bidding will fail with ''`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder1, ether("50"));

      console.log(`
            Bidder1 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder1,
      });

      console.log(`
            Mint 50 wFTMs to bidder2 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder2, ether("50"));

      console.log(`
            Bidder2 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder2,
      });

      console.log(`
            Mint 50 wFTMs to bidder3 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder3, ether("50"));

      console.log(`
            Bidder3 approves FantomAuction to transfer up to 25 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("25"), {
        from: bidder3,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 10:30:00`);
      await this.fantomAuction.setTime(new BN("1632565800"));

      console.log(`
            Bidder1 place a bid of 20 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("20"),
        { from: bidder1 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidding should be 30 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(30);

      console.log(`
            Bidder2 place a bid of 25 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("25"),
        { from: bidder2 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidder2 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidding should be 25`);
      expect(weiToEther(balance) * 1).to.be.equal(25);

      console.log(`
            *Bidder3 place a bid of 30 wFTMs but his/her bid will fail 
            with 'ERC20: transfer amount exceeds allowance' as he/she only approved 25 wFTMs`);
      await expectRevert(
        this.fantomAuction.placeBid(
          this.artion.address,
          new BN("1"),
          ether("30"),
          { from: bidder3 }
        ),
        "ERC20: transfer amount exceeds allowance"
      );

      console.log("");
    });

    it("Scenario 20", async function() {
      console.log(`
            Scenario 20:
            An artist mints an NFT from him/herself
            A hacker tries to put the NFT on an auction with reserve price of 20 wFTMs
            but this will fail with 'not owner and or contract not approved'`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            *A hacker tries to auction the artist's nft with reserve price of 20 wFTMs
            but the auction will fail with 'not owner and or contract not approved'`);
      await expectRevert(
        this.fantomAuction.createAuction(
          this.artion.address,
          new BN("1"),
          this.mockERC20.address,
          ether("20"),
          new BN("1632564000"), //2021-09-25 10:00:00
          false,
          new BN("1632996000"), //2021-09-30 10:00:00
          { from: hacker }
        ),
        "not owner and or contract not approved"
      );

      console.log("");
    });

    it("Scenario 21", async function() {
      console.log(`
            Scenario 21:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Bidder1, bidder2, bidder3 then bid the auction with 20 wFTMs, 25 wFTMs, and 30 wFTMs respectively
            A hacker tries to result the auction but he/she will fail with 'sender must be item owner' `);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Mint 50 wFTMs to bidder1 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder1, ether("50"));

      console.log(`
            Bidder1 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder1,
      });

      console.log(`
            Mint 50 wFTMs to bidder2 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder2, ether("50"));

      console.log(`
            Bidder2 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder2,
      });

      console.log(`
            Mint 50 wFTMs to bidder3 so he can bid the auctioned nft`);
      await this.mockERC20.mint(bidder3, ether("50"));

      console.log(`
            Bidder3 approves FantomAuction to transfer up to 50 wFTM`);
      await this.mockERC20.approve(this.fantomAuction.address, ether("50"), {
        from: bidder3,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 10:30:00`);
      await this.fantomAuction.setTime(new BN("1632565800"));

      console.log(`
            Bidder1 place a bid of 20 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("20"),
        { from: bidder1 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidding should be 30 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(30);

      console.log(`
            Bidder2 place a bid of 25 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("25"),
        { from: bidder2 }
      );

      balance = await this.mockERC20.balanceOf(bidder1);
      console.log(`
            *Bidder1's wFTM balance after bidder2 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidding should be 25`);
      expect(weiToEther(balance) * 1).to.be.equal(25);

      console.log(`
            Bidder3 place a bid of 30 wFTMs`);
      await this.fantomAuction.placeBid(
        this.artion.address,
        new BN("1"),
        ether("30"),
        { from: bidder3 }
      );

      balance = await this.mockERC20.balanceOf(bidder2);
      console.log(`
            *Bidder2's wFTM balance after bidder3 outbid should be back to 50 wFTMs`);
      expect(weiToEther(balance) * 1).to.be.equal(50);

      balance = await this.mockERC20.balanceOf(bidder3);
      console.log(`
            *Bidder3's wFTM balance after bidding should be 20`);
      expect(weiToEther(balance) * 1).to.be.equal(20);

      console.log(`
            Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
      await this.fantomAuction.setTime(new BN("1632999600"));

      console.log(`
            A hacker tries to result the auction but he/she will fail with 'sender must be item owner'`);
      await expectRevert(
        this.fantomAuction.resultAuction(this.artion.address, new BN("1"), {
          from: hacker,
        }),
        "sender must be item owner"
      );

      console.log("");
    });

    it("Scenario 22", async function() {
      console.log(`
            Scenario 22:
            An artist mints an NFT from him/herself
            He/She then put it on an auction with reserve price of 20 wFTMs
            Nobody bids until the auction ends
            The artist tries to result the auction but he/she will fail with 'no open bids'
            But then he/she successfully cancels the auction`);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of recipient after minting: ${weiToEther(balance4)}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTMs as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTMs as the platform fee is ${PLATFORM_FEE} FTMs `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the auction`);
      await this.artion.setApprovalForAll(this.fantomAuction.address, true, {
        from: artist,
      });

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomAuction.setTime(new BN("1632560400"));

      console.log(`
            The artist auctions his nfts with reserve price of 20 wFTMs`);
      result = await this.fantomAuction.createAuction(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632564000"), //2021-09-25 10:00:00
        false,
        new BN("1632996000"), //2021-09-30 10:00:00
        { from: artist }
      );

      console.log(`
            *Event AuctionCreated should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1, 
            payToken = ${this.mockERC20.address}`);
      expectEvent.inLogs(result.logs, "AuctionCreated", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
        payToken: this.mockERC20.address,
      });

      console.log(`
            Let's mock that the current time: 2021-09-30 11:00:00 so the auction has ended`);
      await this.fantomAuction.setTime(new BN("1632999600"));

      console.log(`
            *The artist tries to make the auction complete but she/will fail with 'no open bids'
            as nobody bids`);
      await expectRevert(
        this.fantomAuction.resultAuction(this.artion.address, new BN("1"), {
          from: artist,
        }),
        "no open bids"
      );

      console.log(`
            He/she then cancels the auction`);

      result = await this.fantomAuction.cancelAuction(
        this.artion.address,
        new BN("1"),
        { from: artist }
      );

      console.log(`
            *Event AuctionCancelled should be emitted with correct values: 
            nftAddress = ${this.artion.address}, 
            tokenId = 1`);
      expectEvent.inLogs(result.logs, "AuctionCancelled", {
        nftAddress: this.artion.address,
        tokenId: new BN("1"),
      });

      console.log("");
    });

    it("Scenario 23", async function() {
      console.log(`
            Scenario 23:
            An artist mints an NFT for him/herself
            He/She then put it on the marketplace with price of 20 wFTMs
            But he/she then cancels it
            `);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of platform fee recipient after minting: ${weiToEther(
              balance4
            )}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTM as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTM as the platform fee is ${PLATFORM_FEE} FTM `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the market`);
      await this.artion.setApprovalForAll(
        this.fantomMarketplace.address,
        true,
        { from: artist }
      );

      console.log(`
            The artist lists the nft in the market with price 20 wFTM and 
            start time 2021-09-22 10:00:00 GMT`);
      result = await this.fantomMarketplace.listItem(
        this.artion.address,
        new BN("1"),
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632304800"), // 2021-09-22 10:00:00 GMT
        { from: artist }
      );

      console.log(`
            *Event ItemListed should be emitted with correct values:
            owner: ${artist},
            nft: ${this.artion.address},
            tokenId: 1,
            quantity: 1,
            payToken:  ${this.mockERC20.address},
            pricePerItem: ${ether("20")},
            startingTime: 1632304800`);
      expectEvent.inLogs(result.logs, "ItemListed", {
        owner: artist,
        nft: this.artion.address,
        tokenId: new BN("1"),
        quantity: new BN("1"),
        payToken: this.mockERC20.address,
        pricePerItem: ether("20"),
        startingTime: new BN("1632304800"),
      });

      let listing = await this.fantomMarketplace.listings(
        this.artion.address,
        new BN("1"),
        artist
      );
      console.log(`
            *The nft should be on the marketplace listing`);
      expect(listing.quantity.toString()).to.be.equal("1");
      expect(listing.payToken).to.be.equal(this.mockERC20.address);
      expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(20);
      expect(listing.startingTime.toString()).to.be.equal("1632304800");

      console.log(`
            The artist cancels the listing`);
      result = await this.fantomMarketplace.cancelListing(
        this.artion.address,
        new BN("1"),
        { from: artist }
      );
      console.log(`
            *Event ItemCanceled should be emitted with correct values:
            owner: ${artist},
            nft: ${this.artion.address},
            tokenId: 1`);
      expectEvent.inLogs(result.logs, "ItemCanceled", {
        owner: artist,
        nft: this.artion.address,
        tokenId: new BN("1"),
      });

      console.log("");
    });

    it("Scenario 24", async function() {
      console.log(`
            Scenario 24:
            An artist mints an NFT for him/herself
            He/She then put it on the marketplace with price of 20 wFTMs
            A hacker tries to cancel the listing but he will fail with 'not listed item'
            `);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of platform fee recipient after minting: ${weiToEther(
              balance4
            )}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTM as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTM as the platform fee is ${PLATFORM_FEE} FTM `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the market`);
      await this.artion.setApprovalForAll(
        this.fantomMarketplace.address,
        true,
        { from: artist }
      );

      console.log(`
            The artist lists the nft in the market with price 20 wFTM and 
            start time 2021-09-22 10:00:00 GMT`);
      result = await this.fantomMarketplace.listItem(
        this.artion.address,
        new BN("1"),
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632304800"), // 2021-09-22 10:00:00 GMT
        { from: artist }
      );

      console.log(`
            *Event ItemListed should be emitted with correct values:
            owner: ${artist},
            nft: ${this.artion.address},
            tokenId: 1,
            quantity: 1,
            payToken:  ${this.mockERC20.address},
            pricePerItem: ${ether("20")},
            startingTime: 1632304800`);
      expectEvent.inLogs(result.logs, "ItemListed", {
        owner: artist,
        nft: this.artion.address,
        tokenId: new BN("1"),
        quantity: new BN("1"),
        payToken: this.mockERC20.address,
        pricePerItem: ether("20"),
        startingTime: new BN("1632304800"),
      });

      let listing = await this.fantomMarketplace.listings(
        this.artion.address,
        new BN("1"),
        artist
      );
      console.log(`
            *The nft should be on the marketplace listing`);
      expect(listing.quantity.toString()).to.be.equal("1");
      expect(listing.payToken).to.be.equal(this.mockERC20.address);
      expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(20);
      expect(listing.startingTime.toString()).to.be.equal("1632304800");

      console.log(`
            A hacker tries to cancel the listing but he/she will fail with 'not listed item'`);
      await expectRevert(
        this.fantomMarketplace.cancelListing(this.artion.address, new BN("1"), {
          from: hacker,
        }),
        "not listed item"
      );

      console.log("");
    });

    it("Scenario 25", async function() {
      console.log(`
            Scenario 25:
            An artist mints an NFT for him/herself
            He/She then put it on the marketplace with price of 20 wFTMs
            A potential buyer then make an offer for that NFT for a price of 19 wFTMs
            The artist then accepts the offer.
            `);

      let balance = await this.artion.platformFee();
      console.log(`
            Platform Fee: ${weiToEther(balance)}`);

      let balance1 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist before minting: ${weiToEther(balance1)}`);

      let balance2 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of the fee recipient before minting: ${weiToEther(
              balance2
            )}`);

      console.log(`
            Now minting...`);
      let result = await this.artion.mint(
        artist,
        "http://artist.com/art.jpeg",
        { from: artist, value: ether(PLATFORM_FEE) }
      );
      console.log(`
            Minted successfully`);

      let balance3 = await web3.eth.getBalance(artist);
      console.log(`
            FTM balance of artist after minting: ${weiToEther(balance3)}`);

      let balance4 = await web3.eth.getBalance(platformFeeRecipient);
      console.log(`
            FTM balance of platform fee recipient after minting: ${weiToEther(
              balance4
            )}`);

      console.log(`
            *The difference of the artist's FTM balance should be more than ${PLATFORM_FEE} FTM as 
            the platform fee is ${PLATFORM_FEE} FTM and minting costs some gases
            but should be less than ${PLATFORM_FEE +
              1} FTM as the gas fees shouldn't be more than 1 FTM`);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.greaterThan(PLATFORM_FEE * 1);
      expect(
        weiToEther(balance1) * 1 - weiToEther(balance3) * 1
      ).to.be.lessThan(PLATFORM_FEE * 1 + 1);

      console.log(`
            *The difference of the recipients's FTM balance should be ${PLATFORM_FEE} FTM as the platform fee is ${PLATFORM_FEE} FTM `);
      expect(weiToEther(balance4) * 1 - weiToEther(balance2) * 1).to.be.equal(
        PLATFORM_FEE * 1
      );

      console.log(`
            *Event Minted should be emitted with correct values: 
            tokenId = 1, 
            beneficiary = ${artist}, 
            tokenUri = ${"http://artist.com/art.jpeg"},
            minter = ${artist}`);
      expectEvent.inLogs(result.logs, "Minted", {
        tokenId: new BN("1"),
        beneficiary: artist,
        tokenUri: "http://artist.com/art.jpeg",
        minter: artist,
      });

      console.log(`
            The artist approves the nft to the market`);
      await this.artion.setApprovalForAll(
        this.fantomMarketplace.address,
        true,
        { from: artist }
      );

      console.log(`
            Let's mock that the current time: 2021-09-21 10:00:00`);
      await this.fantomMarketplace.setTime(new BN("1632218400"));

      console.log(`
            The artist lists the nft in the market with price 20 wFTM and 
            start time 2021-09-22 10:00:00 GMT`);
      result = await this.fantomMarketplace.listItem(
        this.artion.address,
        new BN("1"),
        new BN("1"),
        this.mockERC20.address,
        ether("20"),
        new BN("1632304800"), // 2021-09-22 10:00:00 GMT
        { from: artist }
      );

      console.log(`
            *Event ItemListed should be emitted with correct values:
            owner: ${artist},
            nft: ${this.artion.address},
            tokenId: 1,
            quantity: 1,
            payToken:  ${this.mockERC20.address},
            pricePerItem: ${ether("20")},
            startingTime: 1632304800`);
      expectEvent.inLogs(result.logs, "ItemListed", {
        owner: artist,
        nft: this.artion.address,
        tokenId: new BN("1"),
        quantity: new BN("1"),
        payToken: this.mockERC20.address,
        pricePerItem: ether("20"),
        startingTime: new BN("1632304800"),
      });

      let listing = await this.fantomMarketplace.listings(
        this.artion.address,
        new BN("1"),
        artist
      );
      console.log(`
            *The nft should be on the marketplace listing`);
      expect(listing.quantity.toString()).to.be.equal("1");
      expect(listing.payToken).to.be.equal(this.mockERC20.address);
      expect(weiToEther(listing.pricePerItem) * 1).to.be.equal(20);
      expect(listing.startingTime.toString()).to.be.equal("1632304800");

      console.log(`
            Let's mock that the current time: 2021-09-25 09:00:00`);
      await this.fantomMarketplace.setTime(new BN("1632560400"));

      console.log(`
            Mint 50 wFTMs to buyer so he can buy the nft`);
      await this.mockERC20.mint(buyer, ether("50"));

      console.log(`
            Buyer approves FantomMarketplace to transfer up to 50 wFTM`);
      await this.mockERC20.approve(
        this.fantomMarketplace.address,
        ether("50"),
        { from: buyer }
      );

      console.log(`
            A potential buyer makes an offer for the NFT for 19 wFTMs which 
            expires on 2021-09-30 10:00:00 GMT`);
      result = await this.fantomMarketplace.createOffer(
        this.artion.address,
        new BN("1"),
        this.mockERC20.address,
        new BN("1"),
        ether("19"),
        new BN("1632996000"),
        { from: buyer }
      );

      console.log(`
            *Event OfferCreated should be emitted with correct values:
            creator: ${buyer},
            nft: ${this.artion.address},
            tokenId: 1,
            quantity: 1,
            payToken: ${this.mockERC20.address},
            pricePerItem: ${ether("19")},
            deadline: 1632996000
            `);

      expectEvent.inLogs(result.logs, "OfferCreated", {
        creator: buyer,
        nft: this.artion.address,
        tokenId: new BN("1"),
        quantity: new BN("1"),
        payToken: this.mockERC20.address,
        pricePerItem: ether("19"),
        deadline: new BN("1632996000"),
      });

      console.log(`
            The artist accepts the offer`);

      result = await this.fantomMarketplace.acceptOffer(
        this.artion.address,
        new BN("1"),
        buyer,
        { from: artist }
      );

      console.log(`
            *Event ItemSold should be emitted with correct values:
            seller:${artist}
            buyer: ${buyer},
            nft: ${this.artion.address},
            tokenId: ${this.mockERC20.address},
            quantity: 1,
            unitPrice: ${ether("0")},
            pricePerItem: ${ether("19")}
      `);

      expectEvent.inLogs(result.logs, "ItemSold", {
        seller: artist,
        buyer: buyer,
        nft: this.artion.address,
        tokenId: new BN("1"),
        quantity: new BN("1"),
        payToken: this.mockERC20.address,
        unitPrice: ether("0"),
        pricePerItem: ether("19"),
      });

      console.log(`
            *Event OfferCanceled also should be emitted with correct values:
            creator: ${buyer},
            nft: ${this.artion.address},
            tokenId: 1
      `);

      expectEvent.inLogs(result.logs, "OfferCanceled", {
        creator: buyer,
        nft: this.artion.address,
        tokenId: new BN("1"),
      });

      console.log(`
            The wFTM balance of the artist now should be 18.05`);
      balance = await this.mockERC20.balanceOf(artist);
      expect(balance.toString()).to.be.equal(ether("18.05").toString());

      console.log(`
            The wFTM balance of the buyer now should be 31`);
      balance = await this.mockERC20.balanceOf(buyer);
      expect(balance.toString()).to.be.equal(ether("31").toString());

      console.log("");
    });
  });
});
