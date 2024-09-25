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
async function mdToPdf(input, config = {}) {
    if (!hasContent(input) && !hasPath(input)) {
        throw new Error('The input is missing one of the properties "content" or "path".');
    }
    if (!config.port) {
        config.port = await (0, get_port_1.default)();
    }
    if (!config.basedir) {
        config.basedir = 'path' in input ? (0, helpers_1.getDir)(input.path) : process.cwd();
    }
    if (!config.dest) {
        config.dest = '';
    }
    const mergedConfig = Object.assign(Object.assign(Object.assign({}, config_1.defaultConfig), config), { pdf_options: Object.assign(Object.assign({}, config_1.defaultConfig.pdf_options), config.pdf_options) });
    const server = await (0, serve_dir_1.serveDirectory)(mergedConfig);
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
    finally {
        await (0, serve_dir_1.closeServer)(server);
    }
    return pdf;
}
exports.mdToPdf = mdToPdf;
// Ensure browser is closed when the process exits
process.on('exit', async () => {
    await closeBrowserInstance();
});
process.on('SIGINT', async () => {
    await closeBrowserInstance();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await closeBrowserInstance();
    process.exit(0);
});
exports.default = mdToPdf;
