const { ether } = require('@openzeppelin/test-helpers');

// Set user `seller` variables for `FantomAuction`
const sellerReservePrice = ether('100');
const sellerNewReservePrice = ether('50'); // 50 FTM

// Set user `seller` variables for `FantomAuction`
const bidderBidAmountMinimum = ether('25'); // 25 FTM

module.exports = {
  sellerReservePrice,
  sellerNewReservePrice,
  bidderBidAmountMinimum
};
