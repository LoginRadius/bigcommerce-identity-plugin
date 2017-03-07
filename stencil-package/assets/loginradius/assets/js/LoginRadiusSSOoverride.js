var LoginRadiusSSO = (function () {

    var module = {};
    var tokencookie = "lr-user--token";

    module.enableLog = false;

    module.log = function (log) {
        console.log(log);
    }
    var isInitFired = false;

    module.Cookie = {
        getItem: function (sKey) {
            if (!sKey || !this.hasOwnProperty(sKey)) { return null; }
            return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
        },
        key: function (nKeyId) {
            return unescape(document.cookie.replace(/\s*\=(?:.(?!;))*$/, "").split(/\s*\=(?:[^;](?!;))*[^;]?;\s*/)[nKeyId]);
        },
        setItem: function (sKey, sValue, path) {
            if (!sKey) { return; }
            document.cookie = escape(sKey) + "=" + escape(sValue) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=" + (path ? path : "/");
            this.length = document.cookie.match(/\=/g).length;
        },
        length: 0,
        removeItem: function (sKey, path) {
            if (!sKey || !this.hasOwnProperty(sKey)) { return; }
            document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=" + (path ? path : "/");
            this.length--;
        },
        hasOwnProperty: function (sKey) {
            return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
        }
    };

    module.init = function (appname, appPath,override) {
        if (appname) {
            module.appName = appname;
        } else {
            module.log("LoginRadius site name (app name) required to do SSO");
        }
		if(override){
			module.override=override;
		} else{
			module.override=false;
		}
	
        module.appPath = appPath;

        isInitFired = true;
    }

    module.login = function (callback) {
        validateAndCall(function () {
            jsonpCall('//' + module.appName + '.hub.loginradius.com/ssologin/login', function (data) {
                if (data.isauthenticated) {
                    if (window.LoginRadiusRaaS && !module.override) {
                        if (LoginRadiusRaaS.loginradiushtml5passToken) {
                            LoginRadiusRaaS.loginradiushtml5passToken(data.token);
                        } else {
                            module.log("To handle SSO with Customer registartion require to call LoginRadiusRaaS.init with sociallogin option");
                        }
                    } else {
                        if (typeof callback == 'string' || callback instanceof String) {
                            var form = document.createElement('form');
                            form.action = callback || window.location.href;
                            form.method = 'POST';

                            var hidden = document.createElement('input');
                            hidden.type = 'hidden';
                            hidden.name = 'token';
                            hidden.value = data.token;

                            form.appendChild(hidden);
                            document.body.appendChild(form);
                            form.submit();
                        } else if (typeof (callback) == "function") {
                            callback(data.token);
                        }
                    }
                }
            });
        });
    }

    module.logout = function (callback,tokenExpire) {
        validateAndCall(function () {

            var tokenExpiryParameter = tokenExpire ? "?tokenExpire=1" : "";
            var action = tokenExpire ? "tokenExpire" : "logout";

            jsonpCall('//' + module.appName + '.hub.loginradius.com/ssologin/' + action + tokenExpiryParameter, function (data) {
                module.Cookie.removeItem(tokencookie, module.appPath);
                if (typeof callback == 'string' || callback instanceof String) {
                    window.location = callback || window.location.href;
                } else if (typeof (callback) == "function") {
                    callback();
                }
            });
        });
    }


    module.isNotLoginThenLogout = function (logoutCallback, loggedinCallback) {
        validateAndCall(function () {
            jsonpCall('//' + module.appName + '.hub.loginradius.com/ssologin/login', function (data) {
                if (data.isauthenticated) {
                    var cookietoken = module.Cookie.getItem(tokencookie);
                    if (cookietoken && cookietoken != data.token) {
                        if (typeof logoutCallback == 'string' || logoutCallback instanceof String) {
                            window.location = logoutCallback || window.location.href;
                        } else if (typeof (logoutCallback) == "function") {
                            logoutCallback(data.token);
                        }
                    } else {
                        if (loggedinCallback && typeof (loggedinCallback) == "function") {
                            loggedinCallback(data.token);
                        }

                    }
                } else {
                    if (typeof logoutCallback == 'string' || logoutCallback instanceof String) {
                        window.location = logoutCallback || window.location.href;
                    } else if (typeof (logoutCallback) == "function") {
                        logoutCallback();
                    }
                }
            });
        });
    }

    module.setToken = function (token) {
        module.Cookie.setItem(tokencookie, token, module.appPath);
    }

    function addJs(url, context) {
        context = context || document;
        var head = context.getElementsByTagName('head')[0];
        var js = context.createElement('script');
        js.src = url;
        js.type = "text/javascript";
        head.appendChild(js);
        return js;
    }

    function jsonpCall(url, handle) {
        var func = 'Loginradius' + Math.floor((Math.random() * 1000000000000000000) + 1);
        window[func] = function (data) {
            handle(data);
            window[func] = function () { };
            document.head.removeChild(js);
        }
        var endurl = url.indexOf('?') != -1 ? url + '&callback=' + func : url + '?callback=' + func;
        var js = addJs(endurl);
    }
    function validateAndCall(func) {
        if (isInitFired) {
            if (module.appName) {
                func();
            } else {
                module.log("LoginRadius site name (app name) required to do SSO");
            }
        } else {
            module.log("Init method should be called first then login.");
        }
    }
    return module;

})();



