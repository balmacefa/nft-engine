const _ = require('lodash');

const getJobId = (job) => _.get(job, "data.nftMintOrderEntity.id");


const addJobExtraFunc = (job) => {
    job.__proto__.updateMerge = async function (obj) {
        await job.update(_.merge(job.data, obj));
    };
    job.__proto__.pushProgress = function (addProgress) {
        addProgress.timestamp = new Date();
        const copyProgress = this.progress || [];
        // if progress is array _
        if (copyProgress.length > 0) {
            const lastProgress = copyProgress[copyProgress.length - 1];
            if (lastProgress && lastProgress.msg === addProgress.msg) {
                addProgress.count = _.get(lastProgress, "count", 0) + 1;
                addProgress.timestamp = lastProgress.timestamp;
                addProgress.updatedAt = new Date();
                copyProgress[copyProgress.length - 1] = addProgress;
            } else {
                copyProgress.push(addProgress);
            }
        } else {
            copyProgress.push(addProgress);
        }

        this.updateProgress(copyProgress);
    };
};


const getSaveCurrentNftMintOrderEntity = async (strapi, job) =>{
    const nftMintOrderDb = strapi.db.query('api::nft-mint-order.nft-mint-order');
    let nftMintOrderEntity = await nftMintOrderDb.findOne({
        where: {
            id: getJobId(job)
        }
    });
    await job.updateMerge({ nftMintOrderEntity });
};


const jobFilter = async (job) => {
    if (_.isNil(_.get(job, "data.nftMintOrderEntity"))) {
        return throwError(`Error while getting mint order entity for ${getJobId(job)}`);
    }

    if (_.get(job, "data.nftMintOrderEntity.status") === "minted") {
        // log and return
        strapi.log.info(`mintNFTJob: minted already for ${getJobId(job)}`);
        return _.get(job, "data.nftMintOrderEntity");
    }

    // if is job first attempts
    const PackageOrderController = strapi.controller('api::package-order.package-order');
    const userId = job.data.userId;

    // check status to 
    if (_.get(job, "data.nftMintOrderEntity.status") === "pending") {
        let decLastPackageOrder = await PackageOrderController.getReducerPackageOrderDB(strapi, userId)
        // 🤑🤑🤑 reduce one package-order payment
        if (_.isNil(decLastPackageOrder)) {
            // return ctx.PaymentRequired('You have no remaining balance to mint, please purchase more packages mints');
            // ThrowError
            return throwError(`You have no remaining balance to mint, please purchase more packages mints`);
        }
        // update package-order payment
        const result = await PackageOrderController.reduceRemainMints(strapi, decLastPackageOrder, userId);
        if (result) {
            nftMintOrderEntity = await nftMintOrderDb.update(
                {
                    where: {
                        id: nftMintOrderEntity.id
                    },
                    data: {
                        status: 'charged'
                    }
                });
            await job.updateMerge({ nftMintOrderEntity });
        } else {
            // ThrowError
            return throwError(`You have no remaining balance to mint, please purchase more packages mints`);
        }
    }
};


module.exports = {
    addJobExtraFunc,
    getSaveCurrentNftMintOrderEntity,
    jobFilter,
    getJobId
};
