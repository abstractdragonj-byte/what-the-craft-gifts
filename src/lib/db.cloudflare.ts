import { neon } from "@neondatabase/serverless";

export type DbSource = "neon";

export const dbSource: DbSource = "neon";

export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) {
      text += `$${i + 1}${strings[i + 1]}`;
    }
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

function getDatabaseUrl(): string {
  const value = typeof process !== "undefined" ? process.env.DATABASE_URL?.trim() : undefined;
  if (!value) {
    throw new Error(
      "DATABASE_URL is missing from this Cloudflare Worker. Add it as a secret under Settings > Variables and Secrets.",
    );
  }
  return value;
}

export function getSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.",
    );
  }
  const query = neon(getDatabaseUrl());
  return Promise.resolve(
    toSql(async <T>(text: string, params: unknown[]) =>
      (await query.query(text, params)) as T[],
    ),
  );
}

export function ensureDbReady(): Promise<void> {
  return Promise.resolve();
}

export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  throw new Error("PGLite is not available in the Cloudflare Worker runtime.");
}
