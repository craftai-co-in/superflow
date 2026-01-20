import esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import. meta.url);
const __dirname = dirname(__filename);

async function build() {
  try {
    console.log('Starting server build...');
    
    await esbuild.build({
      entryPoints: [resolve(__dirname, 'server/index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'esm',
      outfile: resolve(__dirname, 'dist/index.js'),
      external: [
        // Core Node modules
        'node:*',
        
        // Build-time only dependencies
        'lightningcss',
        '@babel/preset-typescript',
        'esbuild',
        'vite',
        '@vitejs/plugin-react',
        'drizzle-kit',
        'tsx',
        'tailwindcss',
        'postcss',
        'autoprefixer',
        
        // Optional dependencies
        'fsevents',
        'bufferutil',
        'utf-8-validate',
        
        // All npm packages (let Node resolve them at runtime)
        /^[^./]|^\.[^./]|^\.\.[^/]/
      ],
      minify: false,
      sourcemap: true,
      logLevel:  'info',
      mainFields: ['module', 'main'],
      conditions: ['node', 'import'],
    });
    
    console.log('✅ Server build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();