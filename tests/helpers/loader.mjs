import { existsSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const extensions = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return {
      format: "module",
      shortCircuit: true,
      url: "data:text/javascript,export default {};",
    };
  }

  if (specifier === "@cloudflare/next-on-pages") {
    return {
      format: "module",
      shortCircuit: true,
      url: "data:text/javascript,export function getRequestContext() { return { env: { DB: globalThis.__TEST_D1_DB__ } }; }",
    };
  }

  if (specifier === "next/headers") {
    const candidate = pathResolve(process.cwd(), "node_modules/next/headers.js");
    if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
  }
  if (specifier === "next/server") {
    const candidate = pathResolve(process.cwd(), "node_modules/next/server.js");
    if (existsSync(candidate)) return nextResolve(pathToFileURL(candidate).href, context);
  }
  if (specifier === "next/cache") {
    return {
      format: "module",
      shortCircuit: true,
      url: "data:text/javascript,export function revalidatePath() {} export function revalidateTag() {} export function unstable_cache(fn) { return fn; }",
    };
  }

  if (specifier.startsWith("@/")) {
    const subpath = specifier.slice(2);
    const basePath = pathResolve(process.cwd(), "src", subpath);
    
    for (const ext of ["", ...extensions]) {
      const candidate = basePath + ext;
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const parentDir = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const basePath = pathResolve(parentDir, specifier);

    for (const ext of ["", ...extensions]) {
      const candidate = basePath + ext;
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}
