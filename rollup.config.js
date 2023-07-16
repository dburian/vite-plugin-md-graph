import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [{
  input: ['src/index.ts'],
  output: {
    dir: 'dist/',
    format: 'es',
    sourcemap: true,
  },
  plugins: [typescript()],
},
// {
//   input: './src/virt_graph_module.d.ts',
//   external: ['vite-plugin-md-graph/types'],
//   output: {
//     file: 'dist/types/virt_graph_module.d.ts',
//     format: 'es',
//   },
//   plugins: [dts()],
// }
];
