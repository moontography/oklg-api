import assert from "assert";
import BigNumber from "bignumber.js";
import { Application, NextFunction, Request, Response } from "express";
import { Redis } from "ioredis";
import { IRouteOptions } from ".";
import CoinMarketCapApi from "../libs/CoinMarketCapApi";
import DexUtils from "../libs/DexUtils";

assert(process.env.COIN_MARKET_CAP_API, "CMC Api key required");
const cmcApi = CoinMarketCapApi(process.env.COIN_MARKET_CAP_API);

export default async function Token(
  app: Application,
  { log, redis }: IRouteOptions
) {
  app.get(
    "/token/price",
    async function tokenPrice(req: Request, res: Response, next: NextFunction) {
      try {
        const { symbol }: any = req.query;
        assert(symbol, "symbol must be provided");

        // await getAndCacheCMCIdMap(redis, symbol);
        const price = await getTokenPrice(redis, symbol);
        res.json({ price });
      } catch (err) {
        console.error(`Error getting price`, err);
        next(err);
      }
    }
  );
}

// async function getAndCacheCMCIdMap(redis: Redis, symbol: string) {
//   const cache = await redis.get(`token.${symbol}`);
//   if (cache) return;

//   const { data } = await cmcApi.idMap();
//   const pipeline = redis.pipeline();
//   data.forEach((token: any) =>
//     pipeline.set(`token.${token.symbol.toLowerCase()}`, JSON.stringify(token))
//   );
//   await pipeline.exec();
//   return data;
// }

async function getTokenPrice(
  redis: Redis,
  symbol: string
): Promise<number | string> {
  const cacheKey = `token.${symbol.toLowerCase()}.price`;
  const cachedPrice = await redis.get(cacheKey);
  if (cachedPrice) return cachedPrice;

  const { data } = await cmcApi.tokenPrice(symbol);
  const caseSensitiveSymbol = Object.keys(data)[0];
  if (caseSensitiveSymbol.toLowerCase() !== symbol.toLowerCase())
    throw new Error(`symbols do not match`);
  let price =
    data &&
    data[caseSensitiveSymbol] &&
    data[caseSensitiveSymbol].quote &&
    data[caseSensitiveSymbol].quote.USD &&
    data[caseSensitiveSymbol].quote.USD.price;

  // TODO support falling back to another method(s) of getting price
  if (!price || price == 0) {
    const platform = data[caseSensitiveSymbol].platform;
    if (platform && platform.symbol.toLowerCase() === "bnb") {
      price = await DexUtils.getTokenPrice(platform.token_address);
    }
  }

  const formattedPrice = new BigNumber(price).toFixed();
  await redis.set(cacheKey, formattedPrice, "EX", 60 * 10); // 10 minute cache
  return formattedPrice;
}
