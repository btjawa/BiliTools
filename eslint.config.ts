import js from '@eslint/js';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: [
      'dist',
      'node_modules',
      '*.min.*',
      'src/services/backend.ts',
      'src/shims/*',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,mjs,cjs,js}'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      eqeqeq: ['error'],
    }
  },
  {
    files: ['scripts/*.{mjs,cjs,js}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginVue.configs['flat/recommended'],
  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parser: vueParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      eqeqeq: ['error'],
    },
  },
  eslintConfigPrettier,
]);
