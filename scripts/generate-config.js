/**
 * Generates bigcommerce-stencil-package/assets/loginradius/assets/js/config.js
 * from config.template.js, substituting values read from .env.
 *
 * Usage:  node scripts/generate-config.js
 *
 * No dependencies: plain Node, so a fresh clone needs no npm install.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const PACKAGE_JS_DIR = path.join(
	ROOT,
	'bigcommerce-stencil-package/assets/loginradius/assets/js'
);
const TEMPLATE_PATH = path.join(PACKAGE_JS_DIR, 'config.template.js');
const OUTPUT_PATH = path.join(PACKAGE_JS_DIR, 'config.js');

// Placeholder token in the template -> .env variable name.
const REQUIRED = {
	__LR_STORE_NAME__: 'LR_STORE_NAME',
	__LR_API_KEY__: 'LR_API_KEY',
	__LR_TENANT_NAME__: 'LR_TENANT_NAME',
};

// Substituted when present, replaced with an empty string when not.
// LR_SOTT is only needed when Bot Protection (Captcha) is disabled in the
// Admin Console. LR_APP_NAME defaults to LR_TENANT_NAME inside the template.
const OPTIONAL = {
	__LR_SOTT__: 'LR_SOTT',
	__LR_APP_NAME__: 'LR_APP_NAME',
};

function parseEnv(contents) {
	const env = {};
	for (const rawLine of contents.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		let value = line.slice(eq + 1).trim();
		// Strip surrounding quotes if present.
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		env[key] = value;
	}
	return env;
}

function log(message) {
	console.log(`[generate-config] ${message}`);
}

function warn(message) {
	console.warn(`[generate-config] ${message}`);
}

function fail(message) {
	console.error(`[generate-config] ${message}`);
	process.exit(1);
}

function replaceAll(haystack, needle, value) {
	return haystack.split(needle).join(value);
}

if (!fs.existsSync(ENV_PATH)) {
	fail(`.env not found at ${ENV_PATH}. Copy .env.example to .env and fill it in.`);
}
if (!fs.existsSync(TEMPLATE_PATH)) fail(`template not found at ${TEMPLATE_PATH}`);

const env = parseEnv(fs.readFileSync(ENV_PATH, 'utf8'));
let output = fs.readFileSync(TEMPLATE_PATH, 'utf8');

const missing = [];
for (const [placeholder, envKey] of Object.entries(REQUIRED)) {
	const value = env[envKey];
	if (value === undefined || value === '') {
		missing.push(envKey);
		continue;
	}
	output = replaceAll(output, placeholder, value);
}

if (missing.length) {
	fail(`missing required .env values: ${missing.join(', ')}`);
}

for (const [placeholder, envKey] of Object.entries(OPTIONAL)) {
	const value = env[envKey] || '';
	output = replaceAll(output, placeholder, value);
}

if (!env.LR_SOTT) {
	log('LR_SOTT is empty; sott will be omitted. Enable Bot Protection (Captcha) in the Admin Console so registration still works.');
} else {
	warn('LR_SOTT is set. A SOTT expires (10 minutes by default) and will be readable in the theme bundle. Prefer enabling Bot Protection (Captcha) and leaving LR_SOTT empty.');
}

// Guard against a placeholder surviving a rename in the template.
const leftover = output.match(/__LR_[A-Z_]+__/g);
if (leftover) {
	fail(`unsubstituted placeholder(s) in template: ${[...new Set(leftover)].join(', ')}`);
}

fs.writeFileSync(OUTPUT_PATH, output);
log(`wrote ${path.relative(ROOT, OUTPUT_PATH).split(path.sep).join('/')}`);
log('next: node scripts/install-into-theme.js <path-to-your-cornerstone-theme>');
