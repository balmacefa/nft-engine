const controller = 'api::nft-mint-order.nft-mint-order';

module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/nft-mint-order/createMintNFTOrder',
            handler: `${controller}.createMintNFTOrder`,
        }
    ]
}
