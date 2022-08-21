import { gopool } from "../lib";
import { cpuRoute } from "./cpuRoute";

gopool.get("/v1/hello", ({ body }) => {
  return { ...body, ee: 111 };
});

const list = [];
gopool.get("/v1/err", ({ body }) => {
  if (Date.now() % 5 != 1) {
    list[10].dog = 20;
    throw "onot";
  }
  return { ...body, ee: 111 };
});

gopool.onMaster = async ({ app, pool }) => {
  app.get("/v1/cpu", () => {
    return cpuRoute(pool);
  });
  console.log(`listen: http://127.0.0.1:6100`);
  await app.listen({ port: 6100 });
};

gopool.startWithThreadsPool();

export default gopool;
