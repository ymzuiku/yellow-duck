import type { IncomingHttpHeaders } from "http";
import { handles, routes } from "./cache";
import { runner } from "./runner";
import type { OnMaster, Options, Service, ServiceProps } from "./types";

export const gopool = async ({ uri, body, headers }: ServiceProps) => {
  // 如果是worker, 清理 onMaster 对象
  gopool.onMaster = null;
  const handle = handles[uri];
  if (!handle) {
    return Error("Not found uri: " + uri);
  }
  return await Promise.resolve(handle({ body, headers }));
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

gopool.patch = (url: string, service: Service) => {
  routes.push({
    url,
    method: "PATCH",
  });
  handles["PATCH" + url] = service;
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
gopool.headerGetter = (
  headers: IncomingHttpHeaders
): Record<string, string | number | string[] | undefined> => {
  return {};
};

gopool.onMaster = void 0 as never as OnMaster;

gopool.startWithSingle = () => {
  return runner("single", gopool);
};

gopool.startWithThreadsPool = (options?: Options) => {
  return runner("threadsPool", gopool, options);
};
