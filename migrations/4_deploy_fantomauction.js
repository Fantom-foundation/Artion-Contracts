// migrations/2_deploy_fantomauction.js
const FantomAuction = artifacts.require('FantomAuction');

module.exports = async function (deployer) {
  await deployer.deploy(FantomAuction);
};