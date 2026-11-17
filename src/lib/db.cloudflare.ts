import { env } from "cloudflare:workers";

export type DbSource = "d1";

export const dbSource: DbSource = "d1";

export interface Sql {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

type D1Value = string | number | boolean | null | ArrayBuffer | ArrayBufferView;

type D1QueryResult<T> = {
  success: boolean;
  results?: T[];
  error?: string;
};

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1QueryResult<T>>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

function toD1Value(value: unknown): D1Value {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new TypeError(`Unsupported D1 parameter type: ${typeof value}`);
}

function bindParameters(text: string, params: unknown[]) {
  const values: D1Value[] = [];
  const query = text.replace(/\$(\d+)/g, (_placeholder, rawIndex: string) => {
    const index = Number(rawIndex) - 1;
    if (index < 0 || index >= params.length) {
      throw new Error(`Missing value for SQL parameter $${rawIndex}.`);
    }
    values.push(toD1Value(params[index]));
    return "?";
  });
  return { query, values };
}

function toSql(database: D1Database): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) {
      text += `$${i + 1}${strings[i + 1]}`;
    }
    return run<T>(database, text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(database, text, params);
  return sql;
}

async function run<T>(database: D1Database, text: string, params: unknown[]): Promise<T[]> {
  const { query, values } = bindParameters(text, params);
  const result = await database
    .prepare(query)
    .bind(...values)
    .all<T>();
  if (!result.success) {
    throw new Error(result.error || "Cloudflare D1 query failed.");
  }
  return result.results ?? [];
}

function getDatabase(): D1Database {
  const database = env.DB;
  if (!database) {
    throw new Error(
      "Cloudflare D1 binding DB is missing. Bind the whatthecraftgifts database to this Worker.",
    );
  }
  return database;
}

export function getSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.",
    );
  }
  return Promise.resolve(toSql(getDatabase()));
}

export function ensureDbReady(): Promise<void> {
  return Promise.resolve();
}

export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  throw new Error("PGLite is not available in the Cloudflare Worker runtime.");
}
