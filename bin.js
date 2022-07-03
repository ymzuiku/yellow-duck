#!/usr/bin/env node
const path = require("path");
const { gopoolServe } = require("./serve");
const argv = process.argv.splice(2);

let port = 3800;
let host = "127.0.0.1";
let infoUrl = "";
let timeout = 10000;
let filename = argv[0];

let minThreads = 0;
let maxThreads = undefined;
let maxQueue = undefined;

argv.forEach((v) => {
  if (/--port=/.test(v)) {
    port = Number(v.replace("--port=", ""));
    if (isNaN(port)) {
      throw Error("[gopool] port is error");
    }
  } else if (/--host=/.test(v)) {
    host = v.replace("--host=", "");
  } else if (/--timeout=/.test(v)) {
    timeout = Number(v.replace("--timeout=", ""));
    if (isNaN(timeout)) {
      throw Error("[gopool] timeout is error");
    }
  } else if (/--info-url=/.test(v)) {
    infoUrl = v.replace("--info-url=", "");
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
  }
});

const input = {};
const opt = {
  port,
  host,
  filename: path.resolve(process.cwd(), filename),
  infoUrl,
  timeout,
  minThreads,
  maxThreads,
  maxQueue,
};

Object.keys(opt).forEach((k) => {
  if (opt[k] !== void 0) {
    input[k] = opt[k];
  }
});

gopoolServe(input);
