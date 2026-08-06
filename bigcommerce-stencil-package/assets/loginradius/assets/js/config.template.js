/**
 * LoginRadius configuration for the BigCommerce Stencil plugin.
 *
 * This is a TEMPLATE. The placeholders below are replaced with values from
 * .env by `node scripts/generate-config.js`, which writes the real config.js
 * next to this file. config.js is gitignored because it contains the store's
 * API key and (optionally) its SOTT.
 *
 * Edit this file, never the generated config.js.
 */

var storeName = '__LR_STORE_NAME__';
var enableSSO = true;

/* LoginRadius tenant (Site) name. Used for the SSO hub host:
   https://<ssoTenantName>.hub.loginradius.com */
var ssoTenantName = '__LR_TENANT_NAME__';

/* Optional override. Defaults to the tenant name, which is the usual case. */
var lrAppName = '__LR_APP_NAME__' || ssoTenantName;

var lrSott = '__LR_SOTT__';

var option = {
	apiKey: "__LR_API_KEY__",
	appName: lrAppName,

	/* callbackUrl deliberately keeps the query string.
	   The SDK default is window.location.href with the query stripped. We
	   override it because the checkout prompt sends shoppers to
	   /login.php?return_url=<checkout url>, and util.getURL() reads return_url
	   to send them back to checkout after login. If a store switches social
	   login to a same-window redirect (callbackInsideSameWindow: true),
	   stripping the query here would drop return_url and leave the shopper on
	   the login page instead of checkout. */
	callbackUrl: window.location.href,

	/* verificationUrl and resetPasswordUrl must be clean.
	   LoginRadius appends its own token parameters (vtype, vtoken, ...) to
	   these URLs when it builds email links, and any query string carried over
	   from the page that triggered the email would be stale by the time the
	   shopper opens the link. */
	verificationUrl: window.location.href.split("?")[0],
	resetPasswordUrl: window.location.href.split("?")[0]

	/* Optional: apply a brand/style configured in the Admin Console.
	   templateName: "<brand-name>",
	   styleName: "<style-variant>", */
};

/* SOTT authorises registration from the browser. It is only needed when Bot
   Protection (Captcha) is disabled in the Admin Console; with Captcha on,
   LoginRadius expects sott to be omitted. Because a Stencil asset is a static
   file we cannot inject a short-lived SOTT per request, so leave LR_SOTT empty
   in .env unless the store genuinely needs it. See README.md > SOTT. */
if (lrSott) {
	option.sott = lrSott;
}

var LRObject = new LoginRadiusSDK(option);
