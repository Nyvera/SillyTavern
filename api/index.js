// Vercel Serverless Function Entry Point for SillyTavern (ESM Mode)

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// 1. Establish Ephemeral Filesystem Guardrails
const tmpDataRoot = path.join(os.tmpdir(), 'sillytavern-data');
if (!fs.existsSync(tmpDataRoot)) fs.mkdirSync(tmpDataRoot, { recursive: true });

import { CommandLineParser } from '../src/command-line.js';
import { serverDirectory } from '../src/server-directory.js';

const cliArgs = new CommandLineParser().parse([
    'node', 
    'server.js', 
    '--dataRoot', tmpDataRoot, 
    '--configPath', path.join(tmpDataRoot, 'config.yaml'),
    '--no-autorun'
]);

// Force serverless-safe runtime flags.
cliArgs.browserLaunchEnabled = false;
cliArgs.listen = false;
cliArgs.whitelistMode = false;
cliArgs.basicAuthMode = false;

globalThis.DATA_ROOT = cliArgs.dataRoot;
globalThis.COMMAND_LINE_ARGS = cliArgs;
process.env.NODE_ENV = 'production';
process.chdir(serverDirectory);

let appReady = false;

// 2. We use a dynamic import so that globalThis is fully populated first.
async function initApp() {
    if (appReady) return (await import('../src/server-main.js')).app;

    const { serverEvents, EVENT_NAMES } = await import('../src/server-events.js');
    
    return new Promise(async (resolve, reject) => {
        let timer = setTimeout(() => reject(new Error("Timeout: Failed to start after 12s")), 12000);
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            reject(new Error("Unhandled Rejection during boot: " + reason));
        });

        serverEvents.once(EVENT_NAMES.SERVER_STARTED, () => {
            console.log('Vercel: Express is ready mapped and compiled.');
            clearTimeout(timer);
            appReady = true;
            import('../src/server-main.js').then(m => resolve(m.app));
        });

        // Trigger the boot routines
        await import('../src/server-main.js');
    });
}

// Vercel Serverless Handler
export default async function (req, res) {
    try {
        const readyApp = await initApp();
        return readyApp(req, res);
    } catch (err) {
        console.error('Vercel Init Crash:', err);
        return res.status(500).json({ error: err.message, stack: err.stack });
    }
}
