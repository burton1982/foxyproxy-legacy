/**
  FoxyProxy - Take back your privacy!
  Copyright (C) 2006 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

var overlay;

function onOK() {
  var fp = Components.classes["@leahscape.org/foxyproxy/service;1"]
    .getService(Components.interfaces.nsISupports).wrappedJSObject;
  var p = document.getElementById("pattern").value.replace(/^\s*|\s*$/g,"");
  if (p == "") {
    overlay.alert(this, fp.getMessage("pattern.required"));
    return false;
  }
  else {
  	var isRegEx = document.getElementById("regex").selected;
  	if (isRegEx) {
	    try {  
		    new RegExp((p[0]=="^"?"":"^") + p + (p[p.length-1]=="$"?"":"$"));
	    }
	    catch(e) {
		    overlay.alert(this, fp.getMessage("pattern.invalid.regex", [document.getElementById("pattern").value]));    
	    	return false;
	    }
	  }
    window.arguments[0].out = {name:document.getElementById("name").value,
      pattern:p, isRegEx:isRegEx,
      isBlackList:document.getElementById("black").selected,
      isEnabled:document.getElementById("enabled").checked};
    return true;
  }
}

function onLoad() {
  sizeToContent();
  overlay = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser").foxyproxy;
  document.getElementById("name").value = window.arguments[0].inn.name;
  document.getElementById("pattern").value = window.arguments[0].inn.pattern;
  document.getElementById("matchtype").selectedIndex = window.arguments[0].inn.regex ? 1 : 0;
  document.getElementById("whiteblacktype").selectedIndex = window.arguments[0].inn.black ? 1 : 0;
}
