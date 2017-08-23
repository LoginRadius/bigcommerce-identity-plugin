
	
var LoginRadius_Bigcommerce = {};
var $LRBC = LoginRadius_Bigcommerce;
LoginRadius_Bigcommerce.util={};

(function (util) {
	function isLocalStorageNameSupported(lsname) {
        if (!window["ignoreSessionStorage"]) {
            if (window[lsname]) {
                var testKey = 'test', storage = window[lsname];
                try {
                    storage.setItem(testKey, '1');
                    storage.removeItem(testKey);
                    return true;
                } catch (error) {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }	
	util.jsonpCall = function (path, handle) {
        var func = 'Loginradius' + Math.floor((Math.random() * 1000000000000000000) + 1);
        window[func] = function (data) {
            handle(data);
            try {
                delete window[func];
            }
            catch (e) {
                window[func] = undefined;
            }
            document.body.removeChild(js);
        };
        var js = document.createElement('script');
        js.src = path +"&callback="+func;
        js.type = "text/javascript";
        document.body.appendChild(js);
    };
	
	
	util.sendusertosite=function (url){
		setTimeout(function(){  window.location=url}, 2000);
	};
	
	util.getBrowserStorage=function(key) {

			if (isLocalStorageNameSupported('localStorage')) {
				return localStorage.getItem(key);
			}
			if (isLocalStorageNameSupported('sessionStorage')) {
				return sessionStorage.getItem(key);
			}
			return getCookie(key);
		}

	function getParameterByName(name, url) {
		if (!url) {
		  url = window.location.href;
		}
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}

	util.getURL = function (access_token,apikey,password,store)
	{
		if(getParameterByName("return_url")){
			var url="//cloud-api.loginradius.com/sso/bigcommerce/api/token?access_token="+access_token +"&apikey="+apikey +"&store="+store+"&password="+password+"&redirectto="+getParameterByName("return_url");

		}else if(typeof islrCheckout !== 'undefined' && islrCheckout && checkoutURL!=null){
			var url="//cloud-api.loginradius.com/sso/bigcommerce/api/token?access_token="+access_token +"&apikey="+apikey +"&store="+store+"&password="+password+"&redirectto="+checkoutURL;
		}
		else{
			var url="//cloud-api.loginradius.com/sso/bigcommerce/api/token?access_token="+access_token +"&apikey="+apikey +"&store="+store+"&password="+password;
		}
		return url;
	}
	
	
})(LoginRadius_Bigcommerce.util)

LoginRadiusBCUX = (function (doc) {
	var LRBCUX = {};
	
	LRBCUX.interface={};
	
	LRBCUX.interface.showMessage=function (msg,timeout){
		 document.getElementById("lr-message-container").style.display = 'block';
		 document.getElementById("lr-message-container").innerHTML=msg;
		 setTimeout(function(){  document.getElementById("lr-message-container").style.display = 'none';}, timeout);
		};
		
	LRBCUX.interface.definelogin=function (){
			
			var login_options = {};
			login_options.onSuccess = function(response,data) {
				var url=$LRBC.util.getURL(response.access_token,option.apiKey ,data.password,storeName);
				
				LRBCUX.interface.showMessage("Login Successful, you will be redirected momentarily",5000);
				
				$LRBC.util.jsonpCall(url,function(tokendata){
					
						if(tokendata.loginUrl!=null)
						{
							$LRBC.util.sendusertosite(tokendata.loginUrl);
						}else{
							LRBCUX.interface.showMessage("Something went wrong during login please try again",5000);
							document.getElementById("fade").style.display = 'none';
						}
					}); 
				
			};
			
			login_options.onError = function(errors) {
				document.getElementById("fade").style.display = 'none';
				if(errors.length && errors[0].Description!=null)
					LRBCUX.interface.showMessage(errors[0].Description,5000);
				
			};
			login_options.container = "login-div";
			LRObject.init("login",login_options);

		};
	LRBCUX.interface.defineregister=function (){
		
		var registration_options = {}
		
			registration_options.onSuccess = function(response) {
				// On Success
				console.log(response);			
				if(response!=null && response.IsPosted!=null && response.IsPosted==true)
					LRBCUX.interface.showMessage("An email has been sent to your account, please click on the link to verify your Email",5000);
				document.getElementById("fade").style.display = 'none';
			};
			
			registration_options.onError = function(errors) {
						
				document.getElementById("fade").style.display = 'none';
					if(errors.length && errors[0].Description!=null)
						LRBCUX.interface.showMessage(errors[0].Description,5000);
			};
			
			registration_options.container = "register-div";
			
			LRObject.init("registration",registration_options);	
		
		};
	
	LRBCUX.interface.definesocial=function (){

		
		LRObject.customInterface(".interfacecontainerdiv", option);
		
		var sl_options = {};
			sl_options.onSuccess = function(response) {
			// On Success this callback will call
			// response will be string as token
			if(response.IsPosted){
				document.getElementById("fade").style.display = 'none';
				LRBCUX.interface.showMessage("An email has been sent to the provided email address",5000);
			}
			else{
			var url=$LRBC.util.getURL(response.access_token,option.apiKey ,"",storeName);
			
			LRBCUX.interface.showMessage("Login Successful, you will be redirected momentarily",5000);
			
			$LRBC.util.jsonpCall(url,function(data){
				
					if(data.loginUrl!=null)
				{
					$LRBC.util.sendusertosite(data.loginUrl);
				}else{
					LRBCUX.interface.showMessage("Something went wrong during login please try again",5000);
					document.getElementById("fade").style.display = 'none';
				}
				});
			}
			
			
			
			};
			
			sl_options.onError = function(errors) {
				document.getElementById("fade").style.display = 'none';
				if(errors.length && errors[0].Description!=null&& errors[0].ErrorCode!=905)
					LRBCUX.interface.showMessage(errors[0].Description,5000);
			};
			sl_options.container = "sociallogin-container";
		
		LRObject.init('socialLogin', sl_options);
		
	};
		
	LRBCUX.interface.defineforgot = function (){
		
		var forgotpassword_options = {};
		
			forgotpassword_options.container = "forgotpassword-div";
			
			forgotpassword_options.onSuccess = function(response){

				document.getElementById("fade").style.display = 'none';
				LRBCUX.interface.showMessage("An Email link has been sent to the specified email. Click on the link to reset your password.",5000);
			};
			
			forgotpassword_options.onError = function(errors) {

				document.getElementById("fade").style.display = 'none';
				if(errors.length && errors[0].Description!=null)
					LRBCUX.interface.showMessage(errors[0].Description,5000);
			};
		LRObject.init("forgotPassword", forgotpassword_options);
		
		};
	
	LRBCUX.interface.definereset= function (){
		
		var resetpassword_options = {};
		
			resetpassword_options.container = "resetpassword-container";
			
			resetpassword_options.onSuccess =function(response) {

			  LoginRadiusBCUX.interface.toggleform('login');
				
			  LRBCUX.interface.showMessage("Your new password has been set",5000);
			  document.getElementById("fade").style.display = 'none';
			};
			
			resetpassword_options.onError = function(errors) {
				if(errors.length && errors[0].Description!=null)
					LRBCUX.interface.showMessage(errors[0].Description,5000);
				if(errors.length && errors[0].message!=null &&errors[0].id)
					LRBCUX.interface.showMessage(errors[0].message,5000);
				document.getElementById("fade").style.display = 'none';
			};
		var vtype = LRObject.util.getQueryParameterByName("vtype");	
		if (vtype != null && vtype != "") {
			if (vtype == "reset")
				{
					LRObject.init("resetPassword", resetpassword_options);
				}
			}
		};
	
	LRBCUX.interface.defineverify=function (){
		
		var verifyemail_options = {};
		
			verifyemail_options.onSuccess = function(response) {
				var locCheck=window.location.href
				if(!locCheck.includes("vtype=reset")){
					LRBCUX.interface.showMessage("Your email has been successfully verified.",5000);
				}
				document.getElementById("fade").style.display = 'none';
			};
			
			verifyemail_options.onError = function(errors) {
			  // error
				if(errors.length && errors[0].Description!=null)
				{
					LRBCUX.interface.showMessage(errors[0].Description,5000);
					document.getElementById("fade").style.display = 'none';
				}
			};
		var vtype = LRObject.util.getQueryParameterByName("vtype");	
		if (vtype != null && vtype != "") {
			if (vtype == "emailverification")
				{
				
					LRObject.init("verifyEmail", verifyemail_options);
				}
			}
		
	};
		
	//V2 Interfaces

	LRBCUX.interface.definechangepassword=function (){
		var changepassword_options = {};
		
			changepassword_options.container = "changepassword-container";
			changepassword_options.onSuccess = function(response) {
				
				console.log(response);
				LRBCUX.interface.showMessage("Password has been successfully updated",5000);
			};
			changepassword_options.onError = function(response) {
				
				LRBCUX.interface.showMessage(response[0].Description,5000);
			};
			LRObject.init("changePassword",changepassword_options);
	};
	LRBCUX.interface.defineprofileeditor=function (){
		var profileeditor_options = {};
			profileeditor_options.container = "profileeditor-container";
			profileeditor_options.onSuccess = function(response) {
				try{
					var token="";
					token=$LRBC.util.getBrowserStorage("LRTokenKey");
					if(token.length>0)
					{
						var url=$LRBC.util.getURL(token,option.apiKey ,"",storeName);
						
						$LRBC.util.jsonpCall(url,function(tokendata){
						
							if(tokendata.loginUrl!=null)
							{
								LRBCUX.interface.showMessage("Profile has been successfully updated",5000);
								
							}else{
								LRBCUX.interface.showMessage("Something went wrong during update please try again",5000);
								document.getElementById("fade").style.display = 'none';
							}
						}); 
					}
				}
				catch(e){
					LRBCUX.interface.showMessage("Something went wrong during update please try again",5000);
					document.getElementById("fade").style.display = 'none';
				}
				
			};
			profileeditor_options.onError = function(response) {
		
				LRBCUX.interface.showMessage(response[0].Description,5000);
			};
		LRObject.init("profileEditor",profileeditor_options);

	};	

	LRBCUX.interface.defineaddemail=function (){
		var addemail_options= {};
			addemail_options.container = "addemail-container";
			addemail_options.onSuccess = function(response) {
			// On Success
			console.log(response);
			LRBCUX.interface.showMessage("Email has been successfully updated",5000);
			};
			addemail_options.onError = function(response) {
			// On Error
			LRBCUX.interface.showMessage(response[0].Description,5000);
			};
			LRObject.init("addEmail",addemail_options);
	};
	LRBCUX.interface.defineremoveemail=function (){
		var removeemail_options= {};
			removeemail_options.container = "removeemail-container";
			removeemail_options.onSuccess = function(response) {
			// On Success
			console.log(response);
			LRBCUX.interface.showMessage("Email has been successfully removed",5000);
			};
			removeemail_options.onError = function(response) {
			// On Error
				LRBCUX.interface.showMessage(response[0].Description,5000);
			};
			
			LRObject.init("removeEmail",removeemail_options);
	};	
	
	
//End V2 Interfaces	
	
	LRBCUX.interface.injectSpinner=function(){
		
		if(!document.getElementById("fade")){
			var div = document.createElement("div");
				div.innerHTML = '<div class="lr-loading-frame"> <div class="lr-loading-box" style="background: url(//cdn.loginradius.com/demo/common/loading_spinner.gif) no-repeat center center;"> <span class="lr-loading-text-box"></span> </div> </div>	<div id="overshow" style="display:none"></div>';
				div.id="fade";
				div.style.cssText ="position: fixed; height: 100%; width: 100%; background-color:transparent; opacity: 0.8; top: 0px; left: 0px; display:none;";
				document.body.appendChild(div);
	
		}
		
	}
	
	LRBCUX.interface.DisplayAuth=function (){
		
		LRBCUX.interface.injectSpinner();
		
		LRObject.$hooks.register('socialLoginFormRender',function(){
			LoginRadiusBCUX.interface.toggleform('additional');
					
			document.getElementById("fade").style.display = 'none';
		});
		
		document.getElementById("authcontainer").style.display = 'block';
		LRObject.util.ready(function() {
		
				LRBCUX.interface.definelogin();
				
				LRBCUX.interface.defineregister();
				
				LRBCUX.interface.definesocial();
				
				LRBCUX.interface.defineforgot();
				
				LRBCUX.interface.defineverify();
				
				LRBCUX.interface.definereset();
				var locCheck=window.location.href
				if(locCheck.includes("vtype=reset")){
					LRBCUX.interface.toggleform('forgot');
					
				 document.getElementById("forgotpassword-div").style.display = 'none';	
				}
				
			});
		};
	
	LRBCUX.interface.hideforms=function (){
		 document.getElementById("lr-login-container").style.display = 'none';
		 document.getElementById("lr-fp-container").style.display = 'none';
		 document.getElementById("lr-reg-container").style.display = 'none';
		 document.getElementById("lr-additional-container").style.display = 'none';
		
	};
	LRBCUX.interface.toggleform=function (action)
		{
			 switch (action) {
					case 'register':				
						LRBCUX.interface.hideforms();
						 document.getElementById("lr-reg-container").style.display = 'block';
						break; 
				
					case 'login':				
						LRBCUX.interface.hideforms();
						  document.getElementById("lr-login-container").style.display = 'block';
						break; 
						
					case 'forgot':				
						LRBCUX.interface.hideforms();
						 document.getElementById("lr-fp-container").style.display = 'block';
						break; 
					case 'additional':				
						LRBCUX.interface.hideforms();
						 document.getElementById("lr-additional-container").style.display = 'block';
						break; 	
					default:
						break;
			 }
		};
		
	return LRBCUX;
})(document);
