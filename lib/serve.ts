/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-explicit-any */
import EventEmitter from "events";
import fastify from "fastify";
import os from "node:os";
import Piscina from "piscina";
import { config } from "up-dir-env";
import { osInfo } from "./osInfo";

config();
const app = fastify();

interface Route {
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
}

interface Options {
  host: string;
  port: number;
  filename: string;
  infoUrl?: string;
  timeout?: number;
  minThreads?: number;
  maxThreads?: number;
  maxQueue?: number;
}

const cpus = os.cpus().length;

export const gopoolServe = async ({
  port = 3800,
  host = "127.0.0.1",
  filename,
  infoUrl,
  timeout = 10000,
  minThreads = 0,
  maxThreads = cpus,
  maxQueue = cpus * 1000,
}: Options) => {
  try {
    const pool = new Piscina({
      filename,
      env: process.env,
      idleTimeout: 15000,
      minThreads: minThreads,
      maxThreads: maxThreads,
      maxQueue: maxQueue,
      argv: process.argv,
    });
    if (infoUrl) {
      app.get(infoUrl, () => osInfo(pool));
    }
    let target = require(filename);
    let go = target.default || target;
    if (go.beforeAll) {
      await Promise.resolve(go.beforeAll());
    }
    const routes = JSON.parse(JSON.stringify(go.routes)) as Route[];
    go = void 0;
    target = void 0;

    routes.forEach((ro) => {
      if (ro.method === "GET") {
        app.get(ro.url, async ({ query }: { query: any }) => {
          const ee = new EventEmitter();
          const t = setTimeout(() => {
            ee.emit("abort");
          }, timeout);
          const result = await pool.run({ uri: ro.method + ro.url, body: query }, { signal: ee });
          clearTimeout(t);

          return result;
        });
      } else {
        (app as any)[ro.method.toLocaleLowerCase()](ro.url, async ({ body }: { body: any }) => {
          const result = await pool.run({ uri: ro.method + ro.url, body: JSON.parse(body as never) });
          return result;
        });
      }
    });
    console.log(`gopool listen: http://${host}:${port}`);
    await app.listen({ port, host });
  } catch (err) {
    console.error(err);
    app.log.error(err);
  }
};
