interface D1Database {
  prepare(query: string): any;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: any[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

declare global {
  interface CloudflareEnv {
    DB?: D1Database;
  }
}
