/**
  FoxyProxy - Take back your privacy!
  Copyright (C) 2006 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

var foxyproxy, proxyTree, logTree, monthslong, dayslong, overlay,
	templateExample, timeformat, saveLogCmd, noURLsCmd;
const CI = Components.interfaces, CC = Components.classes;

function onLoad() {
  foxyproxy = CC["@leahscape.org/foxyproxy/service;1"]
    .getService(CI.nsISupports).wrappedJSObject;
  document.getElementById("maxSize").value = foxyproxy.logg.maxSize;    
  overlay = CC["@mozilla.org/appshell/window-mediator;1"]
    .getService(CI.nsIWindowMediator).getMostRecentWindow("navigator:browser").foxyproxy;    
	
  monthslong = [foxyproxy.getMessage("months.long.1"), foxyproxy.getMessage("months.long.2"),
    foxyproxy.getMessage("months.long.3"), foxyproxy.getMessage("months.long.4"), foxyproxy.getMessage("months.long.5"),
    foxyproxy.getMessage("months.long.6"), foxyproxy.getMessage("months.long.7"), foxyproxy.getMessage("months.long.8"),
    foxyproxy.getMessage("months.long.9"), foxyproxy.getMessage("months.long.10"), foxyproxy.getMessage("months.long.11"),
    foxyproxy.getMessage("months.long.12")];
  
  dayslong = [foxyproxy.getMessage("days.long.1"), foxyproxy.getMessage("days.long.2"),
    foxyproxy.getMessage("days.long.3"), foxyproxy.getMessage("days.long.4"), foxyproxy.getMessage("days.long.5"),
    foxyproxy.getMessage("days.long.6"), foxyproxy.getMessage("days.long.7")];
  proxyTree = document.getElementById("proxyTree");
  logTree = document.getElementById("logTree");
  templateExample = document.getElementById("templateExample");
  saveLogCmd = document.getElementById("saveLogCmd");
  clearLogCmd = document.getElementById("clearLogCmd");  
  noURLsCmd = document.getElementById("noURLsCmd");  
  timeformat = foxyproxy.getMessage("timeformat");
  _initSettings();
}

function _initSettings() {
  _updateView(false, true);
  document.getElementById("settingsURL").value = foxyproxy.getSettingsURI("uri-string"); 
  document.getElementById("tabs").selectedIndex = foxyproxy.selectedTabIndex;
  document.getElementById("autoAddPattern").value = foxyproxy.autoadd.match.pattern; 
  document.getElementById("matchtype").value = foxyproxy.autoadd.match.isRegEx ? "r" : "w"; 
  var temp = foxyproxy.autoadd.urlTemplate;
  document.getElementById("autoAddUrlTemplate").value = temp;    
  updateTemplateExample(temp);  
}

function onUsingPFF(usingPFF) {
  document.getElementById("settingsURLBtn").disabled = usingPFF;
	foxyproxy.setSettingsURI(usingPFF?foxyproxy.PFF:foxyproxy.getDefaultPath());
  _initSettings();  
}

function _updateLogView() {
	saveLogCmd.setAttribute("disabled", foxyproxy.logg.length == 0);
	clearLogCmd.setAttribute("disabled", foxyproxy.logg.length == 0);	
  noURLsCmd.setAttribute("checked", foxyproxy.logg.noURLs); 
  logTree.view = {
    rowCount : foxyproxy.logg.length,
    getCellText : function(row, column) {
      var matchingProxy = foxyproxy.logg.item(row);
      if (!matchingProxy) return;
      switch(column.id) {
        case "timeCol":return format(matchingProxy.timestamp);
        case "urlCol":return matchingProxy.uri;
        case "nameCol":return matchingProxy.proxyName;
        case "notesCol":return matchingProxy.proxyNotes;
        case "mpNameCol":return matchingProxy.matchName;
        case "mpCol":return matchingProxy.matchPattern;        
        case "mpTypeCol":return matchingProxy.matchType;
        case "mpBlackCol":return matchingProxy.whiteBlack;       
      }
    },
    isSeparator: function(aIndex) { return false; },
    isSorted: function() { return false; },
    isEditable: function(row, col) { return false; },
    isContainer: function(aIndex) { return false; },
    setTree: function(aTree){},
    getImageSrc: function(aRow, aColumn) {return null;},
    getProgressMode: function(aRow, aColumn) {},
    getCellValue: function(row, col) {},
    cycleHeader: function(aColId, aElt) {},
    getRowProperties: function(row, col, props) {
      /*if (foxyproxy.logg.item(row) && foxyproxy.logg.item(row).matchPattern == NA) {      
	  	  var a = Components.classes["@mozilla.org/atom-service;1"].
		      getService(Components.interfaces.nsIAtomService);
		    col.AppendElement(a.getAtom("grey"));
	    }*/
    },
    getColumnProperties: function(aColumn, aColumnElement, props) {},
    getCellProperties: function(aRow, props) {},
    getLevel: function(row){ return 0; }
  };
}

  // Thanks for the inspiration, Tor2k (http://www.codeproject.com/jscript/dateformat.asp)
  function format(d) {
    d = new Date(d);
    if (!d.valueOf())
      return '&nbsp;';

    return timeformat.replace(/(yyyy|mmmm|mmm|mm|dddd|ddd|dd|hh|HH|nn|ss|zzz|a\/p)/gi,
      function($1) {
        switch ($1) {
          case 'yyyy': return d.getFullYear();
          case 'mmmm': return monthslong[d.getMonth()];
          case 'mmm':  return monthslong[d.getMonth()].substr(0, 3);
          case 'mm':   return zf((d.getMonth() + 1), 2);
          case 'dddd': return dayslong[d.getDay()];
          case 'ddd':  return dayslong[d.getDay()].substr(0, 3);
          case 'dd':   return zf(d.getDate(), 2);
          case 'hh':   return zf(((h = d.getHours() % 12) ? h : 12), 2);
          case 'HH':   return zf(d.getHours(), 2);          
          case 'nn':   return zf(d.getMinutes(), 2);
          case 'ss':   return zf(d.getSeconds(), 2);
          case 'zzz':  return zf(d.getSeconds(), 3);          
          case 'a/p':  return d.getHours() < 12 ? 'AM' : 'PM';
        }
      }
    );
  }
  // My own zero-fill fcn, not Tor 2k's. Assumes (n==2 || n == 3) && c<=n.
  function zf(c, n) { c=""+c; return c.length == 1 ? (n==2?'0'+c:'00'+c) : (c.length == 2 ? (n==2?c:'0'+c) : c); }


