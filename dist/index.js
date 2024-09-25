#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mdToPdf = void 0;
const get_port_1 = __importDefault(require("get-port"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const config_1 = require("./lib/config");
const helpers_1 = require("./lib/helpers");
const md_to_pdf_1 = require("./lib/md-to-pdf");
const serve_dir_1 = require("./lib/serve-dir");
const hasContent = (input) => 'content' in input;
const hasPath = (input) => 'path' in input;
// Singleton instance of Puppeteer browser
let browserInstance = null;
// Singleton instance of the server and port
let serverInstance = null;
/**
 * Function to get the singleton Puppeteer browser instance.
 */
async function getBrowserInstance(config = {}) {
    if (!browserInstance) {
        browserInstance = await puppeteer_1.default.launch(Object.assign({ devtools: config.devtools }, config.launch_options));
    }
    return browserInstance;
}
/**
 * Function to close the Puppeteer browser instance.
 */
async function closeBrowserInstance() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
}
/**
 * Function to get the singleton server instance.
 */
async function getServerInstance(config) {
    if (!serverInstance) {
        // Start the server only once
        const port = config.port || (await (0, get_port_1.default)());
        const server = await (0, serve_dir_1.serveDirectory)(Object.assign(Object.assign({}, config), { port }));
        serverInstance = { server, port };
    }
    return serverInstance;
}
/**
 * Function to close the server instance.
 */
async function closeServerInstance() {
    if (serverInstance) {
        await (0, serve_dir_1.closeServer)(serverInstance.server);
        serverInstance = null;
    }
}
async function mdToPdf(input, config = {}) {
    if (!hasContent(input) && !hasPath(input)) {
        throw new Error('The input is missing one of the properties "content" or "path".');
    }
    if (!config.basedir) {
        config.basedir = 'path' in input ? (0, helpers_1.getDir)(input.path) : process.cwd();
    }
    if (!config.dest) {
        config.dest = '';
    }
    const mergedConfig = Object.assign(Object.assign(Object.assign({}, config_1.defaultConfig), config), { pdf_options: Object.assign(Object.assign({}, config_1.defaultConfig.pdf_options), config.pdf_options) });
    // Get the singleton server instance
    const { port } = await getServerInstance(mergedConfig);
    mergedConfig.port = port; // Ensure the correct port is set in the config
    // Get the singleton browser instance
    const browser = await getBrowserInstance(mergedConfig);
    let pdf;
    try {
        pdf = await (0, md_to_pdf_1.convertMdToPdf)(input, mergedConfig, { browser });
    }
    catch (error) {
        console.error(error);
        throw error; // Re-throw the error after logging it
    }
    return pdf;
}
exports.mdToPdf = mdToPdf;
// Ensure resources are closed when the process exits
const cleanup = async () => {
    await closeBrowserInstance();
    await closeServerInstance();
};
process.on('beforeExit', cleanup);
process.on('exit', cleanup);
process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
});
exports.default = mdToPdf;
