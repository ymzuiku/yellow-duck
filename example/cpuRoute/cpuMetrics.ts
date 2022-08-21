import os from "node:os";
// 获取当前的瞬时CPU时间
const instantaneousCpuTime = () => {
  let idleCpu = 0;
  let tickCpu = 0;
  const cpus = os.cpus();
  const length = cpus.length;

  let i = 0;
  while (i < length) {
    const cpu = cpus[i];

    for (const type in cpu.times) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tickCpu += (cpu as any).times[type];
    }

    idleCpu += cpu.times.idle;
    i++;
  }

  const time = {
    idle: idleCpu / cpus.length, // 单核CPU的空闲时间
    tick: tickCpu / cpus.length, // 单核CPU的总时间
  };
  return time;
};

let lastCpu = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastFixCpu: any = null;

export const cpuMetrics = (): number => {
  (async function () {
    const startQuantize = instantaneousCpuTime();
    if (lastFixCpu) {
      clearTimeout(lastFixCpu);
      lastFixCpu = null;
    }
    lastFixCpu = setTimeout(() => {
      const endQuantize = instantaneousCpuTime();
      const idleDifference = endQuantize.idle - startQuantize.idle;
      const tickDifference = endQuantize.tick - startQuantize.tick;
      const u = 1 - idleDifference / tickDifference;
      lastCpu = u;
      setTimeout(() => {
        lastCpu = 0;
      }, 10000);
    }, 1000);
  })();
  return lastCpu;
};
