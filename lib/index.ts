/* eslint-disable @typescript-eslint/no-explicit-any */
const routes = [] as any;
const handles = {} as any;

export const gopool = async ({ uri, body }: { uri: string; body: any }) => {
  const handle = handles[uri];
  if (!handle) {
    return Error("Not found uri: " + uri);
  }
  return await Promise.resolve(handle(body));
};

gopool.routes = routes;

gopool.all = (url: string, service: any) => {
  routes.push({
    url,
    method: "ALL",
  });
  handles["ALL" + url] = service;
};

gopool.get = (url: string, service: any) => {
  routes.push({
    url,
    method: "GET",
  });
  handles["GET" + url] = service;
};

gopool.post = (url: string, service: any) => {
  routes.push({
    url,
    method: "POST",
  });
  handles["POST" + url] = service;
};

gopool.put = (url: string, service: any) => {
  routes.push({
    url,
    method: "PUT",
  });
  handles["PUT" + url] = service;
};

gopool.delete = (url: string, service: any) => {
  routes.push({
    url,
    method: "DELETE",
  });
  handles["DELETE" + url] = service;
};

gopool.options = (url: string, service: any) => {
  routes.push({
    url,
    method: "OPTIONS",
  });
  handles["OPTIONS" + url] = service;
};

gopool.beforeAll = void 0 as any;
