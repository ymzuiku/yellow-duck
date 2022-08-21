import type { FastifyInstance } from "fastify";
import type Piscina from "piscina";

export interface ServiceProps {
  uri: string;
  body: any;
  headers: Record<string, string | number | string[] | undefined>;
}
export type Service = (props: Omit<ServiceProps, "uri">) => any;

export type OnMasterProps = {
  app: FastifyInstance;
  pool: Piscina;
};
export type OnMaster = (props: OnMasterProps) => any;

export interface Options {
  filename?: string;
  timeout?: number;
  minThreads?: number;
  maxThreads?: number;
  maxQueue?: number;
  idleTimeout?: number;
}
