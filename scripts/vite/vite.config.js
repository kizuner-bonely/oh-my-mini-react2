// @ts-nocheck
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import replace from '@rollup/plugin-replace'
import { resolvePath } from '../rollup/utils'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    replace({
      __DEV__: true,
      preventAssignment: true,
    }),
  ],
  resolve: {
    alias: [
      {
        find: 'react',
        replacement: resolvePath('react'),
      },
      {
        find: 'react-dom',
        replacement: resolvePath('react-dom'),
      },
      {
        find: 'hostConfig',
        replacement: path.resolve(
          resolvePath('react-dom'),
          './src/hostConfig.ts',
        ),
      },
    ],
  },
})
