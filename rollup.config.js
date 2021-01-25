import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import minify from 'rollup-plugin-babel-minify';
import pkg from './package.json';

export default [{
    input: 'dist/browser.js',
    output: {
        name: "SpaEmulator",
        file: pkg.browser,
        format: 'iife',
        sourcemap: true,
    },
    plugins: [
        resolve(),
        commonjs(),
        minify({ comments: false }),
    ],
}];
