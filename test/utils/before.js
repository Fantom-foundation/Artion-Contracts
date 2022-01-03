// This part of the test is used to set-up the basic environment for testing the `FantomAuction`
// smart contract. This will be run before each individual test as part of the `before()` function

const { 
  ethers
} = require('hardhat');

const {
  ONE, mockPayTokenMintAmount,
} = require('./index_ethers.js');

async function callBefore() {
  [owner, bidder, seller, winner, hacker, other, royaltyMigrationManager] = await ethers.getSigners();
  // Mint MockERC20 tokens to users in the unit test
  await mockerc20.connect(owner).mintPay(owner.address, mockPayTokenMintAmount);
  await mockerc20.connect(owner).mintPay(bidder.address, mockPayTokenMintAmount);
  await mockerc20.connect(owner).mintPay(seller.address, mockPayTokenMintAmount);
  await mockerc20.connect(owner).mintPay(winner.address, mockPayTokenMintAmount);
  await mockerc20.connect(owner).mintPay(other.address, mockPayTokenMintAmount);

  // Approve the FantomAuction contract to transfer MockERC20 tokens
  await mockerc20.connect(owner).approve(fantomauction.address, mockPayTokenMintAmount);
  await mockerc20.connect(bidder).approve(fantomauction.address, mockPayTokenMintAmount);
  await mockerc20.connect(seller).approve(fantomauction.address, mockPayTokenMintAmount);
  await mockerc20.connect(winner).approve(fantomauction.address, mockPayTokenMintAmount);
  await mockerc20.connect(other).approve(fantomauction.address, mockPayTokenMintAmount);
  await mockerc20.connect(hacker).approve(fantomauction.address, mockPayTokenMintAmount);

  // Mints MockERC721 tokens to users
  await mockerc721.connect(owner).mint(owner.address);
  await mockerc721.connect(owner).mint(seller.address);
  await mockerc721.connect(owner).mint(seller.address);
  await mockerc721.connect(owner).mint(seller.address);
  await mockerc721.connect(owner).mint(seller.address);
  await mockerc721.connect(owner).mint(seller.address);
  await mockerc721.connect(owner).mint(other.address);
  await mockerc721.connect(owner).mint(other.address);
  await mockerc721.connect(owner).mint(other.address);
  await mockerc721.connect(owner).mint(other.address);

  // Sets approvals for FantomAuction to transfer MockERC721 tokens
  await mockerc721.connect(owner).setApprovalForAll(fantomauction.address, true);
  await mockerc721.connect(bidder).setApprovalForAll(fantomauction.address, true);
  await mockerc721.connect(seller).setApprovalForAll(fantomauction.address, true);
  await mockerc721.connect(winner).setApprovalForAll(fantomauction.address, true);
  await mockerc721.connect(other).setApprovalForAll(fantomauction.address, true);
  await mockerc721.connect(hacker).setApprovalForAll(fantomauction.address, true);

  // Initializes `FantomAuction`, `FantomBundleMarketplace`, and `FantomMarketplace`
  await fantomauction.connect(owner).initialize(owner.address);
  await fantombundlemarketplace.connect(owner).initialize(owner.address, ONE);
  await fantommarketplace.connect(owner).initialize(owner.address, ONE);

  // Updates all addresses in/for `FantomAddressRegistry`
  await fantomaddressregistry.connect(owner).updateArtion(fantomartion.address);
  await fantomaddressregistry.connect(owner).updateAuction(fantomauction.address);
  await fantomaddressregistry.connect(owner).updateMarketplace(fantommarketplace.address);
  await fantomaddressregistry.connect(owner).updateBundleMarketplace(fantombundlemarketplace.address);
  await fantomaddressregistry.connect(owner).updateTokenRegistry(fantomtokenregistry.address);
  await fantomaddressregistry.connect(owner).updateRoyaltyRegistry(fantomRoyaltyRegistry.address);
  await fantomauction.connect(owner).updateAddressRegistry(fantomaddressregistry.address);
  await fantommarketplace.connect(owner).updateAddressRegistry(fantomaddressregistry.address);
  await fantombundlemarketplace.connect(owner).updateAddressRegistry(fantomaddressregistry.address);

  // Adds the MockERC20 token to the `FantomTokenRegistry`
  await fantomtokenregistry.connect(owner).add(mockerc20.address);

  await fantomRoyaltyRegistry.connect(owner).updateMigrationManager(
    royaltyMigrationManager.address
  );
}

module.exports = {
  callBefore
};