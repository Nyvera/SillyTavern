import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import getPublicLibConfig from './webpack.config.js';
import webpack from 'webpack';

globalThis.DATA_ROOT = process.cwd() + '/data';

const config = getPublicLibConfig({ forceDist: true, pruneCache: true });
console.log('Compiling frontend libraries for Vercel...');

webpack(config).run((err, stats) => {
    if (err) {
        console.error(err.stack || err);
        if (err.details) console.error(err.details);
        process.exit(1);
    }
    const info = stats.toJson();
    if (stats.hasErrors()) {
        console.error(info.errors);
        process.exit(1);
    }
    if (stats.hasWarnings()) {
        console.warn(info.warnings);
    }
    
    // Copy the compiled file over the source one so Vercel serves the compiled bundle statically!
    const compiledPath = path.join(config.output.path, config.output.filename);
    const targetPath = path.join(process.cwd(), 'public/lib.js');
    console.log(`Moving compiled ${compiledPath} to ${targetPath}`);
    fs.copyFileSync(compiledPath, targetPath);
    console.log('lib.js built successfully!');
});
