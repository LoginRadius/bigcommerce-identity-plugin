var storeName='<BIGCOMMERCE_STORE_HASH>';
var enableSSO=true;

var option = {};
	option.apiKey = "<LOGINRADIUS_API_KEY>";
	option.appName = "<LOGINRADIUS_APP_NAME>";
	option.sott="<LOGINRADIUS_SOTT>";
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