function _createMenuItem(args) {		
  var e = document.createElement("menuitem");
  e.setAttribute("id", args["idVal"]);  
  e.setAttribute("label", args["labelId"]?foxyproxy.getMessage(args["labelId"], args["labelArgs"]) : args["labelVal"]);    
  e.setAttribute("value", args["idVal"]);
  args["type"] && e.setAttribute("type", args["type"]);
  args["name"] && e.setAttribute("name", args["name"]);
  return e;
}

function _removeChildren(node) {
  while (node.hasChildNodes())
    node.removeChild(node.firstChild);    	
}

function _updateModeMenu() {
	var menu = document.getElementById("modeMenu");	
	var popup=menu.firstChild;
	_removeChildren(popup);
	
  popup.appendChild(_createMenuItem({idVal:"patterns", labelId:"mode.patterns.label"}));
  for (var i=0,p; i<foxyproxy.proxies.length && ((p=foxyproxy.proxies.item(i)) || 1); i++)
    popup.appendChild(_createMenuItem({idVal:p.id, labelId:"mode.custom.label", labelArgs:[p.name], type:"radio", name:"foxyproxy-enabled-type"}));
    //popup.appendChild(_createMenuItem({idVal["random", labelId:"mode.random.label"}));
  popup.appendChild(_createMenuItem({idVal:"disabled", labelId:"mode.disabled.label"}));
  menu.value = foxyproxy.mode;
  if (foxyproxy.mode != "patterns" && foxyproxy.mode != "disabled" &&
  	foxyproxy.mode != "random") {
	  if (!foxyproxy.proxies.item(menu.selectedIndex-1).enabled) { // subtract 1 because first element, patterns, is not in the proxies array
  	  // User disabled or deleted the proxy; select default setting.
    	foxyproxy.setMode("disabled", true);
	    menu.value = "disabled";
  	}
  }
}

