import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // Dead code and unused imports were a recurring quality issue in past
      // submissions — fail the build on them instead of catching it late.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      // next/core-web-vitals already registers the jsx-a11y plugin with a
      // small built-in subset of rules. We merge in the FULL "recommended"
      // rule set (34 rules) on top of it here — re-declaring the plugin
      // itself would conflict in flat config, so only `rules` is spread.
      ...jsxA11y.flatConfigs.recommended.rules,
      'jsx-a11y/no-autofocus': 'error',
    },
  },
];

export default eslintConfig;
