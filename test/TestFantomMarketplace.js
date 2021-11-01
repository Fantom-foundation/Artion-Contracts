// npx hardhat test .\test\TestFantomMarketplace.js --network localhost; run first in another shell: npx hardhat node
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

const {
  ZERO,
  ONE,
  FOUR,
  FIVE,
  mockPayTokenName,
  mockPayTokenSymbol,
  mockPayTokenMintAmount,
  mockNFTokenName,
  mockNFTokenSymbol,
} = require("./utils/index.js");

const {
  platformFee,
  marketPlatformFee,
  mintFee,
} = require("./utils/marketplace");

const FantomMarketplace = artifacts.require("MockFantomMarketplace");
//const FantomArtion = artifacts.require("Artion");
const FantomAddressRegistry = artifacts.require("FantomAddressRegistry");
const FantomTokenRegistry = artifacts.require("FantomTokenRegistry");
const MockERC20 = artifacts.require("MockERC20");
const MockERC721 = artifacts.require("MockERC721");

contract("FantomMarketplace test", function([
  owner,
  platformFeeRecipient,
  artist,
  buyer,
  hacker,
]) {
  before(async function() {
    this.mockERC20 = await MockERC20.new(
      mockPayTokenName,
      mockPayTokenSymbol,
      ZERO
    );

    this.fantomAddressRegistry = await FantomAddressRegistry.new();

    //this.artion = await FantomArtion.new(platformFeeRecipient, platformFee);
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

    this.fantomTokenRegistry = await FantomTokenRegistry.new();
    this.fantomTokenRegistry.add(this.mockERC20.address);

    await this.fantomAddressRegistry.updateTokenRegistry(
      this.fantomTokenRegistry.address
    );
  });

  describe("Minting and listing an NFT", function() {
    it(`An artist mints an NFT then lists it on the marketplace 
          with price of 20 wFTM`, async function() {
      //An artist mints an NFT
      await this.mockERC721.mint(artist, { from: artist });

      //The artist approves the marketplace
      await this.mockERC721.setApprovalForAll(
        this.fantomMarketplace.address,
        true,
        {
          from: artist,
        }
      );

      //Let's mock that the current time: 2021-09-21 10:00:00`);
      await this.fantomMarketplace.setTime(new BN("1632218400"));

      //The artist lists the nft on the marketplace with price 20 wFTM and and start time 2021-09-22 10:00:00 GMT`);
      let result = await this.fantomMarketplace.listItem(
        this.mockERC721.address,
        ZERO,
        ONE,
        this.mockERC20.address,
        ether("20"),
        new BN("1632304800"), // 2021-09-22 10:00:00 GMT
        { from: artist }
      );
    });
  });
});
