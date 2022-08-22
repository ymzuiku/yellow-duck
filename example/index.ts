import fs from "node:fs";
import { yellowDuck } from "../lib";

function fibonacci(n: number) {
  if (n == 1 || n == 2) {
    return 1;
  }
  return fibonacci(n - 2) + fibonacci(n - 1);
}

yellowDuck.get("/v1/hello", ({ body }) => {
  // fibonacci(30);
  return { dog: 111 };
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
  list[10].dog = 20;
  throw "onot";
});

// yellowDuck.onMaster = async ({ app, pool }) => {
//   app.get("/v1/cpu", () => {
//     return cpuRoute(pool);
//   });
//   console.log(`listen: http://127.0.0.1:6100`);
//   await app.listen({ port: 6100 });
// };

yellowDuck.startWithThreadsPool();
// yellowDuck.startWithSingle();

export default yellowDuck;
