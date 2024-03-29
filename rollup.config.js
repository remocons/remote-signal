import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'
import pkg from './package.json'
const year = new Date().getFullYear();
const bannerShort = `/*!
 ${year} ${pkg.author}
 @version ${pkg.version}
*/`;


export default [
  {
    input: './indexWebBrowser.js',
    output: [
      {
        banner: bannerShort,
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
        banner: bannerShort,
        file: pkg.browserESM,
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
    input: './index.js',
    output: [
      { file: pkg.main,
        format: 'cjs'
      }
      , { file: pkg.esm, format: 'es' }
    ],
    plugins: [
      resolve({
        preferBuiltins: true
      }), 
      commonjs()
      ,terser() 
    ]
  }

]
