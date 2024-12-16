import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import {readFileSync} from 'node:fs';

// TODO: Replace this with a regular import when ESLint adds support for import assertions.
// See: https://rollupjs.org/guide/en/#importing-packagejson
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));

export const nodeResolve = resolve({
  browser: true,
  preferBuiltins: false
});

export default [{
  input: 'src/index.ts',
  output: [
    {
      file: pkg.minimized,
      name: "directions",
      format: 'umd',
      sourcemap: true,
      freeze: false,
      esModule: false
    },
    {
      file: pkg.module,
      format: 'esm',
      sourcemap: true,
      freeze: false
    },
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
      freeze: false
    },
  ],
  plugins: [
    json(),
    terser({
      compress: {
        // eslint-disable-next-line camelcase
        pure_getters: true,
        passes: 3
      }
    }),
    nodeResolve,
    typescript(),
    commonjs({
      ignoreGlobal: true
    })
  ],
  moduleContext: (id) => {
    // In order to match native module behaviour, Rollup sets `this`
    // as `undefined` at the top level of modules. Rollup also outputs
    // a warning if a module tries to access `this` at the top level.
    // The following modules use `this` at the top level and expect it
    // to be the global `window` object, so we tell Rollup to set
    // `this = window` for these modules.
    const thisAsWindowForModules = [
      'node_modules/@geoapify/geocoder-autocomplete/dist/index.js',
      'node_modules/@geoapify/geocoder-autocomplete/dist/autocomplete.js'
    ];
  
    if (thisAsWindowForModules.some(id_ => id.trimRight().endsWith(id_))) {
      return 'window';
    }
  }
}]