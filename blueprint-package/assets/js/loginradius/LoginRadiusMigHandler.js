
var lrRaasOptions=raasoption;
var bcStoreName=storeName;
var inc=0;
var onSubmitCache;
var saveData = function(){
		var url="https://cloud-api.loginradius.com/sso/bigcommerce/api/validatepassword?apikey="+lrRaasOptions.apikey+"&store="+bcStoreName+"";
		var password=$("#loginradius-raas-login-password").val();
		var username=$("#loginradius-raas-login-emailid").val();
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
			  
			  if(resultData.ErrorCode || resultData.errorCode){
					if(resultData.Description)
						LoginRadiusBCUX.interface.showMessage(resultData.Description,10000);
					if(resultData.description)
						LoginRadiusBCUX.interface.showMessage(resultData.description,10000);
			  }else{
				$('#loginradius-raas-submit-Login').parents('form:first').removeAttr('onsubmit');
				$('#loginradius-raas-submit-Login').parents('form:first')[0].onsubmit=onSubmitCache;
				$('#loginradius-raas-submit-Login').click();
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
	if($('#loginradius-raas-submit-Login').length)
		{
			inc=0;
			onSubmitCache=$('form[name="loginradius-raas-login"]')[0].onsubmit;
			$('#loginradius-raas-submit-Login').parents('form:first').attr("onsubmit","saveData();return false;");
			
		}
			
	else{
		inc++;
		if(inc<=200){
			await();
		}
	}
}
await();