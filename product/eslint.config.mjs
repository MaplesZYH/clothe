import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/next-env.d.ts",
      "design-system/**",
      "openspec/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
);
