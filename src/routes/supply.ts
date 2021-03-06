import BigNumber from "bignumber.js";
import { Application, Request, Response } from "express";
import { IRouteOptions } from ".";
import ERC20 from "../libs/ERC20";

const walletInfo: any = {
  bsc: {
    bridge: "0x3f0dD16553e33664Dc0256Ac58B84ec8E5cAa037",
    token: "0x55e8b37a3c43b049dedf56c77f462db095108651",
    treasury: "0xdb7014e9bc92d087ad7c096d9ff9940711015ec3",
  },
  eth: {
    bridge: "0xd21cbf03Eb55935743098C73E6Eb3af85D20502A",
    token: "0x5dbb9f64cd96e2dbbca58d14863d615b67b42f2e",
    treasury: "0xdb3ac91239b79fae75c21e1f75a189b1d75dd906",
  },
};
const burnWallet = "0x000000000000000000000000000000000000dEaD";

export default async function OKLGSupply(
  app: Application,
  { bscWeb3, ethWeb3 }: IRouteOptions
) {
  app.get("/total", async function totalRoute(_: Request, res: Response) {
    try {
      const bscContract = ERC20(bscWeb3, walletInfo.bsc.token);
      const ethContract = ERC20(ethWeb3, walletInfo.eth.token);
      const [
        bscTotalSupply,
        bscDecimals,
        bscBurnedAddyBal,
        // ethTotalSupply,
        ethDecimals,
        ethBurnedAddyBal,
      ] = await Promise.all([
        bscContract.methods.totalSupply().call(),
        bscContract.methods.decimals().call(),
        bscContract.methods.balanceOf(burnWallet).call(),
        // ethContract.methods.totalSupply().call(),
        ethContract.methods.decimals().call(),
        ethContract.methods.balanceOf(burnWallet).call(),
      ]);
      res.send(
        getBalance(bscTotalSupply, bscDecimals)
          .minus(getBalance(bscBurnedAddyBal, bscDecimals))
          .minus(getBalance(ethBurnedAddyBal, ethDecimals))
          .toString()
      );
    } catch (err: any) {
      res.status(500).json({ error: err.stack });
    }
  });

  app.get(
    "/circulating",
    async function circulatingRoute(_: Request, res: Response) {
      try {
        const bscContract = ERC20(bscWeb3, walletInfo.bsc.token);
        const ethContract = ERC20(ethWeb3, walletInfo.eth.token);
        const [
          bscTotalSupply,
          ethTotalSupply,
          bscDecimals,
          ethDecimals,
          bscBurnedAddyBal,
          ethBurnedAddyBal,
          bscTreasuryWalletBal,
          ethTreasuryWalletBal,
          bscBridgeWalletBal,
          ethBridgeWalletBal,
        ] = await Promise.all([
          bscContract.methods.totalSupply().call(),
          ethContract.methods.totalSupply().call(),
          bscContract.methods.decimals().call(),
          ethContract.methods.decimals().call(),
          bscContract.methods.balanceOf(burnWallet).call(),
          ethContract.methods.balanceOf(burnWallet).call(),
          bscContract.methods.balanceOf(walletInfo.bsc.treasury).call(),
          ethContract.methods.balanceOf(walletInfo.eth.treasury).call(),
          bscContract.methods.balanceOf(walletInfo.bsc.bridge).call(),
          ethContract.methods.balanceOf(walletInfo.eth.bridge).call(),
        ]);
        res.send(
          getBalance(bscTotalSupply, bscDecimals)
            .plus(getBalance(ethTotalSupply, ethDecimals))
            .minus(getBalance(bscBurnedAddyBal, bscDecimals))
            .minus(getBalance(ethBurnedAddyBal, ethDecimals))
            .minus(getBalance(bscTreasuryWalletBal, bscDecimals))
            .minus(getBalance(ethTreasuryWalletBal, ethDecimals))
            .minus(getBalance(bscBridgeWalletBal, bscDecimals))
            .minus(getBalance(ethBridgeWalletBal, ethDecimals))
            .toString()
        );
      } catch (err: any) {
        res.status(500).json({ error: err.stack });
      }
    }
  );
}

function getBalance(bal: number | string, decimals: number | string) {
  return new BigNumber(bal).div(new BigNumber(10).pow(decimals));
}
