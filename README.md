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

内存方面，相较启动大量 Cluster，gopool 的内存占用率会大幅度下降；相较于仅启动单一 nodejs， gopool 有两倍的内存开销。

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

## 使用

首先编写 `worker.js`:

```js
const { gopool } = require("gopool");
const { config } = require("dotenv");

const hello = async ({body, ctx}) => {
  return { ...body };
};

const world = ({body, ctx}) => {
  return { ...body };
};

// 向 gopool 注册路由, 这些路由会以多线程的模式派发任务
gopool.get("/v1/hello", hello);
gopool.post("/v1/world", world);


// 在master所有路由注册完之后，在master启动服务
gopool.onMaster = ({app, ctx}) => {
  // env环境变量会由master传递给每个线程
  config();

  // 耗时的初始化请在master进行, 可以绑定在 ctx 上，ctx会传递给每个线程
  // 注意不可绑定函数对象至 ctx 中
  ctx.somebody = {
    hello:"world"
  };

  // 此任务由master响应
  app.get("/master/ping", (req) => {
    return { query: req.query };
  });
  console.log(`listen: http://${host}:${port}`);
  await app.listen({ port, host });
};

// 最后需要导出 gopool 对象
// gopoolServe 会接管路由，并且匹配多线程任务
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

### 通过 PM2 启动

安装到全局：

```sh
npm i -g gopool
```

仅使用 PM2 作为守护进程，仅启动 1 个任务：

```sh
pm2 start gopool -- dist/worker.js
```

### 直接使用 Node 命令启动

编写一个 `index.js`, 在其中标记 `worker.js` 的路径

```js
const path = require("path");
const { gopoolServe } = require("gopool/serve.js");

gopoolServe({
  filename: path.resolve(__dirname, "./worker.js"),
});
```

然后使用 node 启动 `index.js`:

```sh
node index.js
```

## 获取 headers

由于需要跨线程通讯，headers 尽可能仅传递必要的信息，所以 gopool 提供了一个 headersGetter 的方法

```ts
gopool.headerGetter = (headers) => {
  // 挑选必要的header
  return {
    "user-agent": headers["user-agent"],
  };
};

gopool.get("/v1/hello", async ({ headers }) => {
  return { hello: Date.now(), headers };
});
```

### 降级到单线程模式

可以通过取消导出 gopool, 改用 startInWorker 的方式, 改为传统单线程的运行方式。

修改 worker.js

```js
// 保持上面原有代码

// 取消导出 gopool
// module.exports = gopool;
const fastify = require("fastify");
const app = fastify();

gopool.startInWorker(app);
```

直接使用 node 执行

```sh
node worker.js
```

## API

CLI API

| 参数           | 说明                     | 默认值              |
| -------------- | ------------------------ | ------------------- |
| --timeout      | 每个任务的超时时间       | 10000               |
| --min-threads  | 保留的最小线程数         | 0                   |
| --max-threads  | 保留的最大线程数         | cups.length         |
| --max-queue    | 等执行的最大任务数       | cups.length \* 1000 |
| --idle-timeout | 任务结束后线程保留的时间 | 15000               |

---

执行参数：

```ts
interface Options {
  filename: string;
  infoUrl?: string;
  timeout?: number;
  minThreads?: number;
  maxThreads?: number;
  maxQueue?: number;
  idleTimeout?: number;
}
```
