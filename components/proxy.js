/**
  FoxyProxy
  Copyright (C) 2006-2008 Eric H. Jung and LeahScape, Inc.
  http://foxyproxy.mozdev.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/gpl.txt
**/

// See http://forums.mozillazine.org/viewtopic.php?t=308369

//dump("proxy.js\n");
if (!CI) {
  // XPCOM module initialization
  var NSGetModule = function() { return ProxyModule; }

  var CI = Components.interfaces, CC = Components.classes, CR = Components.results, self,
    fileProtocolHandler = CC["@mozilla.org/network/protocol;1?name=file"].getService(CI["nsIFileProtocolHandler"]);
  if ("undefined" != typeof(__LOCATION__)) {
    // preferred way
    self = __LOCATION__;
  }
  else {
    self = fileProtocolHandler.getFileFromURLSpec(Components.Exception().filename);
  }
  var componentDir = self.parent; // the directory this file is in

  // Get attribute from node if it exists, otherwise return |def|.
  // No exceptions, no errors, no null returns.
  var gGetSafeAttr = function(n, name, def) {
    n.QueryInterface(CI.nsIDOMElement);
    return n ? (n.hasAttribute(name) ? n.getAttribute(name) : def) : def;
  }
  // Boolean version of GetSafe
  var gGetSafeAttrB = function(n, name, def) {
    n.QueryInterface(CI.nsIDOMElement);
    return n ? (n.hasAttribute(name) ? n.getAttribute(name)=="true" : def) : def;
  }

  var loadComponentScript = function(filename) {
    try {
      var filePath = componentDir.clone();
      filePath.append(filename);
      loader.loadSubScript(fileProtocolHandler.getURLSpecFromFile(filePath));
    }
    catch (e) {
      dump("Error loading component " + filename + ": " + e + "\n" + e.stack + "\n");
      throw(e);
    }
  }
  var self,
    fileProtocolHandler = CC["@mozilla.org/network/protocol;1?name=file"].getService(CI["nsIFileProtocolHandler"]);
  if ("undefined" != typeof(__LOCATION__)) {
    // preferred way
    self = __LOCATION__;
  }
  else {
    self = fileProtocolHandler.getFileFromURLSpec(Components.Exception().filename);
  }
  var dir = self.parent, // the directory this file is in
    loader = CC["@mozilla.org/moz/jssubscript-loader;1"].getService(CI["mozIJSSubScriptLoader"]);
}

loadComponentScript("autoconf.js");
loadComponentScript("match.js");

var proxyService = CC["@mozilla.org/network/protocol-proxy-service;1"].getService(CI.nsIProtocolProxyService);
///////////////////////////// Proxy class ///////////////////////
function Proxy(fp) {
  this.wrappedJSObject = this;
  this.fp = fp || CC["@leahscape.org/foxyproxy/service;1"].getService().wrappedJSObject;
  this.matches = [];
  this.ippatterns = [];
  this.name = this.notes = "";
  this.manualconf = new ManualConf(this.fp);
  this.autoconf = new AutoConf(this, this.fp);
  this._mode = "manual"; // manual, auto, direct, random
  this._enabled = true;
  this.selectedTabIndex = 0;
  this.lastresort = false;
  this.id = this.fp.proxies.uniqueRandom();
}

