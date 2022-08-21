import { Options } from "./types";
import { useAllRoute } from "./useAllRoute";

export const runner = async (
  type: "single" | "threadsPool",
  gopool: any,
  {
    timeout = 10000,
    minThreads = 0,
    maxThreads,
    maxQueue,
    idleTimeout = 5000,
  }: Options = {}
) => {
  await new Promise((res) => setTimeout(res, 200));
  if (!gopool.onMaster) {
    return;
  }
  const cluster = require("node:cluster");
  if (cluster.isPrimary) {
    cluster.fork();
    cluster.on("exit", (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
      cluster.fork();
    });
    return;
  }
  const fastify = require("fastify");
  const os = require("node:os");
  let cpus = os.cpus().length - 1;
  if (cpus < 2) {
    cpus = 2;
  }
  if (!maxThreads) {
    maxThreads = cpus;
  }
  if (!maxQueue) {
    maxQueue = cpus * 2500;
  }
  const app = fastify();
  if (type === "threadsPool") {
    const Piscina = require("piscina");
    try {
      const pool = new Piscina({
        filename: __filename,
        env: process.env,
        execArgv: process.execArgv,
        argv: process.argv,
        idleTimeout: idleTimeout,
        minThreads: minThreads,
        maxThreads: maxThreads,
        maxQueue: maxQueue,
      });

      await (async function () {
        const headerGetter = gopool.headerGetter;
        useAllRoute({ app, pool, timeout, headerGetter });
      })();

      await Promise.resolve(gopool.onMaster({ app, pool }));
    } catch (err) {
      console.error(err);
      app.log.error(err);
    }
  } else {
    await (async function () {
      const headerGetter = gopool.headerGetter;
      useAllRoute({ app, pool: null, timeout, headerGetter });
    })();

    await Promise.resolve(gopool.onMaster({ app, pool: null }));
  }
};
