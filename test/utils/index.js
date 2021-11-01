const { BN, ether } = require("@openzeppelin/test-helpers");

// Set global variables
const ZERO = new BN("0");
const ONE = new BN("1");
const TWO = new BN("2");
const THREE = new BN("3");
const FOUR = new BN("4");
const FIVE = new BN("5");
const SIX = new BN("6");
const SEVEN = new BN("7");
const EIGHT = new BN("8");
const NINE = new BN("9");

// Set MockERC20 variables
const mockPayTokenName = "Fantom";
const mockPayTokenSymbol = "FTM";
const mockPayTokenMintAmount = ether("2000"); // Sets test accounts to 2000 FTM

// Set MockERC721 variables
const mockNFTokenName = "Test NFT";
const mockNFTokenSymbol = "NFT";

module.exports = {
  ZERO,
  ONE,
  TWO,
  THREE,
  FOUR,
  FIVE,
  SIX,
  SEVEN,
  EIGHT,
  NINE,
  mockPayTokenName,
  mockPayTokenSymbol,
  mockPayTokenMintAmount,
  mockNFTokenName,
  mockNFTokenSymbol,
};
