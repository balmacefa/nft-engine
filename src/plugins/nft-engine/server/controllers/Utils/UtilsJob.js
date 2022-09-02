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


const getSaveCurrentNftMintOrderEntity = async (strapi, job) => {
  const nftMintOrderDb = strapi.db.query('api::nft-mint-order.nft-mint-order');
  const jobId = getJobId(job);
  let nftMintOrderEntity = await nftMintOrderDb.findOne({
    where: {
      id: jobId
    }
  });
  await job.updateMerge({ nftMintOrderEntity });
};


const jobFilter = async (job) => {
  if (_.isNil(_.get(job, "data.nftMintOrderEntity"))) {
    return throwError(`Error while getting mint order entity for ${getJobId(job)}`);
  }
  let nftMintOrderEntity = _.get(job, "data.nftMintOrderEntity");

  if (_.get(nftMintOrderEntity, "status") === "minted") {
    // log and return
    strapi.log.info(`mintNFTJob: minted already for ${getJobId(job)}`);
    return nftMintOrderEntity;
  }

};


module.exports = {
  addJobExtraFunc,
  getSaveCurrentNftMintOrderEntity,
  jobFilter,
  getJobId
};
