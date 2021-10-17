// migrations/4_deploy_mockerc721.js
const MockERC721 = artifacts.require('MockERC721');

module.exports = async function (deployer) {
  await deployer.deploy(MockERC721, "Fantom Test NFToken", "FTMNFT");
};