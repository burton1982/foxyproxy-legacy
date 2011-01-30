/**
  FoxyProxy - Take back your privacy!
  Copyright (C) 2006 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// See http://forums.mozillazine.org/viewtopic.php?t=308369

// Don't const the next line anymore because of the generic reg code
var CI = Components.interfaces, CC = Components.classes, CR = Components.results;
const gMatchingProxyFactory = function(proxy, aMatch, uri, type) {
		return CC["@leahscape.org/foxyproxy/matchingproxy;1"].createInstance(CI.nsISupports).wrappedJSObject
			.init(proxy, aMatch, foxyproxy.prototype.logg._noURLs ? foxyproxy.prototype.logg.noURLsMessage : uri, type);
	},
  gObsSvc = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService),
	gBroadcast = function(subj, topic, data) {
    var bool = CC["@mozilla.org/supports-PRBool;1"].createInstance(CI.nsISupportsPRBool);
		bool.data = subj;		
    var	str = CC["@mozilla.org/supports-string;1"].createInstance(CI.nsISupportsString);
		str.data = data;
	  gObsSvc.notifyObservers(bool, topic, str);    
	};

// l is for lulu...
function foxyproxy() {this.wrappedJSObject = this;}

foxyproxy.prototype = {
	PFF : " ",
  _mode : "patterns",
  _selectedProxy : null,
  _selectedTabIndex : 0,
  _proxyDNS : false,
  _initialized : false,
  _pacLoadNotification : true,
  _pacErrorNotification : true, 
  _toolsMenu : true,
  _contextMenu : true, 
  _toolsMenuNode : null,
  _contextMenuNode : null,
  _animatedIcons : true,
  _advancedMenus : false,  
  
	QueryInterface: function(aIID) {
		if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsIObserver) && !aIID.equals(CI.nsISupportsWeakReference))
			throw CR.NS_ERROR_NO_INTERFACE;			
		return this;
	},
	
	__registration: function() {
		return ({topics: ["app-startup", "xpcom-shutdown"],
			observerName: "foxyproxy_catobserver",
		  contractId: "@leahscape.org/foxyproxy/service;1",
			classId: Components.ID("{46466e13-16ab-4565-9924-20aac4d98c82}"),
			constructor: foxyproxy,
			className: "FoxyProxy Core"});
	},		

	observe: function(subj, topic, data) {
		switch(topic) {
			case "app-startup":
				gObsSvc.addObserver(this, "quit-application", false);				
				gObsSvc.addObserver(this, "domwindowclosed", false);
				//gObsSvc.addObserver(this, "http-on-modify-request", false);
				//this._loadStrings();
				break;
			case "domwindowclosed":	  
			  // Did the last browser window close? It could be that the DOM inspector, JS console,
			  // or the non-last browser window just closed. In that case, don't close FoxyProxy.
		    var wm = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
		    var win = wm.getMostRecentWindow("navigator:browser");
		    if (!win) {						  
				  this.closeAppWindows("foxyproxy", wm);
				  this.closeAppWindows("foxyproxy-options", wm);			  
				}
				break;
			case "quit-application": // Called whether or not FoxyProxy options dialog is open when app is closing
			  gObsSvc.removeObserver(this, "quit-application");
			  gObsSvc.removeObserver(this, "domwindowclosed");
			  break;
			/*case "quit-application-granted":*/ // Not called if FoxyProxy options dialog is open when app is closing
			/*case "http-on-modify-request":
				dump("subj: " + aSubject + "\n");
				dump("topic: " + aTopic + "\n");
				dump("data: " + aData + "\n");
				break;	*/							