Proxy.prototype = {
  direct: proxyService.newProxyInfo("direct", "", -1, 0, 0, null),
  animatedIcons: true,
  includeInCycle: true,
  fp: null,

  QueryInterface: function(aIID) {
    if (!aIID.equals(CI.nsISupports))
      throw CR.NS_ERROR_NO_INTERFACE;
    return this;
  },

  fromDOM : function(node, fpMode) {
    this.name = node.getAttribute("name");
    this.id = node.getAttribute("id") || this.fp.proxies.uniqueRandom();
    this.notes = node.getAttribute("notes");
    this._enabled = node.getAttribute("enabled") == "true";
    this.autoconf.fromDOM(node.getElementsByTagName("autoconf").item(0));
    this.manualconf.fromDOM(node.getElementsByTagName("manualconf").item(0));
    // 1.1 used "manual" instead of "mode" and was true/false only (for manual or auto)
    this._mode = node.hasAttribute("manual") ?
  	  (node.getAttribute("manual") == "true" ? "manual" : "auto") :
    	node.getAttribute("mode");
	  this._mode = this._mode || "manual";
    this.selectedTabIndex = node.getAttribute("selectedTabIndex") || "0";
	  this.lastresort = node.hasAttribute("lastresort") ? node.getAttribute("lastresort") == "true" : false; // new for 2.0
    this.animatedIcons = node.hasAttribute("animatedIcons") ? node.getAttribute("animatedIcons") == "true" : !this.lastresort; // new for 2.4
    this.includeInCycle = node.hasAttribute("includeInCycle") ? node.getAttribute("includeInCycle") == "true" : !this.lastresort; // new for 2.5
    
    // new XPathEvaluator() is not yet available; must go through XPCOM
    var xpe = CC["@mozilla.org/dom/xpath-evaluator;1"].getService(CI.nsIDOMXPathEvaluator),
      resolver = xpe.createNSResolver(node);
    readPatterns("/foxyproxy/proxies/proxy[@id=" + this.id + "]/matches/match", this.matches);
    this.afterPropertiesSet(fpMode);
    function readPatterns(exp, arr) {
      // doc.createNSResolver(doc) fails on FF2 (not FF3), so we use an instance of nsIDOMXPathEvaluator instead
      // of the next line
      // var n = doc.evaluate(exp, doc, doc.createNSResolver(doc), doc.ANY_TYPE, null).iterateNext();    
      var iter = xpe.evaluate(exp, node, resolver, xpe.ANY_TYPE, null);
      iter.QueryInterface(CI.nsIDOMXPathResult); // not necessary in FF3, only 2.x and possibly earlier
      var pat = iter.iterateNext(); // FF 2.0.0.14: iterateNext is not a function
      while (pat) {
        j = arr.length;
        arr[j] = new Match();
        arr[j].fromDOM(pat);
        pat = iter.iterateNext();
      }
    }
  },
  
  toDOM : function(doc) {
    var e = doc.createElement("proxy");
    e.setAttribute("name", this.name);
    e.setAttribute("id", this.id);
    e.setAttribute("notes", this.notes);
    e.setAttribute("enabled", this.enabled);
    e.setAttribute("mode", this.mode);
    e.setAttribute("selectedTabIndex", this.selectedTabIndex);
    e.setAttribute("lastresort", this.lastresort);
    e.setAttribute("animatedIcons", this.animatedIcons);
    e.setAttribute("includeInCycle", this.includeInCycle);

    var matchesElem = doc.createElement("matches");
    e.appendChild(matchesElem);
    for (var j=0, m; j<this.matches.length && (m=this.matches[j]); j++)
      if (!m.temp) matchesElem.appendChild(m.toDOM(doc));

    e.appendChild(this.autoconf.toDOM(doc));
    e.appendChild(this.manualconf.toDOM(doc));
    return e;
  },

  set enabled(e) {
    if (this.lastresort && !e) return; // can't ever disable this guy
    this._enabled = e;
		this.shouldLoadPAC() && this.autoconf.loadPAC();
    this.handleTimer();
  },

  get enabled() {return this._enabled;},

	shouldLoadPAC : function() {
    if (this._mode == "auto" && this._enabled) {
      var m = this.fp.mode;
      return m == this.id || m == "patterns" || m == "random" || m == "roundrobin";
    }
	},

  set mode(m) {
    this._mode = m;
    this.shouldLoadPAC() && this.autoconf.loadPAC();
    this.handleTimer();
  },

	afterPropertiesSet : function(fpMode) {
	  // Load PAC if required. Note that loadPAC() is synchronous and if it fails, it changes our mode to "direct" or disables us.
    this.shouldLoadPAC() && this.autoconf.loadPAC();

   	// Some integrity maintenance: if this is a manual proxy and this.manualconf.proxy wasn't created during deserialization, disable us.
    if (this._enabled && this._mode == "manual" && !this.manualconf.proxy) {
      if (this.lastresort) {
     	  // Switch lastresort to DIRECT since manualconf is corrupt--someone changed foxyproxy.xml manually, outside our GUI
     	  this._mode = "direct";
      }
      else
     	  this._enabled = false;
    }
	  !this._enabled &&
	 	  this.fp.proxies.maintainIntegrity(this, false, true, false); // (proxy, isBeingDeleted, isBeingDisabled, isBecomingDIRECT)
	},

	handleTimer : function() {
		var ac = this.autoconf;
		ac.timer.cancel(); // always always always cancel first before doing anything
		if (this.shouldLoadPAC() && ac._autoReload) {
			ac.timer.initWithCallback(ac, ac._reloadFreqMins*60000, CI.nsITimer.TYPE_REPEATING_SLACK);
		}
	},

  get mode() {return this._mode;},

  /**
   * Check if any white patterns already match uriStr. As a shortcut,
   * we first check if the existing white patterns (as strings) equal |patStr|
   * before performing regular expression matches.
   *
   * Black pattern matches take precendence over white pattern matches.
   * 
   * Note patStr is sometimes null when this method is called.
   */
  isWhiteMatch : function(patStr, uriStr) {
    var white = -1;
    for (var i=0,sz=this.matches.length; i<sz; i++) {
      var m = this.matches[i];
      if (m.enabled) {
        if ((patStr && m.pattern == patStr) || m.regex.test(uriStr)) {
          if (m.isBlackList) {
            // Black takes priority over white
            return false;
          }
          else if (white == -1) {
            white = i; // continue checking for blacklist matches!
          }
        }
      }
    }
    return white == -1 ? false : this.matches[white];
  },

  isBlackMatch : function(patStr, uriStr) {
    for (var i=0,sz=this.matches.length; i<sz; i++) {
      var m = this.matches[i];
      if (m.enabled && m.isBlackList && (m.pattern == patStr || m.regex.test(uriStr)))
        return m;
    }
  },
  
  removeURLPattern : function(removeMe) {
    this.matches = this.matches.filter(function(e) {return e != removeMe;});
  },
  
	resolve : function(spec, host, mp) {
	  function _notifyUserOfError(spec) {
			this.pacErrorNotification && this.fp.notifier.alert(this.fp.getMessage("foxyproxy"), this.fp.getMessage("proxy.error.for.url") + spec);
			return null;
		}
	  // See http://wp.netscape.com/eng/mozilla/2.0/relnotes/demo/proxy-live.html
	  var str = mp.pacResult = this.autoconf._resolver.getProxyForURI(spec, host);
	  if (str && str != "") {
	    str = str.toLowerCase();
	    var tokens = str.split(/\s*;\s*/), // Trim and split
      	proxies = [];
	    if (tokens[tokens.length-1] == "") // In case final token ends with semi-colon
	      tokens.length--;
	    for (var i=0; i<tokens.length; i++) {
	      var components = this.autoconf.parser.exec(tokens[i]);
	      if (!components) continue;
	      switch (components[1]) {
	        case "proxy":
	          proxies.push(proxyService.newProxyInfo("http", components[2], components[3], 0, 0, null));
	          break;
	        case "socks":
	        case "socks5":
	          proxies.push(proxyService.newProxyInfo("socks", components[2], components[3],
	            this.fp._proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null));
	          break;
	        case "socks4":
	          proxies.push(proxyService.newProxyInfo("socks4", components[2], components[3],
	            this.fp._proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null));
	          break;
	        case "direct":
	          proxies.push(this.direct);
	          break;
	        default:
	          return this._notifyUserOfError(spec);
	      }
	    }
	    // Build a proxy list for proxy for failover support
	    for (var i=1; i<=proxies.length-1; i++) {
	      proxies[i-1].failoverTimeout = 1800;
	      proxies[i-1].failoverProxy = proxies[i];
	    }
	    if (proxies[0] == null) {
		    return this._notifyUserOfError(spec);
		  }
		  else if (proxies[1]) {
			  proxies[0].failoverTimeout = 1800;
			  proxies[0].failoverProxy = proxies[1];
		  }
	    return proxies[0];
	  }
	  else {
	    // Resolver did not find a proxy, but this isn't an error condition
	    return null;
	  }
	},

  getProxy : function(spec, host, mp) {
    switch (this._mode) {
      case "manual":return this.manualconf.proxy;
      case "auto":return this.resolve(spec, host, mp);
	    case "direct":return this.direct;
    }
  }
};

