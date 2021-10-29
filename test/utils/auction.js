const { BigNumber } = require('ethers');

// Set user `seller` variables for `FantomAuction`
const sellerReservePrice = new BigNumber.from('100000000000000000000'); // 100 FTM
const sellerNewReservePrice = new BigNumber.from('50000000000000000000'); // 50 FTM

// Set user `seller` variables for `FantomAuction`
const bidderBidAmountMinimum = new BigNumber.from('25000000000000000000'); // 25 FTM

module.exports = {
  sellerReservePrice,
  sellerNewReservePrice,
  bidderBidAmountMinimum
};