function _updateAutoAddProxyMenu() {
  if (!foxyproxy.autoadd.enabled) return;
  var menu = document.getElementById("autoAddProxyMenu");	
  var popup=menu.firstChild;
	_removeChildren(popup);  
  for (var i=0,p; i<foxyproxy.proxies.length && ((p=foxyproxy.proxies.item(i)) || 1); i++)
    p.mode!="direct" && p.enabled && popup.appendChild(_createMenuItem({idVal:p.id, labelVal:p.name, type:"radio", name:"foxyproxy-enabled-type"}));
    //popup.appendChild(_createMenuItem({idVal:"disabled", labelId:"mode.disabled.label"}));

	function selFirst() {
    // select the first one
    var temp = popup.firstChild && popup.firstChild.id;
    temp && onAutoAddProxyChanged((menu.value = temp));
  }
    
  if (foxyproxy.autoadd.proxy) {
  	menu.value = foxyproxy.autoadd.proxy.id;
  }
  else
	  selFirst();
	menu.selectedIndex == -1 && selFirst();
}

function onSettingsURLBtn() {
  const nsIFilePicker = CI.nsIFilePicker;
  var fp = CC["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  fp.init(window, foxyproxy.getMessage("file.select"), nsIFilePicker.modeSave);
  fp.defaultString = "foxyproxy.xml";
  var e = fp.show();
  if (e != nsIFilePicker.returnCancel) {
  	foxyproxy.setSettingsURI(fp.file);
    _initSettings();
  }
}

/* Contains items which can be updated via toolbar/statusbar/menubar/context-menu as well as the options dialog */
function _updateView(writeSettings, updateLogView) {
  document.getElementById("dnsEnabled").checked = foxyproxy.proxyDNS;
  document.getElementById("pacLoadNotificationEnabled").checked = foxyproxy.pacLoadNotification;
  document.getElementById("pacErrorNotificationEnabled").checked = foxyproxy.pacErrorNotification;
  document.getElementById("enableLogging").checked = foxyproxy.logging;
  //document.getElementById("randomIncludeDirect").checked = foxyproxy.random.includeDirect;
  //document.getElementById("randomIncludeDisabled").checked = foxyproxy.random.includeDisabled;
  document.getElementById("usingPFF").checked =
    document.getElementById("settingsURLBtn").disabled = foxyproxy.isUsingPFF();
  var temp = foxyproxy.autoadd.enabled;
  document.getElementById("autoAddEnabled").checked = temp;
  document.getElementById("autoAddControls").hidden = !temp;
  document.getElementById("autoAddReload").checked = foxyproxy.autoadd.reload;
  document.getElementById("autoAddNotify").checked = foxyproxy.autoadd.notify;
  document.getElementById("toolsMenuEnabled").checked = foxyproxy.toolsMenu;
  document.getElementById("contextMenuEnabled").checked = foxyproxy.contextMenu;
  document.getElementById("statusbarIconEnabled").checked = foxyproxy.statusbar.iconEnabled;
  document.getElementById("statusbarTextEnabled").checked = foxyproxy.statusbar.textEnabled;   
  document.getElementById("animatedIconsEnabled").checked = foxyproxy.animatedIcons;        
  document.getElementById("advancedMenusEnabled").checked = foxyproxy.advancedMenus;      
	_updateModeMenu();
  _updateAutoAddProxyMenu();
  proxyTree.view  = {
    rowCount : foxyproxy.proxies.length,
    getCellText : function(row, column) {
      var i = foxyproxy.proxies.item(row);    
      switch(column.id) {
        case "nameCol":return i.name;
        case "descriptionCol":return i.notes;   
        case "modeCol":return foxyproxy.getMessage(i.mode);
        case "httpCol":return i.manualconf.http;           
        case "httpportCol":return i.manualconf.httpport;                   
        case "sslCol":return i.manualconf.ssl;                   
        case "sslportCol":return i.manualconf.sslport;                           
        case "ftpCol":return i.manualconf.ftp;                           
        case "ftpportCol":return i.manualconf.ftpport;         
        case "gopherCol":return i.manualconf.gopher;                           
        case "gopherportCol":return i.manualconf.gopherport;         
        case "socksCol":return i.manualconf.socks;                           
        case "socksportCol":return i.manualconf.socksport;         
        case "socksverCol":return i.manualconf.socksversion == "5" ? "5" : "4/4a";                           
        case "autopacCol":return i.autoconf.url;         
      }
    },
    setCellValue: function(row, col, val) {foxyproxy.proxies.item(row).enabled = val;},
    getCellValue: function(row, col) {return foxyproxy.proxies.item(row).enabled;},    
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
  writeSettings && foxyproxy.writeSettings();
  setButtons();
  updateLogView && _updateLogView();
}

function onEnableTypeChanged(menu) {
  foxyproxy.setMode(menu.selectedItem.id, true);
  _updateView();
}

function onDeleteSelection() {
  if (_isDefaultProxySelected())
    overlay.alert(this, foxyproxy.getMessage("delete.proxy.default"));
  else if (overlay.ask(this, foxyproxy.getMessage("delete.proxy.confirm"))) {
    foxyproxy.proxies.remove(proxyTree.currentIndex);
    _updateView(true);
  }  
}

function onCopySelection() {
  if (_isDefaultProxySelected())
    overlay.alert(this, foxyproxy.getMessage("copy.proxy.default"));
  else {  
	  var dom = foxyproxy.proxies.item(proxyTree.currentIndex).toDOM(document);
	  var p = CC["@leahscape.org/foxyproxy/proxy;1"].createInstance(CI.nsISupports).wrappedJSObject;
	  p.fromDOM(dom);
	  p.id = foxyproxy.proxies.uniqueRandom(); // give it its own id
	  foxyproxy.proxies.push(p);
	  _updateView(true);
	}
}

function move(direction) {
  // store cur selection
  var sel = proxyTree.currentIndex;
  foxyproxy.proxies.move(proxyTree.currentIndex, direction) && _updateView(true);  
  // reselect what was previously selected
	proxyTree.view.selection.select(sel + (direction=="up"?-1:1));
}

function onSettings(isNew) {
  var params = {inn:{proxy:isNew ?
    CC["@leahscape.org/foxyproxy/proxy;1"].createInstance(CI.nsISupports).wrappedJSObject : 
    foxyproxy.proxies.item(proxyTree.currentIndex)}, out:null};
        
  window.openDialog("chrome://foxyproxy/chrome/addeditproxy.xul", "",
    "chrome, dialog, modal, resizable=yes", params).focus();
  if (params.out) {
    params.out.proxy.manualconf.makeProxies();
    isNew && foxyproxy.proxies.push(params.out.proxy);
    _updateView(true);
    foxyproxy.writeSettings();
  }
}

function setButtons() {
  document.getElementById("tree-row-selected").setAttribute("disabled", proxyTree.currentIndex == -1);
  document.getElementById("moveUpCmd").setAttribute("disabled", 
  	proxyTree.currentIndex == -1 || proxyTree.currentIndex == 0 || _isDefaultProxySelected());
  document.getElementById("moveDownCmd").setAttribute("disabled", 
  	proxyTree.currentIndex == -1 || proxyTree.currentIndex == foxyproxy.proxies.length-1 ||
  	(proxyTree.currentIndex+1 < foxyproxy.proxies.length && foxyproxy.proxies.item(proxyTree.currentIndex+1).lastresort));
}

function onMaxSize() {
	var v = document.getElementById("maxSize").value;
	var passed = true;
	if (/\D/.test(v)) {
		foxyproxy.alert(this, foxyproxy.getMessage("torwiz.nan"));
		passed = false;
	}
	v > 9999 &&
		!overlay.ask(this, foxyproxy.getMessage("logg.maxsize.maximum")) &&
		(passed = false);
	if (!passed) {
		document.getElementById("maxSize").value = foxyproxy.logg.maxSize;
		return;
	}
	if (overlay.ask(this, foxyproxy.getMessage("logg.maxsize.change"))) {
		foxyproxy.logg.maxSize = v;
		_updateView(false, true);
	}
	else
		document.getElementById("maxSize").value = foxyproxy.logg.maxSize;
}
/*
function onIncludeDirectInRandom() {
  // TODO: ERROR CHECKING
	overlay.alert(this, foxyproxy.getMessage('random.applicable'));
	foxyproxy.random.includeDirect = this.checked;
}

function onIncludeDisabledInRandom() {
  // TODO: ERROR CHECKING
	overlay.alert(this, foxyproxy.getMessage('random.applicable'));
	foxyproxy.random.includeDisabled = this.checked;
}*/
function updateTemplateExample(template) {
	templateExample.value = foxyproxy.autoadd.applyTemplate("http://mail.foo.com:8080/inbox/msg1024#subject");
}

function onAutoAddProxyChanged(proxyId) {
	foxyproxy.autoadd.proxy = foxyproxy.proxies.getById(proxyId);
}

function onURLTemplateHelp() {
  overlay.alert(this, foxyproxy.getMessage("foxyproxy.autoadd.url.template.help"));
}

function onAutoAdd(cb) {
	if (cb.checked) {
		if (foxyproxy.autoadd.allowed()) {
	  	foxyproxy.autoadd.enabled = true;
		 	document.getElementById('autoAddControls').hidden = false;	  	
			_updateAutoAddProxyMenu();
		  overlay.alert(this, foxyproxy.getMessage("autoadd.notice"));
		}
		else {
		  overlay.alert(this, foxyproxy.getMessage("autoadd.verboten"));
		  cb.checked = false;
		}
	}
	else {
	 	document.getElementById('autoAddControls').hidden = true;
  	foxyproxy.autoadd.enabled = false;
  }
}

function saveLog() {
	const nsIFilePicker = CI.nsIFilePicker;
	var fp = CC["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(this, foxyproxy.getMessage("log.save"), nsIFilePicker.modeSave);
	fp.defaultExtension = "html";
	fp.appendFilters(nsIFilePicker.filterHTML | nsIFilePicker.filterAll);
	if (fp.show() == nsIFilePicker.returnCancel)
 		return;
	
	var os = CC["@mozilla.org/intl/converter-output-stream;1"].createInstance(CI.nsIConverterOutputStream);	
	var fos = CC["@mozilla.org/network/file-output-stream;1"].createInstance(CI.nsIFileOutputStream); // create the output stream
	fos.init(fp.file, 0x02 | 0x08 | 0x20 /*write | create | truncate*/, 0664, 0);
	os.init(fos, "UTF-8", 0, 0x0000);
	os.writeString(foxyproxy.logg.toHTML());
	os.close();
	if (overlay.ask(this, foxyproxy.getMessage("log.saved2", [fp.file.path]))) {
		var win = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator).getMostRecentWindow("navigator:browser");
		win.gBrowser.selectedTab = win.gBrowser.addTab(fp.file.path);
  }
}

function importSettings() {
}

function exportSettings() {
}

function importProxyList() {
}

function onProxyTreeSelected() {	
	setButtons();
}

function onProxyTreeMenuPopupShowing() {
	var e = document.getElementById("enabledPopUpMenuItem"), f = document.getElementById("menuSeperator");
  e.hidden = f.hidden = _isDefaultProxySelected();
	e.setAttribute("checked", foxyproxy.proxies.item(proxyTree.currentIndex).enabled); 
}

function toggleEnabled() {
	var p = foxyproxy.proxies.item(proxyTree.currentIndex);
	p.enabled = !p.enabled;
	_updateView(true, false);
}

function _isDefaultProxySelected() {
	return foxyproxy.proxies.item(proxyTree.currentIndex).lastresort;
}
