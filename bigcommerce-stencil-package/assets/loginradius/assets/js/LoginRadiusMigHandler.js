
var lrRaasOptions=option;
var bcStoreName=storeName;
var inc=0;
var onSubmitCache;
var saveData = function(){
		var url="https://cloud-api.loginradius.com/sso/bigcommerce/api/validatepassword?apikey="+lrRaasOptions.apiKey+"&store="+bcStoreName+"";
		var password=$("#loginradius-login-password").val();
		var username=$("#loginradius-login-emailid").val();
		var validateData={"password":password,"emailid":username};
		document.getElementById("fade").style="display:block";
		$.ajax({
		  type: "POST",
		  url: url,
		  data: validateData,
		  dataType: "json",
		  crossDomain: true,
		  headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Headers': 'Content-Type' 
					},
		  success: function(resultData){
			  
			  if(resultData.ErrorCode || resultData.errorCode||resultData.verified==false){
					if(resultData.Description)
						LoginRadiusBCUX.interface.showMessage(resultData.Description,10000);
					if(resultData.description)
						LoginRadiusBCUX.interface.showMessage(resultData.description,10000);
					document.getElementById("fade").style="display:none";
			  }else{
				$('#loginradius-submit-Login').parents('form:first').removeAttr('onsubmit');
				$('#loginradius-submit-Login').parents('form:first')[0].onsubmit=onSubmitCache;
				$('#loginradius-submit-Login').click();
				
			  }
		  },
		  error:function(result){
			LoginRadiusBCUX.interface.showMessage(JSON.stringify(result),10000);
		  }
	});
}

var await=function(){
		setTimeout(function(){ hideSubmit() }, 50);
	}
var hideSubmit=function(){
	if($('#loginradius-submit-Login').length)
		{
			inc=0;
			onSubmitCache=$('form[name="loginradius-login"]')[0].onsubmit;
			$('#loginradius-submit-Login').parents('form:first').attr("onsubmit","saveData();return false;");
			
		}
			
	else{
		inc++;
		if(inc<=200){
			await();
		}
	}
}
await();