// Vercel Serverless Function Entry Point for SillyTavern (ESM Mode)

import os from 'node:os';
import path from 'node:path';
import { CommandLineParser } from '../src/command-line.js';
import { serverDirectory } from '../src/server-directory.js';

// 1. Establish Ephemeral Filesystem Guardrails
const tmpDataRoot = path.join(os.tmpdir(), 'sillytavern-data');
// Pass tmpdir seamlessly using CLI args parser which calls setConfigFilePath and sets up global variables
const cliArgs = new CommandLineParser().parse([
    'node', 
    'server.js', 
    '--dataRoot', tmpDataRoot, 
    '--configPath', path.join(tmpDataRoot, 'config.yaml')
]);

globalThis.DATA_ROOT = cliArgs.dataRoot;
globalThis.COMMAND_LINE_ARGS = cliArgs;
process.env.NODE_ENV = 'production';
process.chdir(serverDirectory);

let appReady = false;

// 2. We use a dynamic import so that globalThis is fully populated first.
async function initApp() {
    if (appReady) return (await import('../src/server-main.js')).app;

    const { serverEvents, EVENT_NAMES } = await import('../src/server-events.js');
    const { app } = await import('../src/server-main.js');

    return new Promise((resolve) => {
        // Wait for SillyTavern's async init pipeline (Webpack, DB migration, routing) to finish
        serverEvents.once(EVENT_NAMES.SERVER_STARTED, () => {
            console.log('Vercel: Express is ready mapped and compiled.');
            appReady = true;
            resolve(app);
        });
    });
}

// Vercel Serverless Handler
export default async function (req, res) {
    const readyApp = await initApp();
    return readyApp(req, res);
}
