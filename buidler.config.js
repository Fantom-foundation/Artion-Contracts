require('dotenv').config()
usePlugin('@nomiclabs/buidler-waffle')
usePlugin('@nomiclabs/buidler-truffle5')
usePlugin("@nomiclabs/buidler-etherscan")
usePlugin('buidler-gas-reporter')
usePlugin('solidity-coverage')
usePlugin('@nomiclabs/buidler-solhint')
usePlugin('buidler-contract-sizer')

const PRIVATE_KEY = process.env.PRIVATE_KEY
const RPC_URI = process.env.RPC_URI

module.exports = {
  solc: {
    version: '0.6.12',
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
  gasReporter: {
    currency: 'USD',
    enabled: false,
    gasPrice: 50,
  },
  networks: {
    mainnet: {
      url: `https://rpcapi.fantom.network`,
      chainId: 250,
      accounts: [`0x${PRIVATE_KEY}`]
    },
    testnet: {
      url: `https://rpc.testnet.fantom.network`,
      chainId: 4002,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    coverage: {
      url: 'http://localhost:8555',
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_APIKEY,
  },
}
