import path from 'path'
import fs from 'fs'
import ts from 'rollup-plugin-typescript2'
import cjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

const packages = path.resolve(__dirname, '../../packages')
const dist = path.resolve(__dirname, '../../dist/node_modules')

export function resolvePath(name, isDist) {
  return isDist ? `${dist}/${name}` : `${packages}/${name}`
}

export function getPackageJSON(name) {
  const path = `${resolvePath(name)}/package.json`
  const info = fs.readFileSync(path, { encoding: 'utf-8' })
  return JSON.parse(info)
}

export function getBaseRollupPlugins(props = {}) {
  const {
    typescriptConfig = {},
    alias = {
      __DEV__: true,
      preventAssignment: true,
    },
  } = props
  return [replace(alias), cjs(), ts(typescriptConfig)]
}
