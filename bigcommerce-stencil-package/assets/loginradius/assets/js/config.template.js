// This file is a template. Do NOT put real secrets here.
// Real values live in the repo-root .env file and are injected by
// scripts/generate-config.js, which writes the deployable config.js.
//
// Generate config.js with:  node scripts/generate-config.js
//
// Note: LoginRadius apiKey and sott are delivered to the browser at runtime and
// are therefore publicly visible in page source. This setup keeps them out of
// source control; it does not hide them from end users.
//
// V3 JS SDK (LoginRadiusSDK). appName is no longer required (resolved from the
// domain). sott is only needed for registration when Bot Protection/CAPTCHA is
// disabled in the Admin Console.

var storeName = '__LR_STORE_NAME__';
var enableSSO = true;
// LoginRadius tenant/site name, used to build the Web SSO hub endpoints
// (https://<ssoTenantName>.hub.loginradius.com/ssologin/...).
var ssoTenantName = '__LR_TENANT_NAME__';

var option = {
	apiKey: "__LR_API_KEY__",
	sott: "__LR_SOTT__",
	callbackUrl: window.location.href,
	verificationUrl: window.location.href.split("?")[0],
	resetPasswordUrl: window.location.href.split("?")[0]
	// To apply an Admin Console brand/theme, add:
	// templateName: "<brand-name>",
	// styleName: "<style-variant>",
};

var LRObject = new LoginRadiusSDK(option);
