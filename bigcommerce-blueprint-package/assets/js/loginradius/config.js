var storeName='<STORE NAME>';
var enableSSO=true;

var option = {};
	option.apiKey = "<API Key>";
	option.appName = "<SITE Name>";
	option.sott="<SOTT>";	
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