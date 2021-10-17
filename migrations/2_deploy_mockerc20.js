// migrations/3_deploy_mockerc20.js
const MockERC20 = artifacts.require('MockERC20');

module.exports = async function (deployer) {
  await deployer.deploy(MockERC20, "Fantom Test Token", "FTM", 0);
};