import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Só avisa quem compila com o React Compiler, que o projeto não usa.
      'react-hooks/incompatible-library': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },
  {
    // Componentes de base (variantes junto do componente) e providers (provider + hook)
    // exportam mais que um componente por desenho.
    files: ['src/components/ui/**', 'src/providers/**'],
    rules: { 'react-refresh/only-export-components': 'off' }
  }
)
