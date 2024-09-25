#!/usr/bin/env node

import getPort from 'get-port';
import puppeteer, { Browser } from 'puppeteer';
import { Config, defaultConfig, HtmlConfig, PdfConfig } from './lib/config';
import { HtmlOutput, Output, PdfOutput } from './lib/generate-output';
import { getDir } from './lib/helpers';
import { convertMdToPdf } from './lib/md-to-pdf';
import { closeServer, serveDirectory } from './lib/serve-dir';

type Input = ContentInput | PathInput;

interface ContentInput {
	content: string;
}

interface PathInput {
	path: string;
}

const hasContent = (input: Input): input is ContentInput => 'content' in input;
const hasPath = (input: Input): input is PathInput => 'path' in input;

// Singleton instance of Puppeteer browser
let browserInstance: Browser | null = null;

/**
 * Function to get the singleton Puppeteer browser instance.
 */
async function getBrowserInstance(config: Partial<Config> = {}): Promise<Browser> {
	if (!browserInstance) {
		browserInstance = await puppeteer.launch({ devtools: config.devtools, ...config.launch_options });
	}
	return browserInstance;
}

/**
 * Function to close the Puppeteer browser instance.
 */
async function closeBrowserInstance(): Promise<void> {
	if (browserInstance) {
		await browserInstance.close();
		browserInstance = null;
	}
}

/**
 * Convert a markdown file to PDF.
 */
export async function mdToPdf(input: ContentInput | PathInput, config?: Partial<PdfConfig>): Promise<PdfOutput>;
export async function mdToPdf(input: ContentInput | PathInput, config?: Partial<HtmlConfig>): Promise<HtmlOutput>;
export async function mdToPdf(input: Input, config: Partial<Config> = {}): Promise<Output> {
	if (!hasContent(input) && !hasPath(input)) {
		throw new Error('The input is missing one of the properties "content" or "path".');
	}

	if (!config.port) {
		config.port = await getPort();
	}

	if (!config.basedir) {
		config.basedir = 'path' in input ? getDir(input.path) : process.cwd();
	}

	if (!config.dest) {
		config.dest = '';
	}

	const mergedConfig: Config = {
		...defaultConfig,
		...config,
		pdf_options: { ...defaultConfig.pdf_options, ...config.pdf_options },
	};

	const server = await serveDirectory(mergedConfig);

	// Get the singleton browser instance
	const browser = await getBrowserInstance(mergedConfig);

	let pdf;
	try {
		pdf = await convertMdToPdf(input, mergedConfig, { browser });
	} catch (error) {
		console.error(error);
		throw error; // Re-throw the error after logging it
	} finally {
		await closeServer(server);
	}

	return pdf;
}

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

export default mdToPdf;

export interface PackageJson {
	engines: {
		node: string;
	};
	version: string;
}
