import getPublicLibConfig from './webpack.config.js';
import webpack from 'webpack';

const config = getPublicLibConfig({ forceDist: true, pruneCache: true });
console.log('Running Vercel build for lib.js...');

webpack(config).run((err, stats) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(stats.toString());
    process.exit(0);
});
