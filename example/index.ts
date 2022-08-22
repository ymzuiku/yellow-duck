import fs from "node:fs";
import { yellowDuck } from "../lib";
import { cpuRoute } from "./cpuRoute";

yellowDuck.get("/v1/hello", ({ body }) => {
  return { ...body, ee: 111 };
});

yellowDuck.get("/v1/file", ({ body }) => {
  const pkg = fs.readFileSync("big.file");
  return String(pkg);
});

yellowDuck.get("/v1/pipe", ({ body }) => {
  return fs.createReadStream("./big.file");
  // return { kind: "stream", key: "fs.createReadStream", args: "./big.file" };
});

const list = [];
yellowDuck.get("/v1/err", ({ body }) => {
  if (Date.now() % 5 != 1) {
    list[10].dog = 20;
    throw "onot";
  }
  return { ...body, ee: 111 };
});

yellowDuck.onMaster = async ({ app, pool }) => {
  app.get("/v1/cpu", () => {
    return cpuRoute(pool);
  });
  console.log(`listen: http://127.0.0.1:6100`);
  await app.listen({ port: 6100 });
};

yellowDuck.startWithThreadsPool();
// yellowDuck.startWithSingle();

export default yellowDuck;
