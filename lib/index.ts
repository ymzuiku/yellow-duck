import type { IncomingHttpHeaders } from "http";
import { handles, routes } from "./cache";
import { runner } from "./runner";
import type { OnMaster, Options, Service, ServiceProps } from "./types";

export const yellowDuck = async ({ uri, body, headers }: ServiceProps) => {
  // 如果是worker, 清理 onMaster 对象
  yellowDuck.onMaster = null;
  const handle = handles[uri];
  if (!handle) {
    return Error("Not found uri: " + uri);
  }
  // try {
  //   return await Promise.resolve(handle({ body, headers }));
  // } catch (err) {
  //   return err;
  // }
  return await Promise.resolve(handle({ body, headers }));
};

yellowDuck.all = (url: string, service: Service) => {
  routes.push({
    url,
    method: "ALL",
  });
  handles["ALL" + url] = service;
};

yellowDuck.get = (url: string, service: Service) => {
  routes.push({
    url,
    method: "GET",
  });
  handles["GET" + url] = service;
};

yellowDuck.post = (url: string, service: Service) => {
  routes.push({
    url,
    method: "POST",
  });
  handles["POST" + url] = service;
};

yellowDuck.put = (url: string, service: Service) => {
  routes.push({
    url,
    method: "PUT",
  });
  handles["PUT" + url] = service;
};

yellowDuck.patch = (url: string, service: Service) => {
  routes.push({
    url,
    method: "PATCH",
  });
  handles["PATCH" + url] = service;
};

yellowDuck.delete = (url: string, service: Service) => {
  routes.push({
    url,
    method: "DELETE",
  });
  handles["DELETE" + url] = service;
};

yellowDuck.options = (url: string, service: Service) => {
  routes.push({
    url,
    method: "OPTIONS",
  });
  handles["OPTIONS" + url] = service;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
yellowDuck.headerGetter = (
  headers: IncomingHttpHeaders
): Record<string, string | number | string[] | undefined> => {
  return {};
};

yellowDuck.onMaster = void 0 as never as OnMaster;

yellowDuck.startWithSingle = () => {
  return runner("single", yellowDuck);
};

yellowDuck.startWithThreadsPool = (options?: Options) => {
  return runner("threadsPool", yellowDuck, options);
};
