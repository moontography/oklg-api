import assert from "assert";
import http from "http";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import Web3 from "web3";
import log from "./logger";
import redis from "./redis";
import config from "./config";
import Routes from "./routes";

const app = express();
const server = new http.Server(app);

assert(process.env.GETBLOCK_API_KEY, "no API key for web3 RPCs");
const bscWeb3 = new Web3(
  new Web3.providers.HttpProvider(`https://bsc-dataseed.binance.org`)
);
// const bscWeb3 = new Web3(
//   new Web3.providers.HttpProvider(
//     `https://bsc.getblock.io/mainnet/?api_key=${process.env.GETBLOCK_API_KEY}`
//   )
// );
// const ethWeb3 = new Web3(
//   new Web3.providers.HttpProvider(
//     `https://eth.getblock.io/mainnet/?api_key=${process.env.GETBLOCK_API_KEY}`
//   )
// );
const ethWeb3 = new Web3(
  new Web3.providers.HttpProvider(
    `https://apis-sj.ankr.com/3e7d0b7b3bdc4ddc8e919dc3e98a2481/${process.env.ANKR_API_KEY}/eth/fast/main`
  )
);

export default async function startServer(portToListenOn = config.server.port) {
  return await new Promise((resolve, reject) => {
    try {
      app.disable("x-powered-by");

      // https://expressjs.com/en/guide/behind-proxies.html
      app.set("trust proxy", 1);
      app.use(cors());
      app.use(express.json());

      Routes(app, { log, redis, bscWeb3, ethWeb3 });

      app.all("*", function fallbackRoute(req: Request, res: Response) {
        res.sendStatus(404);
      });

      app.use(function expressErrorHandler(
        err: Error,
        req: Request,
        res: Response,
        next: NextFunction
      ) {
        log.error("Express error handling", err);
        res.sendStatus(500);
      });

      server.listen(portToListenOn, () => {
        log.info(`listening on *: ${portToListenOn}`);
        resolve(app);
      });
    } catch (err) {
      log.error("Error starting server", err);
      reject(err);
    }
  });
}
