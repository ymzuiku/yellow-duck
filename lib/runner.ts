import { Options } from "./types";
import { useAllRoute } from "./useAllRoute";

export const runner = async (
  type: "single" | "threadsPool",
  yellowDuck: any,
  {
    timeout = 10000,
    minThreads = 0,
    maxThreads,
    idleTimeout = 5000,
  }: Options = {}
) => {
  await new Promise((res) => setTimeout(res, 200));
  if (!yellowDuck.onMaster) {
    return;
  }
  const cluster = require("node:cluster");
  if (cluster.isPrimary) {
    cluster.fork();
    cluster.on("exit", (worker, code, signal) => {
      console.log(
        `worker ${worker.process.pid} died, code: ${code}, signal:${signal}`
      );
      cluster.fork();
    });
    console.log("daemon pid:", process.pid);
    return;
  }
  console.log("master pid:", process.pid);
  const fastify = require("fastify");
  const os = require("node:os");
  let cpus = os.cpus().length - 1;
  if (cpus < 2) {
    cpus = 2;
  }
  if (!maxThreads) {
    maxThreads = cpus;
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
      });

      await (async function () {
        const headerGetter = yellowDuck.headerGetter;
        useAllRoute({ app, pool, timeout, headerGetter });
      })();

      await Promise.resolve(yellowDuck.onMaster({ app, pool }));
    } catch (err) {
      console.error(err);
      app.log.error(err);
    }
  } else {
    await (async function () {
      const headerGetter = yellowDuck.headerGetter;
      useAllRoute({ app, pool: null, timeout, headerGetter });
    })();

    await Promise.resolve(yellowDuck.onMaster({ app, pool: null }));
  }
};
