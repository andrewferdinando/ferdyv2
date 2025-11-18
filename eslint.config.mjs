import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

// Safe __dirname replacement for Node and Edge compatibility
const DIRNAME = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const __filename = fileURLToPath(import.meta.url);
// In ESM context, DIRNAME will be process.cwd(), so use dirname(__filename) as fallback
const baseDir = DIRNAME !== process.cwd() ? DIRNAME : dirname(__filename);

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
