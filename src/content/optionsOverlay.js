// begin FF 1.5.x stuff
function onConnectionSettings() {

  var fp = Components.classes["@leahscape.org/foxyproxy/service;1"]
    .getService(Components.interfaces.nsISupports).wrappedJSObject;
  
  if (fp.mode == "disabled")
	  document.documentElement.openSubDialog("chrome://browser/content/preferences/connection.xul", "", null);
	else {
	  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
	          .getService(Components.interfaces.nsIWindowMediator);
		var win = wm.getMostRecentWindow("navigator:browser");
		if (win && win.foxyproxy)
		  win.foxyproxy.onOptionsDialog();
		else {
		  alert("FoxyProxy Error");
			document.documentElement.openSubDialog("chrome://browser/content/preferences/connection.xul", "", null);		  
		}
	}
}
window.onload=function(){
  var e = document.getElementById("catProxiesButton");
  e && e.setAttribute("oncommand", "onConnectionSettings();");
  try {
    gAdvancedPane && (gAdvancedPane.showConnections = onConnectionSettings);  
  }
  catch (e) {/*wtf*/}
}
// end FF 1.5.x stuff

// FF 2.0.x stuff
