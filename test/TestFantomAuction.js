const hre = require("hardhat");
const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { solidity } = require("ethereum-waffle");
const { expect } = require("chai").use(solidity);
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const MockERC20 = artifacts.require("MockERC20");
const MockERC721 = artifacts.require("MockERC721");
const FantomAuction = artifacts.require("FantomAuction");
const FantomArtion = artifacts.require("Artion");
const FantomMarketplace = artifacts.require("FantomMarketplace");
const FantomBundleMarketplace = artifacts.require("FantomBundleMarketplace");
const FantomAddressRegistry = artifacts.require("FantomAddressRegistry");
const FantomTokenRegistry = artifacts.require("FantomTokenRegistry");

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

const {} = require("./utils/auction.js");

contract("FantomAuction", function(accounts) {
  let owner, bidder, seller, winner, hacker, other;

  before(async function() {
    [owner, bidder, seller, winner, hacker, other] = accounts;
    this.mockERC20 = await MockERC20.new(
      mockPayTokenName,
      mockPayTokenSymbol,
      ZERO
    );
    this.mockERC721 = await MockERC721.new(mockNFTokenName, mockNFTokenSymbol);

    this.fantomAuction = await FantomAuction.new();
    this.fantomArtion = await FantomArtion.new(owner, ONE);
    this.fantomMarketplace = await FantomMarketplace.new();
    this.fantomBundleMarketplace = await FantomBundleMarketplace.new();
    this.fantomAddressRegistry = await FantomAddressRegistry.new();
    this.fantomTokenRegistry = await FantomTokenRegistry.new();

    await this.mockERC20.mintPay(owner, mockPayTokenMintAmount, {
      from: owner,
    });
    await this.mockERC20.mintPay(bidder, mockPayTokenMintAmount, {
      from: owner,
    });
    await this.mockERC20.mintPay(seller, mockPayTokenMintAmount, {
      from: owner,
    });
    await this.mockERC20.mintPay(winner, mockPayTokenMintAmount, {
      from: owner,
    });
    await this.mockERC20.mintPay(other, mockPayTokenMintAmount, {
      from: owner,
    });

    await this.mockERC20.approve(
      this.fantomAuction.address,
      mockPayTokenMintAmount,
      {
        from: owner,
      }
    );
    await this.mockERC20.approve(
      this.fantomAuction.address,
      mockPayTokenMintAmount,
      { from: bidder }
    );
    await this.mockERC20.approve(
      this.fantomAuction.address,
      mockPayTokenMintAmount,
      { from: seller }
    );
    await this.mockERC20.approve(
      this.fantomAuction.address,
      mockPayTokenMintAmount,
      { from: winner }
    );
    await this.mockERC20.approve(
      this.fantomAuction.address,
      mockPayTokenMintAmount,
      { from: other }
    );
    await this.mockERC20.approve(
      this.fantomAuction.address,
      mockPayTokenMintAmount,
      { from: hacker }
    );

    await this.mockERC721.mint(owner, { from: owner });
    await this.mockERC721.mint(seller, { from: owner });
    await this.mockERC721.mint(other, { from: owner });

    await this.mockERC721.setApprovalForAll(this.fantomAuction.address, true, {
      from: owner,
    });

    await this.mockERC721.setApprovalForAll(this.fantomAuction.address, true, {
      from: bidder,
    });

    await this.mockERC721.setApprovalForAll(this.fantomAuction.address, true, {
      from: seller,
    });

    await this.mockERC721.setApprovalForAll(this.fantomAuction.address, true, {
      from: winner,
    });

    await this.mockERC721.setApprovalForAll(this.fantomAuction.address, true, {
      from: other,
    });

    await this.mockERC721.setApprovalForAll(this.fantomAuction.address, true, {
      from: hacker,
    });
  });

  //   // Do this after each unit test
  //   afterEach(async function () {
  //     const timeNow = new BigNumber.from(Number(await time.latest()));
  //     fantomAuction.connect(owner).hardhatTimestamp(timeNow);
  //   });

  // Test case **ID: A0**:: Set and check if owner is correctly initialized
  it("`owner` returns the initialized owner", async function() {
    // Call `initialize()`  and store owner address
    await this.fantomAuction.initialize(owner, { from: owner });

    // Test if the owner is properly reflected upon calling `initialize()`
    expect(
      (await this.fantomAuction.owner({ from: owner })).toString()
    ).to.equal(owner);
  });

  //   // Test case **ID: A1**:: Check if non-owners can pause the auction contract
  //   it('should not pause auction contract if not `owner`', async function () {
  //     // Test if non-owners can pause the auction contract upon calling `toggleIsPaused()`

  //     await expectRevert(
  //       this.fantomAuction.toggleIsPaused({ from: other }),
  //       'Ownable: caller is not the owner'
  //     );
  //   });

  // Test case **ID: A2**:: Set and check address registry
  it("`FantomAuction` address registry set to `FantomAddressRegistry`", async function() {
    await this.fantomAuction.updateAddressRegistry(
      this.fantomAddressRegistry.address,
      { from: owner }
    );
    expect(
      (await this.fantomAuction.addressRegistry({ from: owner })).toString()
    ).to.equal(this.fantomAddressRegistry.address);
  });
});