/*
biesi>	what you could actually do is this:
	<biesi>	observe http-on-modify-request
	<biesi>	there, you can get the notificationCallbacks and the window
	<biesi>	cancel the request if you want a proxy (hopefully that works)
	<biesi>	then, create a new channel for the original URI and post data etc, using nsIProxiedProtocolHandler for the original scheme
biesi>	passing it the appropriate proxyinfo
	<grimholtz>	ok but how does the response get into the right window?
	<biesi>	ah right
	<biesi>	forgot to mention that part
	<biesi>	with help of nsIURILoader::openURI*/					
			  
		}
	},   

	_loadStrings: function() {
		this.logg.owner = this.warnings.owner = this.proxies.owner =
			this.autoadd.owner = this.random.owner = this.statusbar.owner = this;
	
	  var req = CC["@mozilla.org/xmlextras/xmlhttprequest;1"].
	    createInstance(CI.nsIXMLHttpRequest);
	  req.open("GET", "chrome://foxyproxy/content/strings.xml", false);
	  req.send(null);  
	  this.strings._entities = new Array();      
	  for (var i=0,e=req.responseXML.getElementsByTagName("i18n"); i<e.length; i++)  {
	    var attrs = e.item(i).attributes;
	    this.strings._entities[attrs.getNamedItem("id").nodeValue] = attrs.getNamedItem("value").nodeValue;
	  }
	  this.autoadd.matchName = this.getMessage("autoadd.pattern.label");
	},
	
	closeAppWindows: function(type, wm) {	
		var wm = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
		var e = wm.getEnumerator(type);
    while (e.hasMoreElements()) {
    	e.getNext().close();
    }
	},
		
	init : function() {
	  if (!this._initialized) {
	    this._initialized = true; // because @mozilla.org/file/directory_service;1 isn't available in init()
 	  	this._loadStrings();
	    
			this.autoadd.match = CC["@leahscape.org/foxyproxy/match;1"].createInstance(CI.nsISupports).wrappedJSObject;
			this.autoadd.match.isMultiLine = true;
			this.autoadd.match.name = this.autoadd.matchName;
							    
      var req = CC["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(CI.nsIXMLHttpRequest);
      var settingsURI = this.getSettingsURI("uri-string");
      req.open("GET", settingsURI, false); 
      req.send(null);
      var doc = req.responseXML, docElem = doc.documentElement;
      if (docElem.nodeName == "parsererror") {
        this.alert(null, this.getMessage("settings.error"));
        // TODO: prompt user to overwrite?
        this.writeSettings(settingsURI);
      }
      else
      	this.fromDOM(doc, docElem);
	        
	    /*
		  	<menu id="foxyproxy-context-menu-1" label="&foxyproxy.label;"
		      tooltiptext="&foxyproxy.tooltip;" accesskey="&foxyproxy.accesskey;" class="menu-iconic foxyproxybutton-small"> 
		      <menupopup id="foxyproxy-contextmenu-popup"
		          onpopupshowing="foxyproxy.onPopupShowing(this, event);"
		          onpopuphiding="foxyproxy.onPopupHiding();"/>
		    </menu>	    
	    */

			var doc = CC["@mozilla.org/xml/xml-document;1"].createInstance(CI.nsIDOMDocument);	    
	    this._contextMenuNode = doc.createElement("menu");
	    this._contextMenuNode.setAttribute("id", "foxyproxy-context-menu-1");	    
	    this._contextMenuNode.setAttribute("label", "&foxyproxy.label;");	 	    
	    this._contextMenuNode.setAttribute("tooltiptext", "&foxyproxy.tooltip;");		    
	    this._contextMenuNode.setAttribute("accesskey", "&foxyproxy.accesskey;");			    
	    this._contextMenuNode.setAttribute("class", "menu-iconic foxyproxybutton-small");			 
	    var menupopup2 = doc.createElement("menupopup");
	    menupopup2.setAttribute("id", "foxyproxy-contextmenu-popup");
	    menupopup2.setAttribute("onpopupshowing", "foxyproxy.onPopupShowing(this, event);");	    
	    menupopup2.setAttribute("onpopuphiding", "foxyproxy.onPopupHiding();");	    
	    this._contextMenuNode.appendChild(menupopup2);	       	    
    }
	},

	get contextMenuNode() {
		return this._contextMenuNode.cloneNode(true);
	},	

  get mode() { return this._mode; },
  setMode : function(mode, writeSettings, init) {
    for (var i=0,len=this.proxies.length; i<len; i++) {
      if (mode == this.proxies.item(i).id) {
        this._selectedProxy = this.proxies.item(i);
        this.proxies.item(i).enabled = true; // ensure it's enabled
        break;
      }
    }
    this._mode = mode;
    if (init) return;    
    writeSettings && this.writeSettings();
    this.callFcnOnOverlays("toggleFilter", mode != "disabled");
    if (mode == "disabled")   
	    this.autoadd._enabled && this.callFcnOnOverlays("togglePageLoad", false);
    else
	    this.autoadd._enabled && this.callFcnOnOverlays("togglePageLoad", true);        
	  gBroadcast(null, "foxyproxy-mode-change", mode);
    //this.callFcnOnOverlays("setMode", mode);    
  },
    
  callFcnOnOverlays : function(fcn, args) {
    for (var e = CC["@mozilla.org/appshell/window-mediator;1"]
      .getService(CI.nsIWindowMediator)
      .getEnumerator("navigator:browser"); e.hasMoreElements();) {
      win = e.getNext();
      win.foxyproxy && win.foxyproxy[fcn](args);
    }
  }, 	
  
	getPrefsService : function(str) {
    return CC["@mozilla.org/preferences-service;1"].
      getService(CI.nsIPrefService).getBranch(str);
  },
  
  // Returns settings URI in desired form
  getSettingsURI : function(type) {
    var o = null;
    try {
      o = this.getPrefsService("extensions.foxyproxy.").getCharPref("settings");
    }
    catch(e) {}
    if (o) {
      o == this.PFF && (o = this.getDefaultPath());
      var file = this.transformer(o, CI.nsIFile);
      // Does it exist?      
      if (!file.exists()) {
        this.writeSettings(file);
      }
    }
    else {
      // Default settings file/path
  	  o = this.setSettingsURI(this.getDefaultPath());
    }
    return this.transformer(o, type);
  },

  setSettingsURI : function(o) {
    var o2 = this.transformer(o, "uri-string");
    try {
  	  this.writeSettings(o2);
  	  // Only update the preference if writeSettings() succeeded
      this.getPrefsService("extensions.foxyproxy.").setCharPref("settings", o==this.PFF ? this.PFF : o2);  	  
    }
    catch(e) {
      this.alert(this, this.getMessage("error") + ":\n\n" + e);
    }
    return o==this.PFF ? this.PFF : o2;
  },

  isUsingPFF : function() {
    return this.getPrefsService("extensions.foxyproxy.").getCharPref("settings") == this.PFF;
  },
  
  
  alert : function(wnd, str) {
    CC["@mozilla.org/embedcomp/prompt-service;1"].getService(CI.nsIPromptService)
      .alert(null, this.getMessage("foxyproxy"), str);
  },  

  getDefaultPath : function() {
    var file = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
    var dir = CC["@mozilla.org/file/directory_service;1"].getService(CI.nsIProperties).get("ProfD", CI.nsILocalFile);
    file.initWithPath(dir.path);
    file.appendRelativePath("foxyproxy.xml"); 
    return file; 
  },

  // Convert |o| from:
  //   - string of the form c:\path\eric.txt
  //   - string of the form file:///c:/path/eric.txt
  //   - nsIFile
  //   - nsIURI
  //   - null: implies use of PFF
  // to any of the other three types. Valid values for |desiredType|:
  //   - "uri-string"
  //   - "file-string"
  //   - Components.interfaces.nsIFile
  //   - Components.interfaces.nsIURI
  transformer : function(o, desiredType) {
    o == this.PFF && (o = this.getDefaultPath());
    const handler = CC["@mozilla.org/network/io-service;1"].
              getService(CI.nsIIOService).getProtocolHandler("file").
              QueryInterface(CI.nsIFileProtocolHandler);
    
    switch(desiredType) {
      case "uri-string":
        switch(typeof(o)) {
          case "string":
            if (o.indexOf("://" > -1)) return o;
            return handler.getURLSpecFromFile(this.createFile(o));
          case "object":
            if (o instanceof CI.nsIFile) return handler.getURLSpecFromFile(o);
            if (o instanceof CI.nsIURI) return o.spec;
            return null; // unknown type
        }
      case "file-string":
        switch(typeof(o)) {
          case "string":
            if (o.indexOf("://" > -1)) return handler.getFileFromURLSpec(o).path;
            return o;
          case "object":
            if (o instanceof CI.nsIFile) return o.path;
            if (o instanceof CI.nsIURI) return handler.getFileFromURLSpec(o.spec).path;
            return null; // unknown type                                
        }
      case CI.nsIFile:
        switch(typeof(o)) {
          case "string":
            if (o.indexOf("://" > -1)) return handler.getFileFromURLSpec(o);
            return this.createFile(o).path;
          case "object":
            if (o instanceof CI.nsIFile) return o;
            if (o instanceof CI.nsIURI) return handler.getFileFromURLSpec(o.spec);
            return null; // unknown type            
        }
      case CI.nsIURI:
        var ios = CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService);
        switch(typeof(o)) {
          case "string":
            if (o.indexOf("://" > -1)) return ios.newURI(o, null, null);
            return handler.newFileURI(this.createFile(o));
          case "object":
            if (o instanceof CI.nsIFile) return handler.newFileURI(o);
            if (o instanceof CI.nsIURI) return o;
            return null; // unknown type          
        }
    }
        
  },
    // Create nsIFile from a string
  createFile : function(str) {
    var f = CC["@mozilla.org/file/local;1"].createInstance(CI.nsILocalFile);
    f.initWithPath(str);
    return f;
  },
  
  writeSettings : function(o) {
    !o && (o = this.getPrefsService("extensions.foxyproxy.").getCharPref("settings"));
    o = this.transformer(o, CI.nsIFile);
    var foStream = CC["@mozilla.org/network/file-output-stream;1"].
      createInstance(CI.nsIFileOutputStream);
    foStream.init(o, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
    foStream.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n", 39);
    CC["@mozilla.org/xmlextras/xmlserializer;1"].createInstance(CI.nsIDOMSerializer)
      .serializeToStream(this.toDOM(), foStream, "UTF-8");    
    //foStream.write(str, str.length);
    foStream.close();  
  },
  
  get proxyDNS() { return this._proxyDNS; },
  set proxyDNS(p) {
    this._proxyDNS = p;
    this.writeSettings();
  },

  get selectedTabIndex() { return this._selectedTabIndex; },
  set selectedTabIndex(i) {
    this._selectedTabIndex = i;
    this.writeSettings();
  },

  get logging() { return this.logg.enabled; },
  set logging(e) {
    this.logg.enabled = e;
    this.writeSettings();
  },

  get pacLoadNotification() { return this._pacLoadNotification; },
  set pacLoadNotification(n) {
    this._pacLoadNotification = n;
    this.writeSettings();
  },  
  
  get pacErrorNotification() { return this._pacErrorNotification; },
  set pacErrorNotification(n) {
    this._pacErrorNotification = n;
    this.writeSettings();
  },    

  get toolsMenu() { return this._toolsMenu; },
  set toolsMenu(n) {
    this._toolsMenu = n;
    this.callFcnOnOverlays("toggleToolsMenu", n);
    this.writeSettings();
  },   

  get contextMenu() { return this._contextMenu; },
  set contextMenu(n) {
    this._contextMenu = n;
    this.callFcnOnOverlays("toggleContextMenu", n);
    this.writeSettings();
  },  
  
  get animatedIcons() { return this._animatedIcons; },
  set animatedIcons(i) {
    this._animatedIcons = i;
    this.writeSettings();
  },
  
  get advancedMenus() { return this._advancedMenus; },
  set advancedMenus(i) {
    this._advancedMenus = i;
    this.writeSettings();
  },
      
  getMatchingProxy : function(uri) {
    var matchingProxy;
    var uriStr = uri.spec;  
    switch (this.mode) {
      case "random":   
				//matchingProxy = this.proxies.getRandom(uriStr, this.random._includeDirect, this.random._includeDisabled);
        //break;
      case "patterns":     
	      matchingProxy = this.proxies.getMatches(uri, uriStr);
        break;
      default:   
	      matchingProxy = gMatchingProxyFactory(this._selectedProxy, null, uriStr, "ded");      
        break;
    }
    this.logg.add(matchingProxy);
    return matchingProxy.proxy;
  },
  
  restart : function() {
		CC["@mozilla.org/toolkit/app-startup;1"].getService(CI.nsIAppStartup)
	  	.quit(CI.nsIAppStartup.eForceQuit|CI.nsIAppStartup.eRestart);
  },

	fromDOM : function(doc, node) {
		this.statusbar.fromDOM(doc);
		this.logg.fromDOM(doc); 
		this._proxyDNS = node.getAttribute("proxyDNS") == "true";
		this._pacLoadNotification = node.hasAttribute("pacLoadNotification") ?
			node.getAttribute("pacLoadNotification") == "true" : true; // new for 2.0
		this._pacErrorNotification = node.hasAttribute("pacErrorNotification") ?
			node.getAttribute("pacErrorNotification") == "true" : true; // new for 2.0		
		this._toolsMenu = node.hasAttribute("toolsMenu") ?
			node.getAttribute("toolsMenu") == "true" : true; // new for 2.0				
		this._contextMenu = node.hasAttribute("contextMenu") ?
			node.getAttribute("contextMenu") == "true" : true; // new for 2.0				
		this._animatedIcons = node.hasAttribute("animatedIcons") ?
			node.getAttribute("animatedIcons") == "true" : true; // new for 2.3--default to true if it doesn't exist
		this._advancedMenus = node.hasAttribute("advancedMenus") ?
			node.getAttribute("advancedMenus") == "true" : false; // new for 2.3--default to false if it doesn't exist
						
		this._selectedTabIndex = node.getAttribute("selectedTabIndex") || "0";
		this.proxies.fromDOM(doc, this);      
		this.setMode(node.hasAttribute("enabledState") ?
			(node.getAttribute("enabledState") == "" ? "patterns" : node.getAttribute("enabledState")) :
			node.getAttribute("mode"), false, true); // renamed to mode in 2.0
		this.random.fromDOM(doc, this);
    this.autoadd.fromDOM(doc);		
	},
	
	toDOM : function() {
		var doc = CC["@mozilla.org/xml/xml-document;1"].createInstance(CI.nsIDOMDocument);	
    var e = doc.createElement("foxyproxy");    
    e.setAttribute("mode", this._mode);
    e.setAttribute("selectedTabIndex", this._selectedTabIndex);
    e.setAttribute("proxyDNS", this._proxyDNS ? "true" : "false");
    e.setAttribute("pacLoadNotification", this._pacLoadNotification ? "true" : "false");    
    e.setAttribute("pacErrorNotification", this._pacErrorNotification ? "true" : "false");        
    e.setAttribute("toolsMenu", this._toolsMenu ? "true" : "false");    
    e.setAttribute("contextMenu", this._contextMenu ? "true" : "false");              
    e.setAttribute("animatedIcons", this._animatedIcons ? "true" : "false");     
    e.setAttribute("advancedMenus", this._advancedMenus ? "true" : "false");        
    e.appendChild(this.random.toDOM(doc));   
    e.appendChild(this.statusbar.toDOM(doc));
    e.appendChild(this.logg.toDOM(doc));
    e.appendChild(this.warnings.toDOM(doc));       
    e.appendChild(this.autoadd.toDOM(doc));  
    e.appendChild(this.proxies.toDOM(doc));       
    return e;
	},  
  
  ///////////////// random \\\\\\\\\\\\\\\\\\\\\\
	
	random : {
  	owner : null,
  	_includeDirect : false,
  	_includeDisabled : false,  	

	  get includeeDirect() { return this._includeDirect; },
	  set includeeDirect(e) {
	    this._includeDirect = e;
	    this.owner.writeSettings();
	  },	

	  get includeDisabled() { return this._includeDisabled; },
	  set includeDisabled(e) {
	    this._includeDisabled = e;
	    this.owner.writeSettings();
	  },
	
		toDOM : function(doc) {
			var e = doc.createElement("random");
			e.setAttribute("includeDirect", this._includeDirect ? "true":"false");		
			e.setAttribute("includeDisabled", this._includeDisabled ? "true":"false");				
		  return e;
		},
		
		fromDOM : function(doc) {
      var node = doc.getElementsByTagName("random")[0];
      if (node) { // because this is new for 2.0
      	this._includeDirect = node.getAttribute("includeDirect") == "true";
      	this._includeDisabled = node.getAttribute("includeDisabled") == "true";      	
			}
		}
	},
	
  ///////////////// proxies \\\\\\\\\\\\\\\\\\\\\\

  proxies : {
  	owner : null,
	  deadEnd : CC["@mozilla.org/network/protocol-proxy-service;1"]
			.getService(CI.nsIProtocolProxyService)
			.newProxyInfo("http", "", -1, 0, 0, null), // port -1, never ignore, never failover 
	  //deadEndMatchingProxy : gMatchingProxyFactory(this._selectedProxy, null, uriStr, "ded"),  
    list : [],
    lastresort : null,
    push : function(p) {
      // not really a push: this inserts p
      //as the second-to-last item in the list
      if (this.list.length == 0)
        this.list[0] = p;
      else {
        var len = this.list.length-1;
        this.list[len+1] = this.list[len];
        this.list[len] = p;
	    }
	    return true;
    },

    get length() {
      return this.list.length;
    },
    
    getById : function(id) {
      var a = this.list.filter(function(e) {return e.id == this;}, id);
      return a?a[0]:null;
    },
        
    fromDOM : function(doc, fp) {
      var last = null;
      for (var i=0,proxyElems=doc.getElementsByTagName("proxy"); i<proxyElems.length; i++) {
        var p = CC["@leahscape.org/foxyproxy/proxy;1"].createInstance(CI.nsISupports).wrappedJSObject;
        p.fromDOM(proxyElems[i]);
        if (!last && proxyElems[i].getAttribute("lastresort") == "true")
          last = p;
        else
        	this.list.push(p);
      }
      if (last) {
        this.list.push(last); // ensures it really IS last
        !last.enabled && (last.enabled = true);    // ensure it is enabled
      }
      else {
	      last = CC["@leahscape.org/foxyproxy/proxy;1"].createInstance(CI.nsISupports).wrappedJSObject;
        last.name = fp.getMessage("proxy.default");
        last.notes = fp.getMessage("proxy.default.notes");
        last.mode = "direct";
        last.lastresort = true;
        var match = CC["@leahscape.org/foxyproxy/match;1"].createInstance(CI.nsISupports).wrappedJSObject;
        match.name = fp.getMessage("proxy.default.match.name");
        match.pattern = "*";
        last.matches.push(match);
        last.selectedTabIndex = 1;
        this.list.push(last); // ensures it really IS last
        fp.writeSettings();
  		}
  		this.lastresort = last;
    },
    
    toDOM : function(doc) {
			var proxiesElem=doc.createElement("proxies");
      for (var i=0; i<this.list.length; i++) {
        proxiesElem.appendChild(this.list[i].toDOM(doc));
      }
      return proxiesElem;
    },
    
    item : function(i) { 
      return this.list[i];
    },
    
    remove : function(idx) {
      this.maintainIntegrity(this.list[idx], true, false, false);
      for (var i=0, temp=[]; i<this.list.length; i++) {
        if (i != idx) temp[temp.length] = this.list[i];
      }
      this.list = []; //this.list.splice(0, this.length);
      for (var i=0; i<temp.length; i++) {
	      this.list.push(temp[i]);
	    }
    },
    
    move : function(idx, direction) {
      var newIdx = idx + (direction=="up"?-1:1);
      if (newIdx < 0 || newIdx > this.list.length-1) return false;
      var temp = this.list[idx]; 
      this.list[idx] = this.list[newIdx];
      this.list[newIdx] = temp;
      return true;
    },
    
    getMatches : function(uri, uriStr) {
			for (var i=0, aMatch; i<this.list.length; i++) {
			  // todo: how expensive is next line?
			  if (this.list[i]._mode == "auto" &&
			  	!this.list[i].autoconf._resolver.getProxyForURI(uriStr, uri.host)) {
			  		continue; // No need to call isMatch() if this PAC doesn't handle this uri
			 	}
			
				if (this.list[i]._enabled && (aMatch = this.list[i].isMatch(uriStr))) {
					return gMatchingProxyFactory(this.list[i], aMatch, uriStr, "pat");
				}
      }
      // Failsafe: use lastresort proxy if nothing else was chosen
      return gMatchingProxyFactory(this.lastresort, this.lastresort.matches[0], uriStr, "pat");
    },
    
    getRandom : function(uriStr, includeDirect, includeDisabled) {
      var isDirect = true, isDisabled = true, r, cont, maxTries = this.list.length*10;
      do {
        r = Math.floor(Math.random()*this.list.length); // Thanks Andrew @ http://www.shawnolson.net/a/789/   
        dump(r+"\n");     
        cont = (!includeDirect && this.list[r].mode == "direct") ||
        	(!includeDisabled && !this.list[r]._enabled);
         dump("cont="+cont+"\n");
      } while (cont && (--maxTries > 0));
      if (maxTries == 0)
        return this.deadEnd;
      return gMatchingProxyFactory(this.list[r], null, uriStr, "rand");   
    },
    
    uniqueRandom : function() {
      var unique = true, r;
      do {
        r = Math.floor(Math.random()*4294967296); // Thanks Andrew @ http://www.shawnolson.net/a/789/
        for (var i=0; i<this.list.length && unique; i++)
          this.list[i].id == r && (unique = false);
      } while (!unique);
      return r;
    },
    
    maintainIntegrity : function(proxy, isBeingDeleted, isBeingDisabled, isBecomingDIRECT) {
      var updateViews;
      // Handle mode
      if (isBeingDeleted || isBeingDisabled) {
	      if (this.owner._mode == proxy.id) {
	        this.owner.setMode("disabled", true);
	        updateViews = true;
	      }
	    }
	    // Handle AutoAdd
	    if (this.owner.autoadd.proxy && this.owner.autoadd.proxy.id == proxy.id) {
	      // Turn it off and reset it
	      this.owner.autoadd.enabled && (this.owner.autoadd.enabled = false);
	      updateViews = true;
	      if (isBeingDeleted) {
		      this.owner.autoadd.proxy = null;	      
	        updateViews = true;
	      }
	    }
      // updateViews() with false, false (do not write settings and do not update log view--settings were just written when the properties themselves were updated
      updateViews && this.owner.callFcnOnOverlays("updateViews");
    }  
  },
  
  ///////////////// logg \\\\\\\\\\\\\\\\\\\\\\\\\\\
  logg : {
    owner : null,
    _maxSize : 500,
    _elements : new Array(this._maxSize),    
    _end : 0,
    _start : 0,
    _full : false,
    enabled : false,
    _templateHeader : "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Strict//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd\">\n<html xmlns=\"http://www.w3.org/1999/xhtml\"><head><title></title><link rel=\"icon\" href=\"http://foxyproxy.mozdev.org/favicon.ico\"/><link rel=\"shortcut icon\" href=\"http://foxyproxy.mozdev.org/favicon.ico\"/><link rel=\"stylesheet\" href=\"http://foxyproxy.mozdev.org/styles/log.css\" type=\"text/css\"/></head><body><table class=\"log-table\"><thead><tr><td class=\"heading\">${timestamp-heading}</td><td class=\"heading\">${url-heading}</td><td class=\"heading\">${proxy-name-heading}</td><td class=\"heading\">${proxy-notes-heading}</td><td class=\"heading\">${pattern-name-heading}</td><td class=\"heading\">${pattern-heading}</td><td class=\"heading\">${pattern-type-heading}</td><td class=\"heading\">${pattern-color-heading}</td></tr></thead><tfoot><tr><td/></tr></tfoot><tbody>",    
    _templateFooter : "</tbody></table></body></html>", 
    _templateRow : "<tr><td class=\"timestamp\">${timestamp}</td><td class=\"url\"><a href=\"${url}\">${url}</a></td><td class=\"proxy-name\">${proxy-name}</td><td class=\"proxy-notes\">${proxy-notes}</td><td class=\"pattern-name\">${pattern-name}</td><td class=\"pattern\">${pattern}</td><td class=\"pattern-type\">${pattern-type}</td><td class=\"pattern-color\">${pattern-color}</td></tr>",         
    _timeformat : null,
	  _months : null,	  
	  _days : null,	    
	  _noURLs : false,
	  noURLsMessage : null,

    fromDOM : function(doc) {
      // init some vars first
	    this._timeformat = this.owner.getMessage("timeformat");
	    this.noURLsMessage = this.owner.getMessage("log.nourls.url");
			this._months = [this.owner.getMessage("months.long.1"), this.owner.getMessage("months.long.2"),
		    this.owner.getMessage("months.long.3"), this.owner.getMessage("months.long.4"), this.owner.getMessage("months.long.5"),
		    this.owner.getMessage("months.long.6"), this.owner.getMessage("months.long.7"), this.owner.getMessage("months.long.8"),
		    this.owner.getMessage("months.long.9"), this.owner.getMessage("months.long.10"), this.owner.getMessage("months.long.11"),
		    this.owner.getMessage("months.long.12")];	    
		  this._days = [this.owner.getMessage("days.long.1"), this.owner.getMessage("days.long.2"),
		    this.owner.getMessage("days.long.3"), this.owner.getMessage("days.long.4"), this.owner.getMessage("days.long.5"),
		    this.owner.getMessage("days.long.6"), this.owner.getMessage("days.long.7")];
		    
		  // Now deserialize...
      var node = doc.getElementsByTagName("logg")[0];
      this.enabled = node.getAttribute("enabled") == "true";
      this._maxSize = node.hasAttribute("maxSize") ?
	      node.getAttribute("maxSize") : 500; // new for 2.0
			if (node.hasAttribute("header")) {
				this._templateHeader = node.getAttribute("header");
			}				
			if (node.hasAttribute("footer")) {
				this._templateFooter = node.getAttribute("footer");
			}
			if (node.hasAttribute("row")) {
				this._templateRow = node.getAttribute("row");
			}
		  this._noURLs = node.hasAttribute("noURLs") ? node.getAttribute("noURLs") == "true" : false; // new for 2.3
	    this.clear();
    },
    
    toDOM : function(doc) {
      var e = doc.createElement("logg");
      e.setAttribute("enabled", this.enabled ? "true" : "false");
      e.setAttribute("maxSize", this._maxSize);
      e.setAttribute("noURLs", this._noURLs);
      e.setAttribute("header", this._templateHeader);
      e.setAttribute("row", this._templateRow);
      e.setAttribute("footer", this._templateFooter);      
      return e;
    },
        
    toHTML : function() {
	    // Doing the heading substitution here (over and over again instead of once in fromDOM()) permits users to switch locales w/o having to restart FF and
	    // the changes take effect immediately in FoxyProxy.
	    var self = this, sz = this.length, ret = this._templateHeader.replace(/\${timestamp-heading}|\${url-heading}|\${proxy-name-heading}|\${proxy-notes-heading}|\${pattern-name-heading}|\${pattern-heading}|\${pattern-type-heading}|\${pattern-color-heading}/gi,
	    	function($0) {
					switch($0) {
						case "${timestamp-heading}": return self.owner.getMessage("foxyproxy.tab.logging.timestamp.label");
						case "${url-heading}": return self.owner.getMessage("foxyproxy.tab.logging.url.label");
						case "${proxy-name-heading}": return self.owner.getMessage("foxyproxy.name.label");
						case "${proxy-notes-heading}": return self.owner.getMessage("foxyproxy.notes.label");			
						case "${pattern-name-heading}": return self.owner.getMessage("foxyproxy.pattern.name.label");			
						case "${pattern-heading}": return self.owner.getMessage("foxyproxy.pattern.label");																					
						case "${pattern-type-heading}": return self.owner.getMessage("foxyproxy.pattern.type.label");
						case "${pattern-color-heading}": return self.owner.getMessage("foxyproxy.whitelist.blacklist.label");																																    	
	    		}
	    	}
	    );
	    function _xmlEncode(str) {
	      return str.replace(/\<|\>|\&|\'|\"/g,
	      	function($0) {
	      	  switch($0) {
	      	    case "<": return "&lt;";
	      	    case ">": return "&gt;";
	      	    case "&": return "&amp;";
	      	    case "'": return "&apos;";
	      	    case "\"": return "&quot;";
	      	  }
	      	}
	      ); 
	    };				    
			for (var i=0; i<sz; i++) {
				ret += self._templateRow.replace(/\${timestamp}|\${url}|\${proxy-name}|\${proxy-notes}|\${pattern-name}|\${pattern}|\${pattern-type}|\${pattern-color}/gi,
					function($0) {
						switch($0) {
							case "${timestamp}": return _xmlEncode(self.format(self.item(i).timestamp));
							case "${url}": return _xmlEncode(self.item(i).uri);
							case "${proxy-name}": return _xmlEncode(self.item(i).proxyName);							
							case "${proxy-notes}": return _xmlEncode(self.item(i).proxyNotes);														
							case "${pattern-name}": return _xmlEncode(self.item(i).matchName);														
							case "${pattern}": return _xmlEncode(self.item(i).matchPattern);																					
							case "${pattern-type}": return _xmlEncode(self.item(i).matchType);
							case "${pattern-color}": return _xmlEncode(self.item(i).whiteBlack);																																										
						}
					}
			  ); 
			}
			return ret + this._templateFooter;
    },

	  // Thanks for the inspiration, Tor2k (http://www.codeproject.com/jscript/dateformat.asp)
	  format : function(d) {
	    d = new Date(d);
	    if (!d.valueOf())
	      return ' ';
			var self = this;	      
	    return this._timeformat.replace(/yyyy|mmmm|mmm|mm|dddd|ddd|dd|hh|HH|nn|ss|zzz|a\/p/gi, 
	      function($1) {
	        switch ($1) {
	          case 'yyyy': return d.getFullYear();
	          case 'mmmm': return self._months[d.getMonth()];
	          case 'mmm':  return self._months[d.getMonth()].substr(0, 3);
	          case 'mm':   return zf((d.getMonth() + 1), 2);
	          case 'dddd': return self._days[d.getDay()];
	          case 'ddd':  return self._days[d.getDay()].substr(0, 3);
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
		  // My own zero-fill fcn, not Tor 2k's. Assumes (n==2 || n == 3) && c<=n.
		  function zf(c, n) { c=""+c; return c.length == 1 ? (n==2?'0'+c:'00'+c) : (c.length == 2 ? (n==2?c:'0'+c) : c); }	    
	  },
    
    get length() {
      var size = 0;
      if (this._end < this._start) {
          size = this._maxSize - this._start + this._end;
      } else if (this._end == this._start) {
         size = (this._full ? this._maxSize : 0);
      } else {
          size = this._end - this._start;
      }
      return size;
    },
    
    get maxSize() {
      return this._maxSize;
    },
    
    set maxSize(m) {
      this._maxSize = m;
      this.clear();
     	this.owner.writeSettings();      
    },

    get noURLs() {
      return this._noURLs;
    },
    
    set noURLs(m) {
      this._noURLs = m;
     	this.owner.writeSettings();
    },
    
    get templateHeader() {
      return this._templateHeader;
    },
    
    set templateHeader(t) {
      this._templateHeader = t;
     	this.owner.writeSettings();
    }, 

    get templateFooter() {
      return this._templateFooter;
    },
    
    set templateFooter(t) {
      this._templateFooter = t;
     	this.owner.writeSettings();
    },   

    get templateRow() {
      return this._templateRow;
    },
    
    set templateRow(t) {
      this._templateRow = t;
     	this.owner.writeSettings();
    },        
    
    clear : function() {
      this._full = false;
      this._end = this._start = 0;
      //this._elements.forEach(function(element, index, array) {array[index] = null;});
      this._elements = new Array(this._maxSize);
    },
    
    scrub : function() {
      // Remove sensitive data (urls)
			var self=this;
			this._elements.forEach(function(element, index, array) {array[index].uri = self.noURLsMessage;});
    },
  
    add : function(o) {
      if (!this.enabled) return;
      this.length == this._maxSize && this._remove();
      this._elements[this._end++] = o;
      this._end >= this._maxSize && (this._end = 0);
      this._end == this._start && (this._full = true);
    },
  
    item : function(idx) {
      return this.length == 0 ? null : this._elements[idx];
    },
  
    _remove : function() {
      if (this.length == 0)
        return;
      var element = this._elements[this._start];
  
      if (element) {
        this._elements[this._start++] = null;
        this._start >= this._maxSize && (this._start = 0);
        this._full = false;
      }
    }
  },

  ///////////////// notifier \\\\\\\\\\\\\\\\\\\\\\\\\\\
  // Thanks for the inspiration: InfoRSS extension (Didier Ernotte, 2005)
  notifier : {    
  	alerts : function() {
      try {
        return CC["@mozilla.org/alerts-service;1"].getService(CI.nsIAlertsService);  
      }
      catch(e) {return null;}
  	}(),
  	
    notify : function(title, text) {   
      text = this._makeFriendly(text);
      if (this.alerts)
        this.alerts.showAlertNotification("chrome://foxyproxy/content/images/foxyproxy-nocopy.gif", title, text, false, "cookie", null);
      else {
        var tooltip = document.getElementById("foxyproxy-popup");
        this._removeChildren(tooltip);
    		var grid = document.createElement("grid");
    		grid.setAttribute("flex", "1");
    		tooltip.appendChild(grid);
    
    		var columns = document.createElement("columns");
    		columns.appendChild(document.createElement("column")); 		
    		grid.appendChild(columns);
    
    		var rows = document.createElement("rows");
    		grid.appendChild(rows);
        this._makeHeaderRow(title, rows);
        this._makeRow("", rows);
        this._makeRow(text, rows);
        tooltip.showPopup(document.getElementById("status-bar"), -1, -1, "tooltip", "topright","bottomright");
      }
    },

    _makeHeaderRow : function(col, gridRows) {
  		var label = document.createElement("label");
  		label.setAttribute("value", col);      
      label.setAttribute("style", "font-weight: bold; text-decoration: underline; color: blue;");
      gridRows.appendChild(label);    
    },
    
    _makeRow : function(col1, gridRows) {
  		var gridRow = document.createElement("row");
  		var label = document.createElement("label");
  		label.setAttribute("value", col1);    
  		gridRow.appendChild(label);
  		gridRows.appendChild(gridRow);  
    },
      
    _removeChildren : function(node) {
      if (node.firstChild) {
        node.removeChild(node.firstChild);
        this._removeChildren(node);
      }
    },
    
    _makeFriendly : function(str) {
      return str.length > 50 ? (str.substring(0, 50) + "...") : str;
    }, 
  },
  
  ///////////////// statusbar \\\\\\\\\\\\\\\\\\\\\
  statusbar : {    
    owner : null,
    _iconEnabled : true,
    _textEnabled : true,  
        
    toDOM : function(doc) {
      var e = doc.createElement("statusbar");
      e.setAttribute("icon", this._iconEnabled ? "true" : "false"); // new for 2.3 (used to be just "enabled")
      e.setAttribute("text", this._textEnabled ? "true" : "false"); // new for 2.3 (used to be just "enabled")     
      return e;
    },
    
    fromDOM : function(doc) {
      var node = doc.getElementsByTagName("statusbar")[0];
      if (node) {
	      if (node.hasAttribute("enabled")) // for compatibility with 2.2.1. Can remove after everyone upgrades to 2.3.
	        this._iconEnabled = this._textEnabled = node.getAttribute("enabled") == "true";
	      else {
	      	this._iconEnabled = node.getAttribute("icon") == "true";
	      	this._textEnabled = node.getAttribute("text") == "true";	      	
	      }
	    }
    },
    
    get iconEnabled() { return this._iconEnabled; },
    set iconEnabled(e) {
      this._iconEnabled = e;
      this.owner.writeSettings();
			gBroadcast(e, "foxyproxy-statusbar-icon");  
      e && this.owner.setMode(this.owner.mode, false, false);          
    },
    
    get textEnabled() { return this._textEnabled; },
    set textEnabled(e) {
      this._textEnabled = e;
      this.owner.writeSettings();
			gBroadcast(e, "foxyproxy-statusbar-text");
      e && this.owner.setMode(this.owner.mode, false, false);          
    },    
  },
  
  ///////////////// strings \\\\\\\\\\\\\\\\\\\\\ 	
  getMessage : function(msg, ar) {
    try {
      return this.strings.getMessage(msg, ar);
    }
    catch (e) {
      dump(e);
      this.alert(null, "Error reading string resource: " + msg); // Do not localize!
    }
  },  
  
  strings : {
    _sbs : CC["@mozilla.org/intl/stringbundle;1"]
      .getService(CI.nsIStringBundleService)
      .createBundle("chrome://foxyproxy/locale/foxyproxy.properties"),    
    _entities : null,
    
    getMessage : function(msg, ar) {
      return ar ? this._sbs.formatStringFromName(msg, ar, ar.length) :
        (this._entities[msg] ? this._entities[msg] : this._sbs.GetStringFromName(msg));
    }
  },

  warnings : {
    owner : null,
	  _noWildcards : true,
    get noWildcards() { return this._noWildcards; },
    set noWildcards(e) {
      this._noWildcards = e;
      this.owner.writeSettings();          
    },
    
    toDOM : function(doc) {
      var e = doc.createElement("warnings"); // new for 2.3
      e.setAttribute("no-wildcards", this._noWildcards ? "true" : "false"); 
      return e;
    },
    
    fromDOM : function(doc) {
      var node = doc.getElementsByTagName("warnings")[0];
      if (node) {
       	this._noWildcards = node.getAttribute("no-wildcards") == "true";
	    }
    },  
  },
    	

  ///////////////// autoadd \\\\\\\\\\\\\\\\\\\\\\  
  autoadd : {
    owner : null,
    _reload : true,
  	_enabled : false,
  	_proxy : null,
  	_notify : true,
		match : null,
		matchName : null,
		
		_urlTemplate : "*${1}/*",
		_ios : CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService),

    get enabled() { return this._enabled; },
    set enabled(e) {
      this._enabled = e;
      this.owner.writeSettings();
      this.owner.callFcnOnOverlays("togglePageLoad", e);    
    },

    get urlTemplate() { return this._urlTemplate; },
    set urlTemplate(u) {
    	this._urlTemplate = u;
    	this.owner.writeSettings();
    },    

    get reload() { return this._reload; },
    set reload(e) {
    	this._reload = e;
    	this.owner.writeSettings();
    },    

    get proxy() { return this._proxy; },
    set proxy(p) {
    	this._proxy = p;
    	this.owner.writeSettings();
    },    

    get notify() { return this._notify; },
    set notify(n) {
    	this._notify = n;
    	this.owner.writeSettings();
    },
                
    setMatchPattern : function(p) {
      this.match.pattern = p;
      this.owner.writeSettings();
    },
    
    setMatchIsRegEx : function(e) {
      this.match.isRegEx = e;
      this.owner.writeSettings();      
    },
    
    applyTemplate : function(url) {    	
	    var parsedUrl = this._ios.newURI(url, "UTF-8", null).QueryInterface(CI.nsIURL);	
	    return this._urlTemplate.replace("${1}", parsedUrl.asciiHost, "g");    
    },
    
    perform : function(url, content) {
      if (this.match.pattern != "") {
	      if (this.owner.getMatchingProxy(url) == this.owner.proxies.lastresort) { // no current proxies match (except the lastresort, which matches everything anyway)
  	      if (this.match.regex.test(content)) {      
	          if (!this._proxy.isMatch(url)) { // Ensure we don't match an existing pattern       
							var temp = this.applyTemplate(url);                  
							var match = CC["@leahscape.org/foxyproxy/match;1"].createInstance(CI.nsISupports).wrappedJSObject;
				      match.name = this.matchName;			      
			  	    match.pattern = temp;
				  	  match.isRegEx = this.match.isRegEx; // todo: make this dynamic
				      this._proxy.matches.push(match);      
						  this._notify && this.owner.notifier.notify(this.owner.getMessage("autoadd.notify"), this.owner.getMessage("autoadd.url.added", [temp, this._proxy.name]));        
		          this.owner.writeSettings();
			        return true;
			      }
			    }
	      }
	    }
      return false;
    }, 
    
    allowed : function() {
		  for (var i=0,p; i<this.owner.proxies.length && (p=this.owner.proxies.item(i)); i++)
		    if (p.mode!="direct" && p.enabled)
		      return true;
		  return false;
    },
    
    toDOM : function(doc) {
			var e = doc.createElement("autoadd");
			e.setAttribute("enabled", this.enabled ? "true" : "false");
			e.setAttribute("urlTemplate", this._urlTemplate);
			e.setAttribute("reload", this._reload);			
			e.setAttribute("notify", this._notify);
			this._proxy && e.setAttribute("proxy-id", this._proxy.id);
			e.appendChild(this.match.toDOM(doc));
      return e;
    },
    
		fromDOM : function(doc) {
      var n = doc.getElementsByTagName("autoadd")[0]; // new for 2.0
      var proxyId;
      if (n) { // because it won't exist for ppl upgrading from 1.0
	      this._enabled = n.getAttribute("enabled") == "true";
	      this._urlTemplate = n.getAttribute("urlTemplate");
	      ((!this._urlTemplate || this._urlTemplate == "") && (this._urlTemplate = "*${1}/*"));
	      this._reload = n.getAttribute("reload") == "true";      
	      this._notify = n.getAttribute("notify") == "true";      	      	      
	      proxyId = n.getAttribute("proxy-id");
        this.match.fromDOM(n.getElementsByTagName("match")[0]);   
        (!this.match.name || this.match.name == "") && (this.match.name = this.owner.getMessage("foxyproxy.autoadd.pattern.name.default.label"));
				this.match.isMultiLine = true;        
	    }
	    var error;
	    if (proxyId) {
	      // Ensure it exists and is enabled and isn't "direct"
	      this._proxy = this.owner.proxies.getById(proxyId);
	      this._enabled && (!this._proxy || !this._proxy.enabled || this._proxy.mode == "direct") && (error = true);
	    }
	    else if (this._enabled)
	    	error = true;
	    if (error) {
        this._enabled = false;
        this.owner.alert(null, this.owner.getMessage("autoadd.error"));
      }	    
		}    
	}
};

	