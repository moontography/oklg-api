import assert from "assert";
import BigNumber from "bignumber.js";
import { Application, NextFunction, Request, Response } from "express";
import { Redis } from "ioredis";
import { IRouteOptions } from ".";
import ERC20 from "../libs/ERC20";
import ERC721 from "../libs/ERC721";
import OKLGRewardsDistributor from "../libs/OKLGRewardsDistributor";

const walletInfo: any = {
  bsc: {
    nft: "0x8d87c61e1Dd1351fbbC0026F478416B67E660726",
    token: "0x55e8b37a3c43b049dedf56c77f462db095108651",
    rewards: "0x6A67398C803aeFe4f7b6768d42EF76426bFe0F8d",
  },
  eth: {
    nft: "0xdAf531FD52eAa4B33a5158B0Da3305CaaAf96cD6",
    token: "0x5dbb9f64cd96e2dbbca58d14863d615b67b42f2e",
    rewards: "0x8b61F51F639ADf0d883F6b6E30f2C822B238fC2E",
  },
};

export default async function Alpha(
  app: Application,
  { log, redis, bscWeb3, ethWeb3 }: IRouteOptions
) {
  app.get(
    "/alpha/validated",
    async function alphaValidated(
      req: Request,
      res: Response,
      next: NextFunction
    ) {
      try {
        const address: any = req.query.address;
        assert(address, "nothing to validate");
        const isValidated = await redis.get(getAlphaValidatedGet(address));
        res.json({ validated: isValidated === "true" });
      } catch (err) {
        console.error(`Error validation signature`, err);
        next(err);
      }
    }
  );

  app.post(
    "/alpha/validate",
    async function alphaValidate(
      req: Request,
      res: Response,
      next: NextFunction
    ) {
      try {
        const { address, message, signature }: any = req.body;
        assert(address, "need an address to validate");
        assert(message, "need a message to validate");
        assert(signature, "need a signature to validate against");

        const signer = ethWeb3.eth.accounts.recover(message, signature);
        assert(
          signer.toLowerCase() == address.toLowerCase(),
          "address and signer do not match"
        );

        const bscNftContract = ERC721(bscWeb3, walletInfo.bsc.nft);
        const bscTokenContract = ERC20(bscWeb3, walletInfo.bsc.token);
        const bscRewardsContract = OKLGRewardsDistributor(
          bscWeb3,
          walletInfo.bsc.rewards
        );
        const ethNftContract = ERC721(ethWeb3, walletInfo.eth.nft);
        const ethTokenContract = ERC20(ethWeb3, walletInfo.eth.token);
        const ethRewardsContract = OKLGRewardsDistributor(
          ethWeb3,
          walletInfo.eth.rewards
        );

        // check OKLG balance on both chains and ape balances, in addition to checking
        // against what is staked, then return back boolean for validation
        const [
          mainETHOklgBal,
          rewardsETHOklgBal,
          mainETHOklaBal,
          rewardsETHOklaIds,
          mainBSCOklgBal,
          rewardsBSCOklgBal,
          mainBSCOklaBal,
          rewardsBSCOklaIds,
        ] = await Promise.all([
          ethTokenContract.methods.balanceOf(address).call(),
          ethRewardsContract.methods.getBaseShares(address).call(),
          ethNftContract.methods.balanceOf(address).call(),
          ethRewardsContract.methods.getBoostNfts(address).call(),
          bscTokenContract.methods.balanceOf(address).call(),
          bscRewardsContract.methods.getBaseShares(address).call(),
          bscNftContract.methods.balanceOf(address).call(),
          bscRewardsContract.methods.getBoostNfts(address).call(),
        ]);

        const totalOklgBal = new BigNumber(mainETHOklgBal)
          .plus(rewardsETHOklgBal)
          .plus(mainBSCOklgBal)
          .plus(rewardsBSCOklgBal);
        const totalOklaBal = new BigNumber(mainETHOklaBal)
          .plus(rewardsETHOklaIds.length)
          .plus(mainBSCOklaBal)
          .plus(rewardsBSCOklaIds.length);

        const validated = totalOklgBal.gte(
          new BigNumber("30e6").times(new BigNumber(10).pow(9))
        );
        await redis.set(
          getAlphaValidatedGet(address),
          validated ? "true" : "false",
          "EX",
          60 * 60 * 24 * 3
        );

        res.json({
          validated,
          totalOKLG: totalOklgBal.toFixed(0),
          totalOKLA: totalOklaBal.toFixed(0),
        });
      } catch (err) {
        console.error(`Error validation signature`, err);
        next(err);
      }
    }
  );
}

function getAlphaValidatedGet(address: string) {
  return `alpha_validated_${address.toLowerCase()}`;
}
