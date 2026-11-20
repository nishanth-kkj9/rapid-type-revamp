import { z } from "zod";

export function ensureZodJitless(): void {
  z.config({ jitless: true });
}

// Disable runtime JIT codegen (new Function) so Zod v4 complies strictly with `script-src 'self'`.
ensureZodJitless();

export { z };
