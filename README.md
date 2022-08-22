# 🐤 yellow-duck

利用线程池执行您的 Nodejs 程序, 并且保持多线程代码编写在原有文件中.

## 起因

现在 Nodejs 在 I/O 密集型的性能是过剩的, 而在多核 CPU 和内存利用率上是落后的

<!-- 如果仅仅启动若干个 Cluster，生产机器的多核 CPU 利用率无法上去。 -->

## 目标

- [x] 守护进程
- [x] 更好的 worker_threads 开发体验
- [x] 弹性调整进程数量
- [x] 兼容 I/O 密集和 CPU 密集型的场景
- [ ] 自带一套极简的性能监控功能

## 约定

- 为了降低 Master 的工作量, 前后端通讯参数仅用 query 和 body

## 结构

```text
+--------+     +--------+     +--------------------+
| daemon | --> | master | --> | worker threads x n |
+--------+     +--------+     +--------------------+
```

- deamon 是主进程, 它做的仅仅是守护 master 进程, 确保如果 master 消亡会进行重启
- master 是多线程的管家, 它也是整个程序的对外的接口, 使用 fastify 进行路由注册和管理, 使用 piscina 进行多线程工作派发
- worker threads 根据任务量自动伸缩的线程, 我们的 99%的代码都在此.

## 缺点

- 为了更好的 worker-threas 任务派发的性能, 您所有代码的应该为惰性函数, 即加载 worker 时不应该被执行.
- 任务返回的对象暂时不支持 stream, 未来可能可以使用 [thread-stream](https://github.com/pinojs/thread-stream) 支持此类功能, 但是现在它还太早了.

## Performace

yellowDuck 基于 `fastify` 和 `piscina`.

诚然，使用事件循环明显比使用线程有着更高的 I/O 性能， 所以使用此方案在纯 I/O 密集任务会有所下降，但是依然保持在一个非常高的水准；而在计算密集型的场景，性能接近于等量 CPU 的 Cluster 启动。

内存方面，相较启动大量 Cluster, yellowDuck 的内存占用率会大幅度下降；相较于仅启动单一 nodejs， yellowDuck 有两倍的内存开销。

大白话解释: 牺牲少部分原本就过剩的 I/O 性能, 换取多核 CPU 的计算性能榨取, 在 I/O 性能、计算性能、内存利用率上争取综合最大化.

以下是一些测试数据，测试机型: `Apple M1 pro`

### 空闲

| 方案                     | QPS | MEM                  |
| ------------------------ | --- | -------------------- |
| node index.js            | -   | 40 MB                |
| pm2 start index.js -i 10 | -   | 400 MB               |
| node yellowDuck.js       | -   | 40 MB + 20(守护进程) |

### 简单请求

| 方案                     | QPS   | MEM    |
| ------------------------ | ----- | ------ |
| node index.js            | 22889 | 70 MB  |
| pm2 start index.js -i 10 | 20844 | 650 MB |
| node yellowDuck.js       | 14651 | 130 MB |

### 查询数据库，I/O 密集型

| 方案                     | QPS  | MEM    |
| ------------------------ | ---- | ------ |
| node index.js            | 6718 | 70 MB  |
| pm2 start index.js -i 10 | 4994 | 650 MB |
| node yellowDuck.js       | 6519 | 160 MB |

### I/O 密集型 + CPU 密集型

在每个请求中都进行一次 fibonacci(30) 的计算

| 方案                     | QPS  | MEM                        |
| ------------------------ | ---- | -------------------------- |
| node index.js            | 205  | 70 MB                      |
| pm2 start index.js -i 10 | 1584 | 请求中 720 MB, 空闲 650 MB |
| node yellowDuck.js       | 1454 | 请求中 250 MB, 空闲 160MB  |

我们可以看到，对于纯 I/O 密集型的任务，事件轮训是最高效的，Cluster 、worker_threads 都有一定的分流开销，而要兼顾一定的计算性能，使用 worker_threads 是可以接受的。

## 约定

- 路由层由 yellowDuck 管控

## 使用

首先编写 `worker.js`:

```js
const { yellowDuck } = require("yellow-duck");
const { config } = require("dotenv");

// 向 yellowDuck 注册路由, 这些路由会被 master 记录
yellowDuck.get("/v1/hello", async ({body, ctx}) => {
  return { ...body };
});
yellowDuck.post("/v1/world", ({body, ctx}) => {
  return { ...body };
});


// onMaster 的代码都仅仅会在 master 中执行, 比如启动 fastify 程序:
yellowDuck.onMaster = ({app, ctx}) => {
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

  console.log("listen: http://127.0.0.1:3000");
  // 启动您的 fastify 程序
  await app.listen({ port:3000 });
};

// 使用多线程启动服务
yellowDuck.startWithThreadsPool();

// 降级, 使用单线程启动服务
// yellowDuck.startWithSingle();

// 最后需要导出 yellowDuck 对象
// masterServe 会接管路由，并且匹配多线程任务
module.exports = yellowDuck;
```

## 获取 headers

由于需要跨线程通讯，headers 尽可能仅传递必要的信息，所以 yellowDuck 提供了一个 headersGetter 的方法

```ts
yellowDuck.headerGetter = (headers) => {
  // 挑选必要的header
  return {
    "user-agent": headers["user-agent"],
  };
};

yellowDuck.get("/v1/hello", async ({ headers }) => {
  return { hello: Date.now(), headers };
});
```

### 降级到单线程模式

可以通过取消导出 yellowDuck, 改用 startInWorker 的方式, 改为传统单线程的运行方式。

修改 index.js

```js
// 保持上面原有代码
yellowDuck.startWithSingle();

// 取消导出 yellowDuck
// module.exports = yellowDuck;
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
