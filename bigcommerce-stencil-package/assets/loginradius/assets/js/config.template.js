
var storeName = '__LR_STORE_NAME__';
var enableSSO = true;

var ssoTenantName = '__LR_TENANT_NAME__';

var option = {
	apiKey: "__LR_API_KEY__",
	sott: "__LR_SOTT__",
	appName: ssoTenantName,
	callbackUrl: window.location.href,
	verificationUrl: window.location.href.split("?")[0],
	resetPasswordUrl: window.location.href.split("?")[0]
	// To apply an Admin Console brand/theme, add:
	// templateName: "<brand-name>",
	// styleName: "<style-variant>",
};

var LRObject = new LoginRadiusSDK(option);
