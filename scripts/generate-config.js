const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const TEMPLATE_PATH = path.join(
	ROOT,
	'bigcommerce-stencil-package/assets/loginradius/assets/js/config.template.js'
);
const OUTPUT_PATH = path.join(
	ROOT,
	'bigcommerce-stencil-package/assets/loginradius/assets/js/config.js'
);
// Local Cornerstone test theme copy (mirrors the components/assets merge).
// Written only when the theme is present, so a plugin-only checkout still works.
const THEME_OUTPUT_PATH = path.join(
	ROOT,
	'assets/loginradius/assets/js/config.js'
);

// Placeholder token in the template -> .env variable name.
const REQUIRED = {
	__LR_STORE_NAME__: 'LR_STORE_NAME',
	__LR_API_KEY__: 'LR_API_KEY',
	__LR_SOTT__: 'LR_SOTT',
	__LR_TENANT_NAME__: 'LR_TENANT_NAME',
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

function fail(message) {
	console.error(`[generate-config] ${message}`);
	process.exit(1);
}

if (!fs.existsSync(ENV_PATH)) fail(`.env not found at ${ENV_PATH}`);
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
	output = output.split(placeholder).join(value);
}

if (missing.length) {
	fail(`missing required .env values: ${missing.join(', ')}`);
}

fs.writeFileSync(OUTPUT_PATH, output);
console.log(`[generate-config] wrote ${path.relative(ROOT, OUTPUT_PATH)}`);

// Deploy into the local test theme when it exists.
const themeDir = path.dirname(THEME_OUTPUT_PATH);
if (fs.existsSync(themeDir)) {
	fs.writeFileSync(THEME_OUTPUT_PATH, output);
	console.log(`[generate-config] copied to ${path.relative(ROOT, THEME_OUTPUT_PATH)}`);
} else {
	console.log('[generate-config] theme path not found; skipped theme copy');
}
