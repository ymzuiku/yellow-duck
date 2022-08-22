import EventEmitter from "events";
import { handles, routes } from "./cache";
import { OnMasterProps } from "./types";

export const useAllRoute = ({
  app,
  pool,
  timeout,
  headerGetter,
}: OnMasterProps & { timeout: number; headerGetter: any }) => {
  routes.forEach((ro: any) => {
    if (ro.method === "GET") {
      if (pool) {
        app.get(ro.url, async ({ query, headers }, rej) => {
          const ee = new EventEmitter();
          const t = setTimeout(() => {
            ee.emit("abort");
          }, timeout);
          try {
            const result = await pool.run(
              {
                uri: ro.method + ro.url,
                body: query,
                headers: headerGetter(headers),
              },
              { signal: ee }
            );
            clearTimeout(t);
            return rej.send(result);
          } catch (err) {
            clearTimeout(t);
            return rej.send(err);
          }
        });
      } else {
        const fn = handles[ro.method + ro.url];
        app.get(ro.url, async ({ query, headers }, rej) => {
          try {
            const result = await Promise.resolve(
              fn({
                uri: ro.method + ro.url,
                body: query,
                headers: headerGetter(headers),
              })
            );
            return rej.send(result);
          } catch (err) {
            return rej.send(err);
          }
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
            try {
              const result = await pool.run(
                {
                  uri: ro.method + ro.url,
                  body: JSON.parse(body as never),
                  headers: headerGetter(headers),
                },
                { signal: ee }
              );
              clearTimeout(t);
              return rej.send(result);
            } catch (err) {
              clearTimeout(t);
              return rej.send(err);
            }
          }
        );
      } else {
        const fn = handles[ro.method + ro.url];
        (app as any)[ro.method.toLocaleLowerCase()](
          ro.url,
          async ({ body, headers }, rej) => {
            try {
              const result = await Promise.resolve(
                fn({
                  uri: ro.method + ro.url,
                  body: JSON.parse(body as never),
                  headers: headerGetter(headers),
                })
              );
              return rej.send(result);
            } catch (err) {
              return rej.send(err);
            }
          }
        );
      }
    }
  });
};
