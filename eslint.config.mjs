import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Safe __dirname replacement for Node and Edge compatibility
const __filename = fileURLToPath(import.meta.url);
const baseDir = typeof __dirname !== 'undefined' ? __dirname : dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: baseDir,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
