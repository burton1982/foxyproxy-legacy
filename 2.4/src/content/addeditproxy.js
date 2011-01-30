/**
  FoxyProxy - Take back your privacy!
  Copyright (C) 2006 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

var urlsTree, proxy, usehttpforall, foxyproxy, autoconfurl, overlay;
const CI = Components.interfaces, CC = Components.classes;

function onLoad() {
	overlay = CC["@mozilla.org/appshell/window-mediator;1"]
	    .getService(CI.nsIWindowMediator).getMostRecentWindow("navigator:browser").foxyproxy;
	autoconfurl = document.getElementById("autoconfurl");
  foxyproxy = CC["@leahscape.org/foxyproxy/service;1"]
    .getService(CI.nsISupports).wrappedJSObject;
  if (window.arguments[0].inn.torwiz) {
    document.getElementById("torwiz-broadcaster").hidden = true;
    document.getElementById("not-torwiz-broadcaster").hidden = false;
    urlsTree = document.getElementById("torWizUrlsTree");
  }
  else
    urlsTree = document.getElementById("urlsTree");
      
  usehttpforall = document.getElementById("usehttpforall");
  proxy = window.arguments[0].inn.proxy;
  document.getElementById("proxyname").value = proxy.name;
  document.getElementById("proxynotes").value = proxy.notes;
  document.getElementById("animatedIcons").checked = proxy.animatedIcons;  
  document.getElementById("tabs").selectedIndex = proxy.selectedTabIndex;  
  document.getElementById("proxyenabled").checked = proxy.enabled;
  document.getElementById("mode").value = proxy.mode;
  toggleMode(proxy.mode);
  document.getElementById("http").value = proxy.manualconf.http;
  document.getElementById("httpport").value = proxy.manualconf.httpport;
  document.getElementById("ssl").value = proxy.manualconf.ssl; 
  document.getElementById("sslport").value = proxy.manualconf.sslport;  
  document.getElementById("ftp").value = proxy.manualconf.ftp;
  document.getElementById("ftpport").value = proxy.manualconf.ftpport;
  document.getElementById("gopher").value = proxy.manualconf.gopher;
  document.getElementById("gopherport").value = proxy.manualconf.gopherport;
  document.getElementById("socks").value = proxy.manualconf.socks;  
  document.getElementById("socksport").value = proxy.manualconf.socksport;     
  document.getElementById("socksversion").value = proxy.manualconf.socksversion;
  autoconfurl.value = proxy.autoconf.url;
  usehttpforall.checked = proxy.usehttpforall;
  usehttpforall.checked && onUseHttpForAll(usehttpforall.checked);      
  
  if (proxy.lastresort) {
    document.getElementById("default-proxy-broadcaster").setAttribute("disabled", "true");
	  document.getElementById("proxyname").disabled =
	  	document.getElementById("proxynotes").disabled = true;
    document.getElementById("patternstab").hidden = true;
  }
  
  _updateView();
}

function onOK() {
  var name = document.getElementById("proxyname").value.replace(/^\s*|\s*$/g, ""); // trim
  if (name == "") {
    foxyproxy.alert(this, foxyproxy.getMessage("proxy.name.required"));
    return false;
  }
  var enabled = document.getElementById("proxyenabled").checked,
    http = document.getElementById("http").value,
    httpport= document.getElementById("httpport").value;
    ssl = document.getElementById("ssl").value;  
    sslport = document.getElementById("sslport").value;  
    ftp = document.getElementById("ftp").value;
    ftpport = document.getElementById("ftpport").value;  
    gopher = document.getElementById("gopher").value;  
    gopherport = document.getElementById("gopherport").value;  
    socks = document.getElementById("socks").value;  
    socksport = document.getElementById("socksport").value;  
  var mode = document.getElementById("mode").value;
  if (enabled) {
    if (mode == "auto") {
	    if (!_checkUri(autoconfurl.value))
	    	return false;
    }
    else if (mode == "manual") {
      if (http == "" && ssl == "" && ftp == "" && gopher == "" && socks == "") {
        foxyproxy.alert(this, foxyproxy.getMessage("protocols.error"));
        return false;      
      }
      if (!_validate(http, httpport, "HTTP") ||
          !_validate(ssl, sslport, "SSL") ||
          !_validate(ftp, ftpport, "FTP") ||
          !_validate(gopher, gopherport, "Gopher") ||
          !_validate(socks, socksport, "SOCKS"))
        return false;        
    }
  }
	
	if (!hasWhite() &&
		!overlay.ask(this, foxyproxy.getMessage((window.arguments[0].inn.torwiz ? "torwiz.nopatterns" : "no.white.patterns")))) return false;
      
  proxy.name = name;
  proxy.notes = document.getElementById("proxynotes").value;
  proxy.selectedTabIndex = document.getElementById("tabs").selectedIndex;
  proxy.autoconf.url = autoconfurl.value;  
  proxy.enabled = enabled;
  proxy.mode = mode;
  proxy.manualconf.http = http;
  proxy.manualconf.httpport = httpport;
  proxy.manualconf.ssl = ssl;  
  proxy.manualconf.sslport = sslport;  
  proxy.manualconf.ftp = ftp;
  proxy.manualconf.ftpport = ftpport;  
  proxy.manualconf.gopher = gopher;  
  proxy.manualconf.gopherport = gopherport;  
  proxy.manualconf.socks = socks;  
  proxy.manualconf.socksport = socksport;  
  proxy.manualconf.socksversion = document.getElementById("socksversion").value;
  proxy.animatedIcons = document.getElementById("animatedIcons").checked;
         
  window.arguments[0].out = {proxy:proxy};
  return true;
}

function hasWhite() {
	for (var i=0, len=proxy.matches.length; i<len; i++)
		if (!proxy.matches[i].isBlackList) return true;
	return false;
}

function _checkUri(url) {
	try {
    return CC["@mozilla.org/network/io-service;1"]
      .getService(CI.nsIIOService).newURI(url, "UTF-8", null);
  }
  catch(e) {
    foxyproxy.alert(this, foxyproxy.getMessage("invalid.url"));
    return false;
  }       
}

function _validate(host, port, protocolName) {
  if (host != "" && port == "") {
    foxyproxy.alert(this, foxyproxy.getMessage("noport", [protocolName]));
    return false;
  }
  else if (host == "" && port != "") {
    foxyproxy.alert(this, foxyproxy.getMessage("nohost", [protocolName]));
    return false;  
  }
  return true;
}

function onAddEdit(isNew) {
  var idx = urlsTree.currentIndex;
	if (!isNew && idx == -1) return; // safety; may not be necessary anymore
	
  var params = isNew ? 
    {inn:{foxyproxy:foxyproxy, name:"", pattern:"", regex:false, enabled:true,
	  	wildcardWarningDisabled:!foxyproxy.warnings.noWildcards}, out:null} :
	  	
		{inn:{foxyproxy:foxyproxy, name:proxy.matches[idx].name,
			    pattern:proxy.matches[idx].pattern, regex:proxy.matches[idx].isRegEx,
			    black:proxy.matches[idx].isBlackList,
			    enabled:proxy.matches[idx].enabled}, out:null};
	    
  window.openDialog("chrome://foxyproxy/chrome/pattern.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();
  // Even if cancel was pressed, update warning state (but only if it's changed to reduce disk writing)
  (params.out.wildcardWarningDisabled != !foxyproxy.warnings.noWildcards) &&
  	(foxyproxy.warnings.noWildcards = !params.out.wildcardWarningDisabled);

  if (params.out.pattern) { 
    params = params.out;
    if (isNew) { 
	    var match = CC["@leahscape.org/foxyproxy/match;1"].createInstance(CI.nsISupports).wrappedJSObject;    	
	    match.name = params.name;
	    match.pattern = params.pattern;
	    match.isRegEx = params.isRegEx;
	    match.isBlackList = params.isBlackList;
	    match.enabled = params.isEnabled;
	    proxy.matches.push(match);
	  }
	  else {
	    proxy.matches[idx].name = params.name;
	    proxy.matches[idx].pattern = params.pattern;
	    proxy.matches[idx].isRegEx = params.isRegEx;
	    proxy.matches[idx].isBlackList = params.isBlackList;
	    proxy.matches[idx].enabled = params.isEnabled;
	  }			  
    _updateView();    
  }
}

function setButtons() {
  document.getElementById("tree-row-selected").setAttribute("disabled", urlsTree.currentIndex == -1);
  onAutoConfUrlInput();
}

function _updateView() {
  urlsTree.view = {
    rowCount : proxy.matches.length,
    getCellText : function(row, column) {
      var s = column.id ? column.id : column;
      switch(s) {        
        case "nameCol":return proxy.matches[row].name;  
        case "patternCol":return proxy.matches[row].pattern;        
        case "patternTypeCol":return foxyproxy.getMessage(proxy.matches[row].isRegEx ? "foxyproxy.regex.label" : "foxyproxy.wildcard.label");
        case "blackCol":return foxyproxy.getMessage(proxy.matches[row].isBlackList ? "foxyproxy.blacklist.label" : "foxyproxy.whitelist.label");
      }
    },
    setCellValue: function(row, col, val) {proxy.matches[row].enabled = val;},
    getCellValue: function(row, col) {return proxy.matches[row].enabled;},
    isSeparator: function(aIndex) { return false; },
    isSorted: function() { return false; },
    isEditable: function(row, col) { return false; },
    isContainer: function(aIndex) { return false; },
    setTree: function(aTree){},
    getImageSrc: function(aRow, aColumn) {return null;},
    getProgressMode: function(aRow, aColumn) {},
    cycleHeader: function(aColId, aElt) {},
    getRowProperties: function(aRow, aColumn, aProperty) {},
    getColumnProperties: function(aColumn, aColumnElement, aProperty) {},
    getCellProperties: function(aRow, aProperty) {},
    getLevel: function(row){ return 0; }    

  };
  setButtons();
}

function onRemove() {
  proxy.matches = proxy.matches.filter(function(element, index, array) {return index != urlsTree.currentIndex;});
  _updateView();
}

function toggleMode(mode) {
  // Next line--buggy in FF 1.5.0.1--makes fields enabled but readonly
  // document.getElementById("disabled-broadcaster").setAttribute("disabled", mode == "auto" ? "true" : "false");
  // Thanks, Andy McDonald.
  if (mode == "auto") {
    document.getElementById("autoconf-broadcaster1").removeAttribute("disabled");    
		document.getElementById("disabled-broadcaster").setAttribute("disabled", "true");
		onAutoConfUrlInput();				
  }		
  else if (mode == "direct") {
    document.getElementById("disabled-broadcaster").setAttribute("disabled", "true");
		document.getElementById("autoconf-broadcaster1").setAttribute("disabled", "true");        
  }
  else {
    document.getElementById("disabled-broadcaster").removeAttribute("disabled");  
    document.getElementById("autoconf-broadcaster1").setAttribute("disabled", "true");    
  }
}

function onUseHttpForAll(checked) {
  proxy.usehttpforall = checked;
  if (checked) {
    document.getElementById("partial-disabled-broadcaster").setAttribute("disabled", "true");  
    _setHosts(document.getElementById("http").value);
    _setPorts(document.getElementById("httpport").value);
  }
  else
    document.getElementById("partial-disabled-broadcaster").removeAttribute("disabled", "false");
}

function _setHosts(v) {
  document.getElementById("ssl").value =
  document.getElementById("ftp").value =
  document.getElementById("gopher").value =
  document.getElementById("socks").value = v;
}

function _setPorts(v) {
  document.getElementById("sslport").value =
  document.getElementById("ftpport").value =
  document.getElementById("gopherport").value =
  document.getElementById("socksport").value = v;
}

function onHelp() {
  CC["@mozilla.org/appshell/window-mediator;1"]
    .getService(CI.nsIWindowMediator).getMostRecentWindow("navigator:browser").foxyproxy
    .openAndReuseOneTabPerURL("http://foxyproxy.mozdev.org/quickstart.html");
}

function onViewAutoConf() {
  var w;
	_checkUri(autoconfurl.value) &&
		(w=open("view-source:" + autoconfurl.value, "", "scrollbars,resizable,modal,chrome,dialog=no,width=450,height=425").focus());
  w && (w.windowtype="foxyproxy-options"); // set windowtype so it's forced to close when last browser closes
}

function onTestAutoConf() {
	if (_checkUri(autoconfurl.value)) {
		var autoConf = CC["@leahscape.org/foxyproxy/autoconf;1"].createInstance(CI.nsISupports).wrappedJSObject;
		autoConf.owner = {name: "Test", enabled: true};
		autoConf.url = autoconfurl.value;
    autoConf._resolver = CC["@mozilla.org/network/proxy-auto-config;1"].createInstance(CI.nsIProxyAutoConfig);  
    autoConf.loadPAC();
    var none=foxyproxy.getMessage("none");
    foxyproxy.alert(this, autoConf.owner.enabled ?
    	foxyproxy.getMessage("autoconfurl.test.success") :
    	foxyproxy.getMessage("autoconfurl.test.fail", [autoConf.status, autoConf.error?autoConf.error:none]));
	}
}

function onAutoConfUrlInput() {
  // setAttribute("disabled", true) buggy in FF 1.5.0.4 for the way i've setup the cmd
  // so must use removeAttribute()
	var b = document.getElementById("autoconf-broadcaster2");
  if (autoconfurl.value.length > 0)
    b.removeAttribute("disabled");    
  else 
    b.setAttribute("disabled", "true");    
}

function onUrlsTreeMenuPopupShowing() {
	var e = document.getElementById("enabledPopUpMenuItem");
	e.setAttribute("checked", proxy.matches[urlsTree.currentIndex].enabled);
}

function toggleEnabled() {
	proxy.matches[urlsTree.currentIndex].enabled = !proxy.matches[urlsTree.currentIndex].enabled;
}

function onWildcardReference() {
	document.getElementById('wildcardReferencePopup').showPopup(document.getElementById('wildcardRefBtn'), -1, -1, 'popup', 'bottomleft', 'topleft');
}