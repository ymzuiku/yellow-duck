import EventEmitter from "events";
import { routes } from "./cache";
import { OnMasterProps } from "./types";

export const useAllRoute = ({
  app,
  pool,
  timeout,
  headerGetter,
}: OnMasterProps & { timeout: number; headerGetter: any }) => {
  routes.forEach((ro: any) => {
    if (ro.method === "GET") {
      app.get(ro.url, async ({ query, headers }) => {
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

        return result;
      });
    } else {
      (app as any)[ro.method.toLocaleLowerCase()](
        ro.url,
        async ({ body, headers }: any) => {
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
          return result;
        }
      );
    }
  });
};
