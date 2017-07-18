var storeName='<BigCommerce Site Name>';
var enableSSO=true;

var option = {};
	option.apiKey = "<LoginRadius API Key>";
	option.appName = "<LoginRadius Site Name>";
	option.sott="<LoginRadius SOTT>";	
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