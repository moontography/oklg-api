import assert from "assert";
import BigNumber from "bignumber.js";
import { Application, NextFunction, Request, Response } from "express";
import { Redis } from "ioredis";
import Web3 from "web3";
import { IRouteOptions } from ".";
import DexUtilsContract from "../libs/DexUtilsContract";

const dexUtils = "0x738f7a7D2F7aF556321fae259b37d49034827E09";

assert(process.env.COIN_MARKET_CAP_API, "CMC Api key required");

export default async function Token(
  app: Application,
  { log, redis, bscWeb3, ethWeb3 }: IRouteOptions
) {
  app.get(
    "/token/price",
    async function tokenPrice(req: Request, res: Response, next: NextFunction) {
      try {
        const { network, token }: any = req.query;
        assert(network, "network must be provided");
        assert(network, "token must be provided");

        // await getAndCacheCMCIdMap(redis, symbol);
        const price = await getTokenPrice(
          redis,
          network.toLowerCase() === "bsc" ? bscWeb3 : ethWeb3,
          token
        );
        res.json({ price });
      } catch (err) {
        console.error(`Error getting price`, err);
        next(err);
      }
    }
  );
}

async function getTokenPrice(
  redis: Redis,
  web3: Web3,
  token: string
): Promise<number | string> {
  const cacheKey = `token.${token.toLowerCase()}.price`;
  const cachedPrice = await redis.get(cacheKey);
  if (cachedPrice) return cachedPrice;

  const dexUtilsCont = DexUtilsContract(web3, dexUtils);
  let price: number | string = 0;
  try {
    price = await dexUtilsCont.methods.getMainPriceViaNativePair(token).call();
  } finally {
    if (isNaN(Number(price)) || price == "NaN") {
      price = 0;
    }
  }

  const formattedPrice = new BigNumber(price)
    .div(new BigNumber(10).pow(18))
    .toFixed();
  await redis.set(cacheKey, formattedPrice, "EX", 60 * 10); // 10 minute cache
  return formattedPrice;
}
