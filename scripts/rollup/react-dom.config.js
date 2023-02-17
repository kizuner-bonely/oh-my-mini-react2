import { getPackageJSON, getBaseRollupPlugins, resolvePath } from './utils'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

const { name, module } = getPackageJSON('react-dom')
// react-dom 包的路径
const reactDOMPath = resolvePath(name)
// react-dom 产物路径
const builtReactDOMPath = resolvePath(name, true)

console.log('reactDOMPath', reactDOMPath)
console.log('builtReactDOMPath', builtReactDOMPath)

export default [
  {
    input: `${reactDOMPath}/${module}`,
    output: [
      {
        file: `${builtReactDOMPath}/index.js`,
        name: 'index.js',
        format: 'umd',
      },
      {
        file: `${builtReactDOMPath}/index.js`,
        name: 'client.js',
        format: 'umd',
      },
    ],
    plugins: [
      ...getBaseRollupPlugins(),
      alias({
        entries: {
          hostConfig: `${reactDOMPath}/src/hostConfig.ts`,
        },
      }),
      generatePackageJson({
        inputFolder: reactDOMPath,
        outputFolder: builtReactDOMPath,
        baseContents: ({ name, description, version }) => ({
          name,
          description,
          version,
          main: 'index.js',
          peerDependencies: {
            react: version,
          },
        }),
      }),
    ],
  },
]
