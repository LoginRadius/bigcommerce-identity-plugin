
	
var LoginRadius_Bigcommerce = {};
var $LRBC = LoginRadius_Bigcommerce;
LoginRadius_Bigcommerce.util={};

(function (util) {
	
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
	
	util.getURL = function (access_token,apikey,password,store)
	{
		var url="//cloud-api.loginradius.com/sso/bigcommerce/api/token?access_token="+access_token +"&apikey="+apikey +"&store="+store+"&password="+password;
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
	
			LoginRadiusRaaS.init(raasoption, 'login', function(response,data) {
			
				var url=$LRBC.util.getURL(response.access_token,raasoption.apikey ,data.password,storeName);
				
				LRBCUX.interface.showMessage("Login Successful, you will be redirected momentarily",5000);
				
				$LRBC.util.jsonpCall(url,function(tokendata){
					
						if(tokendata.loginUrl!=null)
						{
							$LRBC.util.sendusertosite(tokendata.loginUrl);
						}else{
							LRBCUX.interface.showMessage("Something went wrong during login please try again",5000);
							document.getElementById("fade").style="display:none";
						}
					}); 
				
			}, function(errors) {
				// on failure this function will call ‘errors’ which is an array of errors with message.
				// every kind of error will be returned in this method
				// you can run a loop on this array.
				document.getElementById("fade").style="display:none";
				if(errors.length && errors[0].description!=null)
					LRBCUX.interface.showMessage(errors[0].description,5000);
				
			}, "login-div");
			
		};
	
	LRBCUX.interface.defineregister=function (){
		LoginRadiusRaaS.init(raasoption, 'registration', function(response) {
						// On Success
						console.log(response);			
						if(response!=null && response.isPosted!=null && response.isPosted==true)
							LRBCUX.interface.showMessage("An email has been sent to your account, please click on the link to verify your Email",5000);
						document.getElementById("fade").style="display:none";
				  }, function(errors) {
						// On Errors
						document.getElementById("fade").style="display:none";
					if(errors.length && errors[0].description!=null)
						LRBCUX.interface.showMessage(errors[0].description,5000);
				  }, "register-div");
				
		};
	
	LRBCUX.interface.definesocial=function (){
		LoginRadiusRaaS.CustomInterface(".interfacecontainerdiv", raasoption);
		LoginRadiusRaaS.init(raasoption, 'sociallogin', function(response) {
					// On Success this callback will call
					// response will be string as token
					if(response.isPosted){
						document.getElementById("fade").style="display:none";
						LRBCUX.interface.showMessage("An Email link has been sent to the specified email. Click on the link to reset your password.",5000);
						LoginRadiusBCUX.interface.toggleform('login');
					}else{
						var url=$LRBC.util.getURL(response,raasoption.apikey ,"",storeName);
						
						LRBCUX.interface.showMessage("Login Successful, you will be redirected momentarily",5000);
						
						$LRBC.util.jsonpCall(url,function(data){
							
								if(data.loginUrl!=null)
							{
								$LRBC.util.sendusertosite(data.loginUrl);
							}else{
								LRBCUX.interface.showMessage("Something went wrong during login please try again",5000);
								document.getElementById("fade").style="display:none";
							}
							});
					}
				}, function(errors) {
					// on failure this function will call ‘errors’ which is an array of errors with message.
					// every kind of error will be returned in this method
					// you can run a loop on this array.
					document.getElementById("fade").style="display:none";
					if(errors.length && errors[0].description!=null)
						LRBCUX.interface.showMessage(errors[0].description,5000);
				}, "sociallogin-container");
		};
		
	LRBCUX.interface.defineforgot = function (){
		LoginRadiusRaaS.init(raasoption, 'forgotpassword', function(response) {
				// On Success this callback will call
				// response will be { isPosted : true }
				// in this case user will get an email for password resetting
					//   console.log(response);
					document.getElementById("fade").style="display:none";
				LRBCUX.interface.showMessage("An Email link has been sent to the specified email. Click on the link to reset your password.",5000);
			}, function(errors) {
				// on failure this function will call ‘errors’ which is an array of errors with message.
				// every kind of error will be returned in this method
				// you can run a loop on this array.
				document.getElementById("fade").style="display:none";
				if(errors.length && errors[0].description!=null)
					LRBCUX.interface.showMessage(errors[0].description,5000);
			}, "forgotpassword-div");
		};
	
	LRBCUX.interface.definereset= function (){
		LoginRadiusRaaS.init(raasoption, 'resetpassword', function(response) {
				// On Success this callback will call
				// response will be { isPosted : true }
				  //console.log(response);
				    LoginRadiusBCUX.interface.toggleform('login');
					
				  LRBCUX.interface.showMessage("Your new password has been set",5000);
				  document.getElementById("fade").style="display:none";
			}, function(errors) {
				// on failure this function will call 'errors' which is an array of errors with message.
				// every kind of error will be returned in this method
				// you can run a loop on this array.
				if(errors.length && errors[0].description!=null)
					LRBCUX.interface.showMessage(errors[0].description,5000);
				if(errors.length && errors[0].message!=null &&errors[0].id)
					LRBCUX.interface.showMessage(errors[0].message,5000);
				document.getElementById("fade").style="display:none";
			}, "resetpassword-container");
		};
	
	LRBCUX.interface.defineverify=function (){
		LoginRadiusRaaS.init(raasoption, 'emailverification', function(response) {
			  // succeed
			  // console.log(response);
			var locCheck=window.location.href
			if(!locCheck.includes("vtype=reset")){
				LRBCUX.interface.showMessage("Your email has been successfully verified.",5000);
			}
			document.getElementById("fade").style="display:none";
			}, function(errors) {
			  // error
				if(errors.length && errors[0].description!=null)
					LRBCUX.interface.showMessage(errors[0].description,5000);
				document.getElementById("fade").style="display:none";
			});
		};
	
	LRBCUX.interface.DisplayAuth=function (){

		document.getElementById("authcontainer").style.display = 'block';
		LoginRadiusRaaS.$hooks.socialLogin.onFormRender = function() {
				LoginRadiusBCUX.interface.toggleform('additional');
					
				document.getElementById("fade").style="display:none";
		};
		$LR.util.ready(function() {
		
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