///////////////////////////// ManualConf class ///////////////////////
function ManualConf(fp) {
  this.fp = fp;
}

ManualConf.prototype = {
  _host: "",
  _port: "",
  _socksversion: "5",
  _isSocks: false,
  fp : null,

  fromDOM : function(n) {
    this._host = gGetSafeAttr(n, "host", null) || gGetSafeAttr(n, "http", null) ||
      gGetSafeAttr(n, "socks", null) || gGetSafeAttr(n, "ssl", null) ||
      gGetSafeAttr(n, "ftp", null) || gGetSafeAttr(n, "gopher", ""); //"host" is new for 2.5

    this._port = gGetSafeAttr(n, "port", null) || gGetSafeAttr(n, "httpport", null) ||
      gGetSafeAttr(n, "socksport", null) || gGetSafeAttr(n, "sslport", null) ||
      gGetSafeAttr(n, "ftpport", null) || gGetSafeAttr(n, "gopherport", ""); // "port" is new for 2.5

    this._socksversion = gGetSafeAttr(n, "socksversion", "5");

    this._isSocks = n.hasAttribute("isSocks") ? n.getAttribute("isSocks") == "true" :
      n.getAttribute("http") ? false:
      n.getAttribute("ssl") ? false:
      n.getAttribute("ftp") ? false:
      n.getAttribute("gopher") ? false:
      n.getAttribute("socks") ? true : false; // new for 2.5

    this._makeProxy();
  },

  toDOM : function(doc)  {
    var e = doc.createElement("manualconf");
    e.setAttribute("host", this._host);
    e.setAttribute("port", this._port);
    e.setAttribute("socksversion", this._socksversion);
    e.setAttribute("isSocks", this._isSocks);
    return e;
  },

  _makeProxy : function() {
    if (!this._host || !this._port) {
      return;
    }
    this.proxy = this._isSocks ? proxyService.newProxyInfo(this._socksversion == "5"?"socks":"socks4", this._host, this._port,
          this.fp.proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null): // never ignore, never failover
          proxyService.newProxyInfo("http", this._host, this._port, 0, 0, null);
  },

  get host() {return this._host;},
  set host(e) {
    this._host = e;
    this._makeProxy();
  },

  get port() {return this._port;},
  set port(e) {
    this._port = e;
    this._makeProxy();
  },

  get isSocks() {return this._isSocks;},
  set isSocks(e) {
    this._isSocks = e;
    this._makeProxy();
  },

  get socksversion() {return this._socksversion;},
  set socksversion(e) {
    this._socksversion = e;
    this._makeProxy();
  }
};

var ProxyFactory = {
  createInstance: function (aOuter, aIID) {
    if (aOuter != null)
      throw CR.NS_ERROR_NO_AGGREGATION;
    return (new Proxy()).QueryInterface(aIID);
  }
};

var ProxyModule = {
  CLASS_ID : Components.ID("51b469a0-edc1-11da-8ad9-0800200c9a66"),
  CLASS_NAME : "FoxyProxy Proxy Component",
  CONTRACT_ID : "@leahscape.org/foxyproxy/proxy;1",

  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(this.CLASS_ID, this.CLASS_NAME, this.CONTRACT_ID, aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(this.CLASS_ID, aLocation);
  },

  getClassObject: function(aCompMgr, aCID, aIID) {
    if (!aIID.equals(CI.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(this.CLASS_ID))
      return ProxyFactory;

    throw CR.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};
