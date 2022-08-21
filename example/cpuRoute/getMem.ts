/* eslint-disable @typescript-eslint/no-explicit-any */
// process.memoryUsage().heapUsed
// console.log(Math.round(v8.getHeapStatistics().total_available_size / 1024 / 1024) + " MB");

export const getMem = (val: number) => {
  return Math.round(val / 1024 / 1024);
};

export const getObjMem = (obj: any): Record<string, string> => {
  const out = {} as any;
  Object.keys(obj).forEach((k) => {
    out[k] = getMem(obj[k]) + " MB";
  });
  return out;
};
