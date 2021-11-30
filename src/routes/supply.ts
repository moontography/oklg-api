import assert from "assert";
import BigNumber from "bignumber.js";
import { Application, Request, Response } from "express";
import Web3 from "web3";
import ERC20 from "../libs/ERC20";

assert(process.env.INFURA_API_KEY, "No Infura API key for ETH mainnet");

const walletInfo: any = {
  bsc: {
    bridge: "0xC46Ed49057E02057e829e8E72490343B27204272",
    token: "0x55e8b37a3c43b049dedf56c77f462db095108651",
    treasury: "0xdb7014e9bc92d087ad7c096d9ff9940711015ec3",
  },
  eth: {
    bridge: "0x879AE0B21dB450db0568545a2AD1790853e42060",
    token: "0x5dbb9f64cd96e2dbbca58d14863d615b67b42f2e",
    treasury: "0xdb3ac91239b79fae75c21e1f75a189b1d75dd906",
  },
};
const burnWallet = "0x000000000000000000000000000000000000dEaD";

const bscWeb3 = new Web3(
  new Web3.providers.HttpProvider(`https://bsc-dataseed.binance.org`)
);
const ethWeb3 = new Web3(
  new Web3.providers.HttpProvider(
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
  )
);

export default async function OKLGSupply(app: Application) {
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
