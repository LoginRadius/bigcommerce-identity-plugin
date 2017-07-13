var storeName='<STORE NAME>';
var enableSSO=true;

var raasoption = {};
	raasoption.apiKey = "<API Key>";
	raasoption.appName = "<SITE Name>";
	raasoption.sott="<SOTT>";	
	raasoption.callbackUrl=window.location.href;	
	raasoption.formValidationMessage = true;
	raasoption.accessTokenResponse=true;
	raasoption.verificationUrl = window.location.href.split("?")[0];
	raasoption.resetPasswordUrl = window.location.href.split("?")[0];
	raasoption.askEmailForUnverifiedProfileAlways=true;
	raasoption.templateName = "loginradiuscustom_tmpl";
	raasoption.hashTemplate = true; 
	raasoption.askRequiredFieldForTraditionalLogin=true;
	
var LRObject= new LoginRadiusV2(raasoption);	