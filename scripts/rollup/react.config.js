import { getPackageJSON, getBaseRollupPlugins, resolvePath } from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'

const { name, module } = getPackageJSON('react')
// react 包的路径
const reactPath = resolvePath(name)
// react 产物路径
const builtReactPath = resolvePath(name, true)

export default [
  // react
  {
    input: `${reactPath}/${module}`,
    output: {
      file: `${builtReactPath}/index.js`,
      name: 'react',
      format: 'umd',
    },
    plugins: [
      ...getBaseRollupPlugins(),
      generatePackageJson({
        inputFolder: reactPath,
        outputFolder: builtReactPath,
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          version,
          main: 'index.js',
        }),
      }),
    ],
  },
  // jsx-runtime
  {
    input: `${reactPath}/src/jsx.ts`,
    output: [
      // jsx-runtime
      {
        file: `${builtReactPath}/jsx-runtime.js`,
        name: 'jsx-runtime',
        format: 'umd',
      },
      // jsx-dev-runtime
      {
        file: `${builtReactPath}/jsx-dev-runtime.js`,
        name: 'jsx-dev-runtime',
        format: 'umd',
      },
    ],
    plugins: getBaseRollupPlugins(),
  },
]
