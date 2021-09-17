const Artion = artifacts.require('Artion');
const {
    TREASURY_ADDRESS,
  } = require('./constants');

module.exports = async function(deployer){
    await deployer.deploy(Artion, TREASURY_ADDRESS, '2000000000000000000');
    const artion = await Artion.deployed();
    //console.log(artion.address);
}