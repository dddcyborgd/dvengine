import path from "path";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vitest/config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@oncyberio/engine/internal": path.resolve(
        __dirname,
        "test/support/engine-internal.ts"
      ),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
