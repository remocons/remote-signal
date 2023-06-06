import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'
import pkg from './package.json'

export default [
  {
    input: './src/browserDefault.js',
    output: [
      {
        file: pkg.browser,
        format: 'iife', 
        name: 'Remote',
        sourcemap: true,
      }

    ],
    plugins: [
      replace({
        crypto: '',
        delimiters: ['import { webcrypto } from \'', '\''],
        preventAssignment: true
      }),
      resolve(), 
      commonjs() 
      ,terser() 
    ]
  }
  ,{
    input: './src/client/RemoteWebSocket.js',
    output: [
      {
        file: pkg.browser_esm,
        format: 'es', // 
        sourcemap: true,
      }
    ],
    plugins: [
      replace({
        crypto: '',
        delimiters: ['import { webcrypto } from \'', '\''],
        preventAssignment: true
      }),
      resolve(), 
      commonjs() 
      ,terser() 
    ]
  }
  ,{
    input: './src/index.js',
    external: ['node:stream'],
    output: [
      { file: pkg.main,
        format: 'cjs',
        globals: {
          'node:stream': 'Transform'
        }
      },
      { file: pkg.esm, format: 'es' }
    ],
    plugins: [
      resolve(), 
      commonjs()
      ,terser() 
    ]
  }

]
