# Introduction 🤴⚔

This is a fully automated solution 🤖🧞 that allows you to deploy an NFT with a single API call to the [Polygon Matic](https://polygon.technology/) blockchain ( this is a layer 2 Ethereum network). Other blockchains will be added in the future ( BSC, CELO, ONE).


This means that you can now create an NFT and put it on the Polygon blockchain with a single API call. Other blockchains will be added in the future see galaxy use cases 🏰🌈


## Key points 🥇🔑

- Jobs are placed in a resilient Redis queue.
- A smart contract is deployed for each collection.
- Data is uploaded to [IPFS](https://ipfs.io/) (The InterPlanetary File System) in base64 format.
- The IPFS results are included in the NFT Json Metadata.As specified by your custom path. (Internally is done by [lodash _.set](https://lodash.com/docs/4.17.15#set))
- The compiled NFT Json Metadata is uploaded to IPFS.
- The NFT is deployed to the blockchain.
- A webhook is used to notify the user of the job's stages and status.


![NFT_API_MINT](https://user-images.githubusercontent.com/8296124/174458010-9eab4080-a062-4151-9f67-d27daccdc135.png)


### The Job queue 💀🥀🧲🧭

The nature of the networks and technology used to create non-fungible tokens (NFTs) means that there are multiple potential points of failure. To account for this, a resilience work queue is used that attempts each step until the NFT is successfully deployed. If a job does not succeed after 10 tries, it is considered unrecoverable.


Deploy a Smart contract and create an NFT.
self signed.
own private keys.


# Cloud service available At
![image](https://user-images.githubusercontent.com/8296124/174458072-6620457a-ee0b-404f-b00d-b1938770151f.png)

https://nftapiengine.xyz
and
https://rapidapi.com/balmacefa/api/nft_engine_api

# Book a call
Manage, maintain of project, custom code, Strategy, features, key management, cloud service, etc.
https://calendly.com/balmacefa/nft

# API Documentation
Send headers:
Headers:
`x-rapidapi-proxy-secret` SET at .env
`x-rapidapi-user` Identity of the user.

https://docs.nftapiengine.xyz/#introduction

# Architecture
This application is built on top of the Strapi framework, Redis, Pinata IPFS, Tatum.io and RapidAPI.
## API CMS
This is a [strapi application](https://docs.strapi.io/)
This manage db collections and routes.

### Engine folder Entry point:
src/plugins/nft-engine/server/bootstrap.js

tip: ctrl + p to search for the word "bootstrap"
Socket io structure is on this file

src/plugins/nft-engine/server/controllers/engine-controller.js
This is the main controller of the engine.

## Redis job Queue
Create a redis instance, Use heroku add-on for redis.
Or use local redis.

Job managed by [bullmq](https://docs.bullmq.io/)
GUI for redis :https://resp.app/

## Tatum NFT API
NFT Contract are created by https://tatum.io/
.env need key ->
### Private key Management

## Pinata IPFS
.env need key -> https://www.pinata.cloud/

## Usage see Makefile
See makefile and package.json for install deps, build and run.
