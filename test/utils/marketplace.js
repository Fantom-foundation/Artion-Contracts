const {
  expectRevert,
  expectEvent,
  BN,
  ether,
  constants,
  balance,
  send,
} = require("@openzeppelin/test-helpers");

const PLATFORM_FEE = "2";
const MARKETPLACE_PLATFORM_FEE = "50"; // 5%
const MINT_FEE = "1";

const platformFee = ether(PLATFORM_FEE);
const marketPlatformFee = new BN(MARKETPLACE_PLATFORM_FEE);
const mintFee = ether(MINT_FEE);

module.exports = {
  platformFee,
  marketPlatformFee,
  mintFee,
};
