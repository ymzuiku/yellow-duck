# gopool

利用线程池执行您的 Nodejs

## 起因

在一个生产实例中，我们有一台机器使用 pm2 启动了大概 17 个 Cluster；这导致于空闲状态下也会有 2.5GB 的 node 内存开销，Cluster 的内存复用率较低，并且无法根据请求量弹性的调整集群数量。

<!-- 如果仅仅启动若干个 Cluster，生产机器的多核 CPU 利用率无法上去。 -->

## 目标

- [x] 更好的 worker_threads 开发体验
- [x] 弹性调整进程数量
- [x] 兼容 I/O 密集和 CPU 密集型的场景
- [ ] 自带一套极简的性能监控功能(未来目标)

## Performace

gopool 基于 `fastify` 和 `piscina`.

诚然，使用事件循环明显比使用线程有着更高的 I/O 性能， 所以使用此方案在纯 I/O 密集任务会有所下降，但是依然保持在一个非常高的水准；而在计算密集型的场景，性能接近于 全量 CPU 的 Cluster 启动。

内存方面，相较启动大量 Cluster，gopool 的内存占用率会大幅度下降，但是相较于仅仅启动一个 nodejs gopool 有两倍的内存开销。

以下是一些测试数据，测试机型: `Apple M1 pro`

### 简单请求

| 方案                     | QPS   | MEM    |
| ------------------------ | ----- | ------ |
| node index.js            | 22889 | 70 MB  |
| pm2 start index.js -i 10 | 20844 | 650 MB |
| gopool worker.js         | 14651 | 130 MB |

### 查询数据库，I/O 密集型

| 方案                     | QPS  | MEM    |
| ------------------------ | ---- | ------ |
| node index.js            | 6718 | 70 MB  |
| pm2 start index.js -i 10 | 4994 | 650 MB |
| gopool worker.js         | 6519 | 160 MB |

### I/O 密集型 + CPU 密集型

在每个请求中都进行一次 fibonacci(30) 的计算

| 方案                     | QPS  | MEM                        |
| ------------------------ | ---- | -------------------------- |
| node index.js            | 205  | 70 MB                      |
| pm2 start index.js -i 10 | 1584 | 请求中 720 MB, 空闲 650 MB |
| gopool worker.js         | 1454 | 请求中 250 MB, 空闲 160MB  |

我们可以看到，对于纯 I/O 密集型的任务，事件轮训是最高效的，Cluster 、worker_threads 都有一定的分流开销，而要兼顾一定的计算性能，使用 worker_threads 是可以接受的，关键是 worker_threads 使用体验。

## 约定

- 路由层由 gopool 管控
- gopool 启动时会使用 `dotenv` 从执行目录开始向上查找 `.env` 文件，并且在每个 worker 启动时会传递 env 对象，这是为了减少 worker 不必要的 env 读取行为
- gopool 执行的所有模块均为 cjs 类型的文件

## 使用

首先编写 `worker.js`:

```js
const { gopool } = require("gopool");

const hello = async (body: any) => {
  return { ...body };
};

const world = (body: any) => {
  return { ...body };
};

// 向 gopool 注册好路由
gopool.get("/v1/hello", hello);
gopool.post("/v1/world", world);

// 在启动服务之前的钩子
gopool.beforeAll = async () => {
  const res = await fetch("http://someting");
  console.log(res);
};

// 导出 gopool 对象，gopoolServe 会接管路由，并且匹配多线程任务
module.exports = gopool;
```

### 使用 CLI 启动

安装：

```sh
npm i gopool --save
```

启动：

```sh
npx gopool worker.js
```

默认配置如下：

```sh
npx gopool worker.js --host=127.0.0.1 --port=3800 --timeout=10000
```

查看服务器状态, 启动后访问: `http://localhost:3800/gopool` :

```sh
npx gopool worker.js --info-url='/gopool'
```

### 通过 PM2 启动

安装到全局：

```sh
npm i -g gopool
```

仅使用 PM2 作为守护进程，仅启动 1 个任务：

```sh
pm2 start gopool -- dist/worker.js --port=8200 --info-url=/gopool
```

### 直接使用 Node 命令启动

编写一个 `index.js`, 在其中标记 `worker.js` 的路径

```js
const path = require("path");
const { gopoolServe } = require("gopool/serve.js");

gopoolServe({
  filename: path.resolve(__dirname, "./worker.js"),
  host: "127.0.0.1",
  port: 3800,
  infoUrl: "/gopool",
});
```

然后使用 node 启动 `index.js`:

```sh
node index.js
```

## API

CLI API

| 参数          | 说明                               | 默认值              |
| ------------- | ---------------------------------- | ------------------- |
| --host        |                                    | "127.0.0.1"         |
| --port        |                                    | 3800                |
| --info-url    | 启动一个查看负载的接口             | ""                  |
| --timeout     | 每个任务的最大时长，超时会取消任务 | 10000               |
| --min-threads | 保留的最小线程数                   | 0                   |
| --max-threads | 保留的最大线程数                   | cups.length         |
| --max-queue   | 等执行的最大任务数                 | cups.length \* 1000 |

---

执行参数：

```ts
interface Options {
  host: string;
  port: number;
  filename: string;
  infoUrl?: string;
  timeout?: number;
  minThreads?: number;
  maxThreads?: number;
  maxQueue?: number;
}
```
