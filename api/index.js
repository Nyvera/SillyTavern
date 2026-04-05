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

// 2. Import the backend module to trigger side-effect init flow
import { app } from '../src/server-main.js';

// Vercel Serverless Handler
export default function (req, res) {
    // Pass the request to the bound express instance app
    return app(req, res);
}
