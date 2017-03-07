

##Bigcommerce Configuration
1. Log in to your Bigcommerce admin panel
1. Click on “Apps”
1. Click on Marketplace
1. Search for “LoginRadius”
1. Click on the LoginRadius app and click “Install”

This will install the LoginRadius App into your Bigcommerce environment. If you receive any errors or have not previously spoken with the LoginRadius Support team to configure your BigCommerce integration reach out via the LoginRadius support channels to get access to the BigCommerce integration. 

##Blueprint Theme Setup

1. Open WebDav Access to your Bigcommerce Site. 
1. Unzip the LoginRadius Bigcommerce-blueprint-Package
1. Copy the following folders to the specified locations in your webdav/template folder
	1. assets/js- Copy the loginradius folder to your webdav/template/js folder
	2. assets/images- Copy the loginradius folder to your webdav/template/images folder
	3. assets/css- Copy the loginradius folder to your webdav/template/Styles folder
1. Copy the contents of the “panels” folder to the webdav/Panels Folder

##Modifying your BluePrint Theme

1. Open the config.js in the provided BlueprintThemeFile\assets\js\loginradius and update the LoginRadius options object with your LoginRadius API key and Site Name. 

2. Include the reference files for LoginRadius in your header section by including the following code in your webdav/Panels/header.html just before the closing </header> tag
```javascript
%%Panel.lrreferences%%
```

3. If you are using Single Sign On also include the tag after the lrreferences tag
```
%%Panel.lrsso%%
```

4. Open the LoginForm.html file in your webdav/Panels/LoginForm.html and replace the existing Login page code with
```
%%Panel.lrauth%%
```
This will display the pre-styled User authentication features which includes handling of Login, Social Login, Registration, Forgot password, and Reset Password. 


5. If you are using SSO you will need to handle the Logout functionality by opening the navigation.html file in your theme->templates->components->common and change the logout link to 
```
<a class="navUser-action" onclick="lrSSOlogoutCallback()" href="#">{{lang 'common.logout'}}</a>
```

6. You will need to update any of the dynamicaly created checkout page links if you are using the streamlined cart flow. 
	A. Search your template files for  %%GLOBAL_CheckoutLink%%
	B. Add the following onclick handler to these links: onclick="assignCheckout(this)" 

Note: Guest checkout is not supported by Bigcommerce for Customized Login Providers

##Additional Theme options
The above steps will allow you to get quickly setup and all of the interfaces can be directly customized using the css, js and html that comes in the Bigcommerce-blueprint-Package.zip. We have also included some more basic functions to display the interfaces that you can use to customize the look and feel or to embed specific interfaces directly on your preexisting forms. 

The following options are available to render specific interfaces:

1. ```%%Panel.lrauth%%``` - Displays the full LoginRadius interface.
1. ```%%Panel.lrlogin%%``` - Displays the Traditional Login interface.
1. ```%%Panel.lrsocial%%``` - Displays the Social Login interface.
1. ```%%Panel.lrregister%%``` - Displays the Traditional Registration interface.  
1. ```%%Panel.lrverify%%``` - Includes the code to handle the email verification process. 
1. ```%%Panel.lrforgot%%``` - Displays the interfaces for Forgot password and Reset Password
