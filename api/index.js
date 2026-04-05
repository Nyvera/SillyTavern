// Vercel Serverless Function Entry Point for SillyTavern (ESM Mode)

import os from 'os';
import path from 'path';

// 1. Establish Ephemeral Filesystem Guardrails
globalThis.DATA_ROOT = path.join(os.tmpdir(), 'sillytavern-data');
globalThis.COMMAND_LINE_ARGS = {
    dataRoot: globalThis.DATA_ROOT,
    dnsPreferIPv6: false
};
process.env.NODE_ENV = 'production';

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
