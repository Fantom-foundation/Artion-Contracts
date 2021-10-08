// to deploy locally
// run: npx hardhat node on a terminal
// then run: npx hardhat run --network localhost scripts/12_deploy_all.js
async function main(network) {

    console.log('network: ', network.name);

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log('Deploying nft with address:', deployerAddress);
  
    const { TREASURY_ADDRESS, PLATFORM_FEE, WRAPPED_FTM_MAINNET, WRAPPED_FTM_TESTNET } = require('./constants');
  
    ////////////
    const Artion = await ethers.getContractFactory('Artion');
    const artion = await Artion.deploy(TREASURY_ADDRESS, '2000000000000000000');
  
    await artion.deployed();  
    console.log('FantomArtion deployed at', artion.address);
    ///////////

    //////////
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const proxyAdmin = await ProxyAdmin.deploy();
    await proxyAdmin.deployed();

    const PROXY_ADDRESS = proxyAdmin.address;

    console.log('ProxyAdmin deployed to:', proxyAdmin.address);

    const AdminUpgradeabilityProxyFactory = await ethers.getContractFactory('AdminUpgradeabilityProxy');
    //////////

    /////////
    const Marketplace = await ethers.getContractFactory('FantomMarketplace');
    const marketplaceImpl = await Marketplace.deploy();
    await marketplaceImpl.deployed();

    console.log('FantomMarketplace deployed to:', marketplaceImpl.address);
    
    const marketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
        marketplaceImpl.address,
        PROXY_ADDRESS,
        []
    );
    await marketplaceProxy.deployed();
    console.log('Marketplace Proxy deployed at ', marketplaceProxy.address);
    const MARKETPLACE = marketplaceProxy.address;
    const marketplace = await ethers.getContractAt('FantomMarketplace', marketplaceProxy.address);


    const OfferMarketplace = await ethers.getContractFactory('FantomOfferMarketplace');
    const offerMarketplaceImpl = await OfferMarketplace.deploy();
    await offerMarketplaceImpl.deployed();

    console.log('FantomOfferMarketplace deployed to:', offerMarketplaceImpl.address);

    const offerMarketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
        offerMarketplaceImpl.address,
        PROXY_ADDRESS,
        []
    );
    await offerMarketplaceProxy.deployed();
    console.log('OfferMarketplace Proxy deployed at ', offerMarketplaceProxy.address);
    const OFFERMARKETPLACE = offerMarketplaceProxy.address;
    const offerMarketplace = await ethers.getContractAt('FantomOfferMarketplace', offerMarketplaceProxy.address);


    const ListingMarketplace = await ethers.getContractFactory('FantomListingMarketplace');
    const listingMarketplaceImpl = await ListingMarketplace.deploy();
    await listingMarketplaceImpl.deployed();

    console.log('FantomListingMarketplace deployed to:', listingMarketplaceImpl.address);

    const listingMarketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
        listingMarketplaceImpl.address,
        PROXY_ADDRESS,
        []
    );
    await listingMarketplaceProxy.deployed();
    console.log('ListingMarketplace Proxy deployed at ', offerMarketplaceProxy.address);
    const LISTINGMARKETPLACE = listingMarketplaceProxy.address;
    const listingMarketplace = await ethers.getContractAt('FantomListingMarketplace', listingMarketplaceProxy.address);

  
    await marketplace.initialize(TREASURY_ADDRESS, PLATFORM_FEE, offerMarketplace.address, listingMarketplace.address);
    console.log('Marketplace Proxy initialized');

    await offerMarketplace.initialize(marketplace.address, listingMarketplace.address);
    console.log('OfferMarketplace Proxy initialized');

    await listingMarketplace.initialize(marketplace.address, offerMarketplace.address);
    console.log('ListingMarketplace Proxy initialized');
    /////////

    /////////
    const BundleMarketplace = await ethers.getContractFactory(
        'FantomBundleMarketplace'
      );
    const bundleMarketplaceImpl = await BundleMarketplace.deploy();
    await bundleMarketplaceImpl.deployed();
    console.log('FantomBundleMarketplace deployed to:', bundleMarketplaceImpl.address);
    
    const bundleMarketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
        bundleMarketplaceImpl.address,
        PROXY_ADDRESS,
        []
      );
    await bundleMarketplaceProxy.deployed();
    console.log('Bundle Marketplace Proxy deployed at ', bundleMarketplaceProxy.address);  
    const BUNDLE_MARKETPLACE = bundleMarketplaceProxy.address;
    const bundleMarketplace = await ethers.getContractAt('FantomBundleMarketplace', bundleMarketplaceProxy.address);

    const OfferBundleMarketplace = await ethers.getContractFactory(
        'FantomOfferBundleMarketplace'
      );
    const offerBundleMarketplaceImpl = await OfferBundleMarketplace.deploy();
    await offerBundleMarketplaceImpl.deployed();
    console.log('FantomOfferBundleMarketplace deployed to:', offerBundleMarketplaceImpl.address);
    const offerBundleMarketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
        offerBundleMarketplaceImpl.address,
        PROXY_ADDRESS,
        []
      );
    await offerBundleMarketplaceProxy.deployed();
    console.log('OfferBundle Marketplace Proxy deployed at ', offerBundleMarketplaceProxy.address);
    const OFFERBUNDLE_MARKETPLACE = offerMarketplaceProxy.address;
    const offerBundleMarketplace = await ethers.getContractAt('FantomOfferBundleMarketplace', offerBundleMarketplaceProxy.address);

    const ListingBundleMarketplace = await ethers.getContractFactory(
        'FantomListingBundleMarketplace'
      );
    const listingBundleMarketplaceImpl = await ListingBundleMarketplace.deploy();
    await listingBundleMarketplaceImpl.deployed();
    console.log('FantomListingBundleMarketplace deployed to:', listingBundleMarketplaceImpl.address);
    const listingBundleMarketplaceProxy = await AdminUpgradeabilityProxyFactory.deploy(
        listingBundleMarketplaceImpl.address,
        PROXY_ADDRESS,
        []
      );
    await listingBundleMarketplaceProxy.deployed();
    console.log('ListingBundle Marketplace Proxy deployed at ', listingBundleMarketplaceProxy.address);
    const LISTINGBUNDLE_MARKETPLACE = listingMarketplaceProxy.address;
    const listingBundleMarketplace = await ethers.getContractAt('FantomListingBundleMarketplace', listingBundleMarketplaceProxy.address);

    
    await bundleMarketplace.initialize(TREASURY_ADDRESS, PLATFORM_FEE, offerBundleMarketplace.address, listingBundleMarketplace.address);
    console.log('Bundle Marketplace Proxy initialized');

    await offerBundleMarketplace.initialize(bundleMarketplace.address, listingBundleMarketplace.address);
    console.log('OfferBundle Marketplace Proxy initialized');

    await listingBundleMarketplace.initialize(bundleMarketplace.address);
    console.log('ListingBundle Marketplace Proxy initialized');
    ////////

    ////////
    const Auction = await ethers.getContractFactory('FantomAuction');
    const auctionImpl = await Auction.deploy();
    await auctionImpl.deployed();
    console.log('FantomAuction deployed to:', auctionImpl.address);

    const auctionProxy = await AdminUpgradeabilityProxyFactory.deploy(
        auctionImpl.address,
        PROXY_ADDRESS,
        []
      );

    await auctionProxy.deployed();
    console.log('Auction Proxy deployed at ', auctionProxy.address);
    const AUCTION = auctionProxy.address;
    const auction = await ethers.getContractAt('FantomAuction', auctionProxy.address);


    const Bid = await ethers.getContractFactory('FantomBid');
    const bidImpl = await Bid.deploy();
    await bidImpl.deployed();
    console.log('FantomBid deployed to:', bidImpl.address);

    const bidProxy = await AdminUpgradeabilityProxyFactory.deploy(
        bidImpl.address,
        PROXY_ADDRESS,
        []
      );

    await bidProxy.deployed();
    console.log('Bid Proxy deployed at ', bidProxy.address);
    const BID = bidProxy.address;
    const bid = await ethers.getContractAt('FantomBid', bidProxy.address);


    await auction.initialize(TREASURY_ADDRESS, bid.address);
    console.log('Auction Proxy initialized');

    await bid.initialize(auction.address);
    console.log('Bid Proxy initialized');
    ////////

    ////////
    const Factory = await ethers.getContractFactory('FantomNFTFactory');
    const factory = await Factory.deploy(
        AUCTION,
        MARKETPLACE,
        BUNDLE_MARKETPLACE,
        '10000000000000000000',
        TREASURY_ADDRESS,
        '50000000000000000000'
    );
    await factory.deployed();
    console.log('FantomNFTFactory deployed to:', factory.address);

    const PrivateFactory = await ethers.getContractFactory(
        'FantomNFTFactoryPrivate'
    );
    const privateFactory = await PrivateFactory.deploy(
        AUCTION,
        MARKETPLACE,
        BUNDLE_MARKETPLACE,
        '10000000000000000000',
        TREASURY_ADDRESS,
        '50000000000000000000'
    );
    await privateFactory.deployed();
    console.log('FantomNFTFactoryPrivate deployed to:', privateFactory.address);
    ////////    

    ////////
    const NFTTradable = await ethers.getContractFactory('FantomNFTTradable');
    const nft = await NFTTradable.deploy(
        'Artion',
        'ART',
        AUCTION,
        MARKETPLACE,
        BUNDLE_MARKETPLACE,
        '10000000000000000000',
        TREASURY_ADDRESS
    );
    await nft.deployed();
    console.log('FantomNFTTradable deployed to:', nft.address);

    const NFTTradablePrivate = await ethers.getContractFactory(
        'FantomNFTTradablePrivate'
    );
    const nftPrivate = await NFTTradablePrivate.deploy(
        'IArtion',
        'IART',
        AUCTION,
        MARKETPLACE,
        BUNDLE_MARKETPLACE,
        '10000000000000000000',
        TREASURY_ADDRESS
    );
    await nftPrivate.deployed();
    console.log('FantomNFTTradablePrivate deployed to:', nftPrivate.address);
    ////////

    ////////
    const TokenRegistry = await ethers.getContractFactory('FantomTokenRegistry');
    const tokenRegistry = await TokenRegistry.deploy();

    await tokenRegistry.deployed();

    console.log('FantomTokenRegistry deployed to', tokenRegistry.address);
    ////////

    ////////
    const AddressRegistry = await ethers.getContractFactory('FantomAddressRegistry');
    const addressRegistry = await AddressRegistry.deploy();

    await addressRegistry.deployed();

    console.log('FantomAddressRegistry deployed to', addressRegistry.address);
    const FANTOM_ADDRESS_REGISTRY = addressRegistry.address;
    ////////

    ////////
    const PriceFeed = await ethers.getContractFactory('FantomPriceFeed');
    const WRAPPED_FTM = network.name === 'mainnet' ? WRAPPED_FTM_MAINNET : WRAPPED_FTM_TESTNET;
    const priceFeed = await PriceFeed.deploy(
      FANTOM_ADDRESS_REGISTRY,
      WRAPPED_FTM
    );
  
    await priceFeed.deployed();
  
    console.log('FantomPriceFeed deployed to', priceFeed.address);
    ////////

    ////////
    const ArtTradable = await ethers.getContractFactory('FantomArtTradable');
    const artTradable = await ArtTradable.deploy(
        'FantomArt',
        'FART',
        '20000000000000000000',
        TREASURY_ADDRESS,
        MARKETPLACE,
        BUNDLE_MARKETPLACE
    );
    await artTradable.deployed();
    console.log('FantomArtTradable deployed to:', artTradable.address);

    const ArtTradablePrivate = await ethers.getContractFactory(
        'FantomArtTradablePrivate'
    );
    const artTradablePrivate = await ArtTradablePrivate.deploy(
        'FantomArt',
        'FART',
        '20000000000000000000',
        TREASURY_ADDRESS,
        MARKETPLACE,
        BUNDLE_MARKETPLACE
    );
    await artTradablePrivate.deployed();
    console.log('FantomArtTradablePrivate deployed to:', nftPrivate.address);
    ////////

    ////////
    const ArtFactory = await ethers.getContractFactory('FantomArtFactory');
    const artFactory = await ArtFactory.deploy(
        MARKETPLACE,
        BUNDLE_MARKETPLACE,
        '20000000000000000000',
        TREASURY_ADDRESS,
        '10000000000000000000'
     );
    await artFactory.deployed();
    console.log('FantomArtFactory deployed to:', artFactory.address);

    const ArtFactoryPrivate = await ethers.getContractFactory(
        'FantomArtFactoryPrivate'
    );
    const artFactoryPrivate = await ArtFactoryPrivate.deploy(
        MARKETPLACE,
        BUNDLE_MARKETPLACE,
        '20000000000000000000',
        TREASURY_ADDRESS,
        '10000000000000000000'
    );
    await artFactoryPrivate.deployed();
    console.log('FantomArtFactoryPrivate deployed to:', artFactoryPrivate.address);
    ////////
    
    await marketplace.updateAddressRegistry(FANTOM_ADDRESS_REGISTRY);
    await offerMarketplace.updateAddressRegistry(FANTOM_ADDRESS_REGISTRY);
    await listingMarketplace.updateAddressRegistry(FANTOM_ADDRESS_REGISTRY);

    await bundleMarketplace.updateAddressRegistry(FANTOM_ADDRESS_REGISTRY);
    await offerBundleMarketplace.updateAddressRegistry(FANTOM_ADDRESS_REGISTRY);
    await listingBundleMarketplace.updateAddressRegistry(FANTOM_ADDRESS_REGISTRY);

    await auction.updateAddressRegistry(FANTOM_ADDRESS_REGISTRY);
    await bid.updateAddressRegistry(FANTOM_ADDRESS_REGISTRY);

    await addressRegistry.updateArtion(artion.address);
    await addressRegistry.updateAuction(auction.address);
    await addressRegistry.updateListingMarketplace(listingMarketplace.address);
    await addressRegistry.updateMarketplace(marketplace.address);
    await addressRegistry.updateOfferMarketplace(offerMarketplace.address);
    await addressRegistry.updateBundleMarketplace(bundleMarketplace.address);
    await addressRegistry.updateOfferBundleMarketplace(offerBundleMarketplace.address);
    await addressRegistry.updateNFTFactory(factory.address);
    await addressRegistry.updateTokenRegistry(tokenRegistry.address);
    await addressRegistry.updatePriceFeed(priceFeed.address);
    await addressRegistry.updateArtFactory(artFactory.address);   

  }
  
  // We recommend this pattern to be able to use async/await everywhere
  // and properly handle errors.
  main(network)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
  
