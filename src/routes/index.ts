import bunyan from "bunyan";
import { Application } from "express";
import { Redis } from "ioredis";
import Web3 from "web3";
import main from "./main";
import supply from "./supply";
import token from "./token";

export interface IRouteOptions {
  log: bunyan;
  redis: Redis;
  bscWeb3: Web3;
  ethWeb3: Web3;
}

export default async function Routes(
  app: Application,
  { log, redis, bscWeb3, ethWeb3 }: IRouteOptions
) {
  main(app);
  supply(app, { log, redis, bscWeb3, ethWeb3 });
  token(app, { log, redis, bscWeb3, ethWeb3 });
}
