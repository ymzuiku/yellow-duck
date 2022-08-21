import os from "node:os";
import v8 from "v8";
import { cpuMetrics } from "./cpuMetrics";
import { getMem, getObjMem } from "./getMem";
const toHour = 1000 * 60 * 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cpuRoute = async (pool?: any) => {
  const sysFree = os.freemem();
  const sysTotal = os.totalmem();

  const data = {
    os: {
      cpu: "",
      cpus: `${os.cpus().length} U`,
      totalmem: `${getMem(sysTotal)} MB`,
      freemem: `${getMem(sysFree)} MB`,
      uptime: `${os.uptime() / toHour} hour`,
    },
    v8: getObjMem(v8.getHeapStatistics()),
    memoryUsage: getObjMem(process.memoryUsage()),
    pool: pool && {
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
