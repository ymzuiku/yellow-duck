import os from "node:os";
import { cpuMetrics } from "./cpuMetrics";
const toMb = 100000;
const toHour = 1000 * 60 * 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const osInfo = async (pool: any) => {
  const { arrayBuffers, external, heapTotal, heapUsed, rss } = process.memoryUsage();
  const sysFree = os.freemem();
  const sysTotal = os.totalmem();

  const data = {
    os: {
      cpu: "",
      cpus: `${os.cpus().length} U`,
      totalmem: `${sysTotal / toMb} MB`,
      freemem: `${sysFree / toMb} MB`,
      uptime: `${os.uptime() / toHour} hour`,
    },
    memoryUsage: {
      rss: `${rss / toMb} MB`,
      heapUsed: `${heapUsed / toMb} MB`,
      heapTotal: `${heapTotal / toMb} MB`,
      arrayBuffers: `${arrayBuffers / toMb} MB`,
      external: `${external / toMb} MB`,
    },
    pool: {
      "QPS/TPS": pool.completed / (pool.duration / 1000),
      threads: pool.threads.length,
      queueSize: pool.queueSize,
      completed: pool.completed,
      duration: `${pool.duration / toHour} hour`,
      utilization: pool.utilization,
      // runTime: pool.runTime,
      // waitTime: pool.waitTime,
    },
  };
  const cpu = cpuMetrics();
  data.os.cpu = cpu === 0 ? "load at next second" : `${cpu * 100}%`;
  return JSON.stringify(data, null, 2);
};
