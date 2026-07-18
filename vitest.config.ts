import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig ("@/*" → "src/*") — sem ele, testes de módulos
    // que importam "@/lib/..." falham ao carregar.
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
