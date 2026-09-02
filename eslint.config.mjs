import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Pre-existing React Compiler violations in upstream NextAdmin template
    // (setState-in-effect / refs-in-render). Kode kita TIDAK di-ignore —
    // file ini tidak akan disentuh (template vendor).
    "src/components/tailgrids/core/carousel.tsx",
    "src/components/tailgrids/core/otp-input.tsx",
    "src/components/tailgrids/core/tooltip.tsx",
    "src/hooks/use-media-query.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
]);

export default eslintConfig;
