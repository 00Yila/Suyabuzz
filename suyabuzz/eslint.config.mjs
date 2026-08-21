// Uses eslint-config-next's native flat-config exports rather than the
// legacy FlatCompat().extends('next/core-web-vitals', 'next/typescript')
// shim: with eslint-config-next 16.x + ESLint 9, FlatCompat crashes with
// "TypeError: Converting circular structure to JSON" while formatting a
// config-validation error, because eslint-plugin-react's flat config
// self-references itself (documented upstream: vercel/next.js#85244,
// eslint/eslint#20237). The native exports avoid FlatCompat entirely.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    ignores: ['.next/', 'src/payload-types.ts', 'src/payload-generated-schema.ts'],
  },
]

export default eslintConfig
