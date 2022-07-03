import EventEmitter from "events";
import type { FastifyInstance } from "fastify";
import type { IncomingHttpHeaders } from "http";
import type Piscina from "piscina";

/* eslint-disable @typescript-eslint/no-explicit-any */
const routes = [] as any;
const handles = {} as any;

interface ServiceProps {
  uri: string;
  body: any;
  ctx: Record<string, any>;
  headers: Record<string, string | number | string[] | undefined>;
}
type Service = (props: Omit<ServiceProps, "uri">) => any;

export const gopool = async ({ uri, body, ctx, headers }: ServiceProps) => {
  const handle = handles[uri];
  if (!handle) {
    return Error("Not found uri: " + uri);
  }
  return await Promise.resolve(handle({ body, ctx, headers }));
};

gopool.all = (url: string, service: Service) => {
  routes.push({
    url,
    method: "ALL",
  });
  handles["ALL" + url] = service;
};

gopool.get = (url: string, service: Service) => {
  routes.push({
    url,
    method: "GET",
  });
  handles["GET" + url] = service;
};

gopool.post = (url: string, service: Service) => {
  routes.push({
    url,
    method: "POST",
  });
  handles["POST" + url] = service;
};

gopool.put = (url: string, service: Service) => {
  routes.push({
    url,
    method: "PUT",
  });
  handles["PUT" + url] = service;
};

gopool.delete = (url: string, service: Service) => {
  routes.push({
    url,
    method: "DELETE",
  });
  handles["DELETE" + url] = service;
};

gopool.options = (url: string, service: Service) => {
  routes.push({
    url,
    method: "OPTIONS",
  });
  handles["OPTIONS" + url] = service;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
gopool.headerGetter = (headers: IncomingHttpHeaders): Record<string, string | number | string[] | undefined> => {
  return {};
};

type OnMasterProps = { app: FastifyInstance; ctx: Record<string, any>; pool: Piscina };
type OnMaster = (props: OnMasterProps) => any;
gopool.onMasterBefroeAll = void 0 as never as OnMaster;
gopool.onMaster = void 0 as never as OnMaster;

gopool.useAllRoute = ({
  app,
  pool,
  ctx,
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
          { uri: ro.method + ro.url, body: query, ctx, headers: headerGetter(headers) },
          { signal: ee },
        );
        clearTimeout(t);

        return result;
      });
    } else {
      (app as any)[ro.method.toLocaleLowerCase()](ro.url, async ({ body, headers }: any) => {
        const ee = new EventEmitter();
        const t = setTimeout(() => {
          ee.emit("abort");
        }, timeout);
        const result = await pool.run(
          { uri: ro.method + ro.url, body: JSON.parse(body as never), ctx, headers: headerGetter(headers) },
          { signal: ee },
        );
        clearTimeout(t);
        return result;
      });
    }
  });
};

// 向下兼容
gopool.startInWorker = async (app: FastifyInstance) => {
  const ctx: Record<string, any> = {};
  if (gopool.onMasterBefroeAll) {
    await Promise.resolve(gopool.onMasterBefroeAll({ app, ctx } as any));
  }
  routes.forEach((ro: any) => {
    if (ro.method === "GET") {
      app.get(ro.url, async ({ query, headers }) => {
        const result = await gopool({
          uri: ro.method + ro.url,
          body: query,
          ctx,
          headers: gopool.headerGetter(headers),
        });

        return result;
      });
    } else {
      (app as any)[ro.method.toLocaleLowerCase()](ro.url, async ({ body, headers }: any) => {
        const result = await gopool({
          uri: ro.method + ro.url,
          body: JSON.parse(body as never),
          ctx,
          headers: gopool.headerGetter(headers),
        });
        return result;
      });
    }
  });
  if (gopool.onMaster) {
    await Promise.resolve(gopool.onMaster({ app, ctx } as any));
  }
};
