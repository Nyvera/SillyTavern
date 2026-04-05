import path from 'node:path';
import fs from 'node:fs';
import webpack from 'webpack';
import getPublicLibConfig from '../../webpack.config.js';

export default function getWebpackServeMiddleware() {
    /**
     * A very spartan recreation of webpack-dev-middleware.
     * @param {import('express').Request} req Request object.
     * @param {import('express').Response} res Response object.
     * @param {import('express').NextFunction} next Next function.
     * @type {import('express').RequestHandler}
     */
    function devMiddleware(req, res, next) {
        const publicLibConfig = getPublicLibConfig();
        let outputPath = publicLibConfig.output?.path;
        const outputFile = publicLibConfig.output?.filename;
        const parsedPath = path.parse(req.path);

        // In Vercel builds, the hash can differ between build-time and runtime metadata.
        // Resolve the first available dist output folder containing lib.js.
        if (process.env.VERCEL_MODE === 'true') {
            const roots = [
                path.resolve(process.cwd(), 'dist', '_webpack'),
                path.resolve(process.cwd(), '..', 'dist', '_webpack'),
            ];

            for (const distWebpackRoot of roots) {
                if (fs.existsSync(distWebpackRoot)) {
                    const candidates = fs.readdirSync(distWebpackRoot, { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => path.join(distWebpackRoot, dirent.name, 'output'));

                    const existing = candidates.find(candidate => fs.existsSync(path.join(candidate, 'lib.js')));
                    if (existing) {
                        outputPath = existing;
                        break;
                    }
                }
            }
        }

        if (req.method === 'GET' && parsedPath.dir === '/' && parsedPath.base === outputFile) {
            return res.sendFile(outputFile, { root: outputPath });
        }

        next();
    }

    /**
     * Wait until Webpack is done compiling.
     * @param {object} param Parameters.
     * @param {boolean} [param.forceDist=false] Whether to force the use the /dist folder.
     * @param {boolean} [param.pruneCache=false] Whether to prune old cache directories before compiling.
     * @returns {Promise<void>}
     */
    devMiddleware.runWebpackCompiler = ({ forceDist = false, pruneCache = false } = {}) => {
        console.log();
        if(process.env.VERCEL_MODE === "true") { console.log("Vercel Mode: Skipping Webpack Compilation."); return Promise.resolve(); }
        console.log("Compiling frontend libraries...");

        const publicLibConfig = getPublicLibConfig({ forceDist, pruneCache });
        const compiler = webpack(publicLibConfig);

        return new Promise((resolve) => {
            compiler.run((_error, stats) => {
                const output = stats?.toString(publicLibConfig.stats);
                if (output) {
                    console.log(output);
                    console.log();
                }
                compiler.close(() => {
                    resolve();
                });
            });
        });
    };

    return devMiddleware;
}
