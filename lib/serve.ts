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

export const masterServe = async ({
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
      execArgv: process.execArgv,
      argv: process.argv,
      idleTimeout: idleTimeout,
      minThreads: minThreads,
      maxThreads: maxThreads,
      maxQueue: maxQueue,
    });
    const ctx: Record<string, any> = {};

    let onMaster: any;
    await (async function () {
      let worker = require(filename);
      let target = worker.default || worker;

      if (target.onMasterBefroeAll) {
        await Promise.resolve(target.onMasterBefroeAll({ app, ctx, pool }));
      }
      const headerGetter = target.headerGetter;
      target.useAllRoute({ app, ctx, pool, timeout, headerGetter });
      onMaster = target.onMaster;
      target = void 0;
      worker = void 0;
    })();

    if (onMaster) {
      await Promise.resolve(onMaster({ app, ctx, pool }));
    }
  } catch (err) {
    console.error(err);
    app.log.error(err);
  }
};
