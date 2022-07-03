#!/usr/bin/env node
const path = require("path");
const { gopoolServe } = require("./serve");
const argv = process.argv.splice(2);

let timeout = 10000;
let filename = argv[0];

let minThreads = 0;
let maxThreads = undefined;
let maxQueue = undefined;
let idleTimeout = undefined;

argv.forEach((v) => {
  if (/--timeout=/.test(v)) {
    timeout = Number(v.replace("--timeout=", ""));
    if (isNaN(timeout)) {
      throw Error("[gopool] timeout is error");
    }
  } else if (/--min-threads=/.test(v)) {
    minThreads = Number(v.replace("--min-threads=", ""));
    if (isNaN(minThreads)) {
      throw Error("[gopool] --min-threads is error");
    }
  } else if (/--max-threads=/.test(v)) {
    maxThreads = Number(v.replace("--max-threads=", ""));
    if (isNaN(maxThreads)) {
      throw Error("[gopool] --max-threads is error");
    }
  } else if (/--max-queue=/.test(v)) {
    maxQueue = Number(v.replace("--max-queue=", ""));
    if (isNaN(maxQueue)) {
      throw Error("[gopool] --max-queue is error");
    }
  } else if (/--idle-timeout=/.test(v)) {
    idleTimeout = Number(v.replace("--idle-timeout=", ""));
    if (isNaN(idleTimeout)) {
      throw Error("[gopool] --idle-timeout is error");
    }
  }
});

const input = {};
const opt = {
  filename: path.resolve(process.cwd(), filename),
  timeout,
  minThreads,
  maxThreads,
  maxQueue,
  idleTimeout,
};

Object.keys(opt).forEach((k) => {
  if (opt[k] !== void 0) {
    input[k] = opt[k];
  }
});

gopoolServe(input);
