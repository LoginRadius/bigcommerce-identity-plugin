var storeName='__LR_STORE_NAME__';
var enableSSO=true;

var option = {};
	option.apiKey = "__LR_API_KEY__";
	option.appName = "__LR_APP_NAME__";
	option.sott="__LR_SOTT__";	
	option.callbackUrl=window.location.href;	
	option.formValidationMessage = true;
	option.accessTokenResponse=true;
	
	option.verificationUrl = window.location.href.split("?")[0];
	option.resetPasswordUrl = window.location.href.split("?")[0];
	
	option.askEmailForUnverifiedProfileAlways=true;
	option.templateName = "loginradiuscustom_tmpl";
	option.hashTemplate = true; 
	option.askRequiredFieldForTraditionalLogin=true;
	
var LRObject= new LoginRadiusV2(option);	
