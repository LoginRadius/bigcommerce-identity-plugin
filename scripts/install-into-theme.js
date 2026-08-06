/**
 * Copies the Stencil plugin package into a Cornerstone (or Cornerstone-derived)
 * theme checkout.
 *
 *   bigcommerce-stencil-package/assets/loginradius     -> <theme>/assets/loginradius
 *   bigcommerce-stencil-package/components/loginradius -> <theme>/templates/components/loginradius
 *
 * Usage:  node scripts/install-into-theme.js <path-to-theme>
 *         node scripts/install-into-theme.js ../cornerstone
 *
 * Run `node scripts/generate-config.js` first: config.js is generated from
 * .env and is required by the theme at runtime.
 *
 * No dependencies: plain Node (>= 16.7 for fs.cpSync).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_DIR = path.join(ROOT, 'bigcommerce-stencil-package');
const GENERATED_CONFIG = path.join(
	PACKAGE_DIR,
	'assets/loginradius/assets/js/config.js'
);

function log(message) {
	console.log(`[install-into-theme] ${message}`);
}

function fail(message) {
	console.error(`[install-into-theme] ${message}`);
	process.exit(1);
}

const themeArg = process.argv[2];
if (!themeArg) {
	fail('usage: node scripts/install-into-theme.js <path-to-theme>');
}

const THEME = path.resolve(process.cwd(), themeArg);

if (!fs.existsSync(THEME) || !fs.statSync(THEME).isDirectory()) {
	fail(`theme directory not found: ${THEME}`);
}

if (!fs.existsSync(path.join(THEME, 'templates', 'layout'))) {
	fail(`${THEME} does not look like a Stencil theme (no templates/layout).`);
}
if (!fs.existsSync(GENERATED_CONFIG)) {
	fail('config.js is missing. Run `node scripts/generate-config.js` first.');
}

const copies = [
	{
		from: path.join(PACKAGE_DIR, 'assets/loginradius'),
		to: path.join(THEME, 'assets/loginradius'),
	},
	{
		from: path.join(PACKAGE_DIR, 'components/loginradius'),
		to: path.join(THEME, 'templates/components/loginradius'),
	},
];

// config.template.js is a build-time input for this repo, not a theme asset.
function filter(source) {
	return path.basename(source) !== 'config.template.js';
}

for (const { from, to } of copies) {
	if (!fs.existsSync(from)) {
		fail(`missing source directory: ${from}`);
	}
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.cpSync(from, to, { recursive: true, force: true, filter });
	log(`${path.relative(ROOT, from).split(path.sep).join('/')} -> ${to}`);
}

log('done. Add the LoginRadius includes to your theme templates (see README.md).');
