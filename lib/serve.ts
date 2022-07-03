/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
import fastify from "fastify";
import os from "node:os";
import Piscina from "piscina";

const app = fastify();

interface Options {
  filename: string;
  timeout?: number;
  minThreads?: number;
  maxThreads?: number;
  maxQueue?: number;
  idleTimeout?: number;
}

const cpus = os.cpus().length;

export const gopoolServe = async ({
  filename,
  timeout = 10000,
  minThreads = 0,
  maxThreads = cpus,
  maxQueue = cpus * 1000,
  idleTimeout = 15000,
}: Options) => {
  try {
    const pool = new Piscina({
      filename,
      env: process.env,
      idleTimeout: idleTimeout,
      minThreads: minThreads,
      maxThreads: maxThreads,
      maxQueue: maxQueue,
      argv: process.argv,
    });
    let target = require(filename);
    let go = target.default || target;
    const ctx: Record<string, any> = {};
    if (go.onMasterBefroeAll) {
      await Promise.resolve(go.onMasterBefroeAll({ app, ctx, pool }));
    }
    const headerGetter = go.headerGetter;
    go.useAllRoute({ app, ctx, pool, timeout, headerGetter });
    const onMaster = go.onMaster;
    go = void 0;
    target = void 0;

    if (onMaster) {
      await Promise.resolve(onMaster({ app, ctx, pool }));
    }
  } catch (err) {
    console.error(err);
    app.log.error(err);
  }
};
