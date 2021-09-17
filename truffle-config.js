module.exports = {
    networks: {
      development: {
        host: "127.0.0.1",
        port: 7545,
        //port: 8545,
        network_id: "*", // Match any network id,
      },      
      ganache: {
        host: "127.0.0.1",
        //port: 7545,
        port: 8545,
        network_id: "*", // Match any network id,
      },
    },
    contracts_directory: './contracts/',
    contracts_build_directory: './artifacts/',
    compilers: {
      solc: {
        version: "0.6.12",
        optimizer: {
          enabled: true,
          runs: 200
          //runs: 1
        }
      }
    }
  }