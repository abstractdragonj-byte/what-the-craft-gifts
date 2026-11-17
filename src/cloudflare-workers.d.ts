interface D1PreparedStatement {
  bind(
    ...values: (string | number | boolean | null | ArrayBuffer | ArrayBufferView)[]
  ): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{
    success: boolean;
    results?: T[];
    error?: string;
  }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

declare module "cloudflare:workers" {
  export const env: { DB: D1Database };
}
