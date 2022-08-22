import EventEmitter from "events";
import { createReadStream } from "fs";
import { handles, routes } from "./cache";
import { OnMasterProps } from "./types";

export const useAllRoute = ({
  app,
  pool,
  timeout,
  headerGetter,
}: OnMasterProps & { timeout: number; headerGetter: any }) => {
  function send(rej: { send: any }, result: any) {
    // 流从master进行读取, 减少线程通信
    if (typeof result === "object" && result.kind == "stream") {
      return rej.send(createReadStream(result.args[0], result.args[1]));
    }
    return rej.send(result);
  }
  routes.forEach((ro: any) => {
    if (ro.method === "GET") {
      if (pool) {
        app.get(ro.url, async ({ query, headers }, rej) => {
          const ee = new EventEmitter();
          const t = setTimeout(() => {
            ee.emit("abort");
          }, timeout);
          const result = await pool.run(
            {
              uri: ro.method + ro.url,
              body: query,
              headers: headerGetter(headers),
            },
            { signal: ee }
          );
          clearTimeout(t);
          return send(rej, result);
        });
      } else {
        const fn = handles[ro.method + ro.url];
        app.get(ro.url, async ({ query, headers }, rej) => {
          const result = await Promise.resolve(
            fn({
              uri: ro.method + ro.url,
              body: query,
              headers: headerGetter(headers),
            })
          );
          return send(rej, result);
        });
      }
    } else {
      if (pool) {
        (app as any)[ro.method.toLocaleLowerCase()](
          ro.url,
          async ({ body, headers }: any, rej) => {
            const ee = new EventEmitter();
            const t = setTimeout(() => {
              ee.emit("abort");
            }, timeout);
            const result = await pool.run(
              {
                uri: ro.method + ro.url,
                body: JSON.parse(body as never),
                headers: headerGetter(headers),
              },
              { signal: ee }
            );
            clearTimeout(t);
            return send(rej, result);
          }
        );
      } else {
        const fn = handles[ro.method + ro.url];
        (app as any)[ro.method.toLocaleLowerCase()](
          ro.url,
          async ({ body, headers }, rej) => {
            const result = await Promise.resolve(
              fn({
                uri: ro.method + ro.url,
                body: JSON.parse(body as never),
                headers: headerGetter(headers),
              })
            );
            return send(rej, result);
          }
        );
      }
    }
  });
};
