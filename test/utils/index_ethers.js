const { BigNumber } = require("ethers");

// Set global variables
const ZERO = new BigNumber.from("0");
const ONE = new BigNumber.from("1");
const TWO = new BigNumber.from("2");
const THREE = new BigNumber.from("3");
const FOUR = new BigNumber.from("4");
const FIVE = new BigNumber.from("5");
const SIX = new BigNumber.from("6");
const SEVEN = new BigNumber.from("7");
const EIGHT = new BigNumber.from("8");
const NINE = new BigNumber.from("9");

// Set MockERC20 variables
const mockPayTokenName = "Fantom";
const mockPayTokenSymbol = "FTM";
const mockPayTokenMintAmount = new BigNumber.from("2000000000000000000000"); // Sets test accounts to 2000 FTM

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
