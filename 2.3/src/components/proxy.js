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
var fp = null;
var proxyService = CC["@mozilla.org/network/protocol-proxy-service;1"].getService(CI.nsIProtocolProxyService);
function gQueryInterface(aIID) {
  if(!aIID.equals(CI.nsISupports) && !aIID.equals(CI.nsISupportsWeakReference))
    throw CR.NS_ERROR_NO_INTERFACE;
  return this;
}

///////////////////////////// Proxy class ///////////////////////
function Proxy() {
  this.wrappedJSObject = this;
  !fp && 
  	(fp = CC["@leahscape.org/foxyproxy/service;1"].getService(CI.nsISupports).wrappedJSObject);  
  this.matches = new Array();
  this.name = this.notes = "";
  this.manualconf = new ManualConf();
  this.autoconf = new AutoConf(this, null);
  this.mode = "manual"; // manual, auto, or direct
  this.enabled = true;
  this.selectedTabIndex = 0;
  this.lastresort = this.usehttpforall = false;
  this.id = fp.proxies.uniqueRandom();
}

Proxy.prototype = {
  QueryInterface: gQueryInterface,
  direct: proxyService.newProxyInfo("direct", "yahoo.com", -1, 0, 0, null),

	__registration: function() {
		return ({topics: null,
			observerName: null,
		  contractId: "@leahscape.org/foxyproxy/proxy;1",
			classId: Components.ID("{51b469a0-edc1-11da-8ad9-0800200c9a66}"),
			constructor: Proxy,
			className: "FoxyProxy Proxy Component"});
	},
	  
  fromDOM : function(node) {
    this.name = node.getAttribute("name");
    this.id = node.getAttribute("id") || fp.proxies.uniqueRandom();    
    this.notes = node.getAttribute("notes");
    this.enabled = node.getAttribute("enabled") == "true";     // before autoconf so we conditionally load pac file
    this.autoconf.fromDOM(this, node.getElementsByTagName("autoconf")[0]);
    this.manualconf.fromDOM(node.getElementsByTagName("manualconf")[0]);
    // 1.1 used "manual" instead of "mode" and was true/false only (for manual or auto)
    this.mode = node.hasAttribute("manual") ?
  	  (node.getAttribute("manual") == "true" ? "manual" : "auto") :
    	node.getAttribute("mode");
    this.selectedTabIndex = node.getAttribute("selectedTabIndex") || "0";
    this.usehttpforall = node.getAttribute("useHttpForAll") == "true";
	  this.lastresort = node.hasAttribute("lastresort") ? node.getAttribute("lastresort") == "true" : false; // new for 2.0	     
    for (var i=0,temp=node.getElementsByTagName("match"); i<temp.length; i++) {
      var j = this.matches.length;
      this.matches[j] = new Match();
      this.matches[j].fromDOM(temp[i]);
    }
  },

  set enabled(e) {
    if (this.lastresort && !e) return; // can't ever disable this guy
    this._enabled = e;
    e && this._mode == "auto" && this.autoconf.loadPAC();
    !e && fp.proxies.maintainIntegrity(this, false, true, false); // // (proxy, isBeingDeleted, isBeingDisabled, isBecomingDIRECT)
  },

  get enabled() {return this._enabled;},

  set mode(m) {
    this._mode = m;
    this._enabled && m == "auto" && this.autoconf.loadPAC();
    m == "direct" && fp.proxies.maintainIntegrity(this, false, false, true); // (proxy, isBeingDeleted, isBeingDisabled, isBecomingDIRECT)
  },

  get mode() {return this._mode;},

  toDOM : function(doc) {
    var e = doc.createElement("proxy");
    e.setAttribute("name", this.name);
    e.setAttribute("id", this.id);  
    e.setAttribute("notes", this.notes);
    e.setAttribute("enabled", this.enabled ? "true" : "false");
    e.setAttribute("mode", this.mode);  
    e.setAttribute("selectedTabIndex", this.selectedTabIndex);
    e.setAttribute("useHttpForAll", this.usehttpforall ? "true" : "false");    
    e.setAttribute("lastresort", this.lastresort);        
    
    var matchesElem = doc.createElement("matches");
    e.appendChild(matchesElem);
    for (var j=0; j<this.matches.length; j++) {
      matchesElem.appendChild(this.matches[j].toDOM(doc));
    } 
    e.appendChild(this.autoconf.toDOM(doc));    
    e.appendChild(this.manualconf.toDOM(doc));  
    return e;   
  },

  isMatch : function(uriStr) {
    var white = -1;
    for (var i=0; i<this.matches.length; i++) {
      if (this.matches[i].enabled && this.matches[i].regex.test(uriStr)) {
        if (this.matches[i].isBlackList) {
          return false;
        }
        else if (white == -1) {
          white = i; // continue checking for blacklist matches!
        }
      }
    }
    return white == -1 ? false : this.matches[white];
  },

	_doManual : function(uri) {
	  switch (uri.scheme) {
	    case "http":return this.manualconf.httpProxy?this.manualconf.httpProxy:this.manualconf.socksProxy;
	    case "https":return this.manualconf.sslProxy?this.manualconf.sslProxy:this.manualconf.socksProxy;
	    case "ftp":return this.manualconf.ftpProxy?this.manualconf.ftpProxy:this.manualconf.socksProxy;
	    case "gopher":return this.manualconf.gopherProxy?this.manualconf.gopherProxy:this.manualconf.socksProxy;
	    default: return this._notifyUserOfError(uri);
	  }	
	},
	
	_doAuto : function(uri) {
	  // See http://wp.netscape.com/eng/mozilla/2.0/relnotes/demo/proxy-live.html
	  var str = this.autoconf._resolver.getProxyForURI(uri.spec, uri.host);
	  if (str && str != "") {
	    str = str.toLowerCase();
	    var tokens = str.split(/\s*;\s*/); // Trim and split
	    var proxies = new Array();
	    if (tokens[tokens.length-1] == "") // In case final token ends with semi-colon
	      tokens.length--;      
	    for (var i=0; i<tokens.length; i++) {
	      var components = this.autoconf.parser.exec(tokens[i]); 
	      if (!components) continue;
	      switch (components[1]) {
	        case "proxy":
	          proxies.push(proxyService.newProxyInfo("http", components[2], components[3]?components[3]:80, 0, 0, null));
	          break;
	        case "socks":
	        case "socks5":
	          proxies.push(proxyService.newProxyInfo("socks", components[2], components[3]?components[3]:1080,
	            fp._proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null));
	          break;
	        case "socks4":
	          proxies.push(proxyService.newProxyInfo("socks4", components[2], components[3]?components[3]:1080,
	            fp._proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null));          
	          break;
	        case "direct":
	          proxies.push(this.direct);                    
	          break;
	        default:
	          return this._notifyUserOfError(uri);
	      }
	    }
	    // Chain the proxies
	    for (var i=1; i<=proxies.length-1; i++) {
	      proxies[i-1].failoverTimeout = 1800;
	      proxies[i-1].failoverProxy = proxies[i];
	    }
	    if (proxies[0] == null)
		    return this._notifyUserOfError(uri);
	    return proxies[0];
	  }
	  else {
	    // Resolver did not find a proxy, but this isn't an error condition
	    return null;
	  }	
	},
	
  getProxy : function(uri) {
    switch (this._mode) {
      case "manual":return this._doManual(uri);
      case "auto":return this._doAuto(uri);
	    case "direct":return this.direct;
    }
  },
	
	_notifyUserOfError : function(uri) {
		fp.pacErrorNotification && fp.notifier.notify(fp.getMessage("foxyproxy"), fp.getMessage("proxy.error.for.url") + uri.spec);
		return null;
	}
};

///////////////////////////// Match class///////////////////////
function Match() {
  this.wrappedJSObject = this;
	this.name = this.pattern = "";
	this.isMultiLine = this._isRegEx = this.isBlackList = false;
	this.enabled = true;  
}

Match.prototype = {
  QueryInterface: gQueryInterface,

	__registration: function() {
		return ({topics: null,
			observerName: null,
		  contractId: "@leahscape.org/foxyproxy/match;1",
			classId: Components.ID("{2b49ed90-f194-11da-8ad9-0800200c9a66}"),
			constructor: Match,
			className: "FoxyProxy Match Component"});
	},
	  
  set pattern(p) {
    this._pattern = p == null ? "" : p; // prevent null patterns
    this.buildRegEx();
  },
  
  get pattern() {
    return this._pattern;
  },

  set isRegEx(r) {
    this._isRegEx = r;
    this.buildRegEx();
  },
  
  get isRegEx() {
    return this._isRegEx;
  },

  set isMultiLine(m) {
    this._isMultiLine = m;
    this.buildRegEx();
  },
  
  get isMultiLine() {
    return this._isMultiLine;
  },
          
  buildRegEx : function() {
    var pat = this._pattern;
    if (!this._isRegEx) {
      // Wildcards
      pat = pat.replace(/\./g, '\\.');
      pat = pat.replace(/\*/g, '.*');
      pat = pat.replace(/\?/g, '.');
    }
    if (!this._isMultiLine) {
	    pat[0] != "^" && (pat = "^" + pat);
  	  pat[pat.length-1] != "$" && (pat = pat + "$");
  	}
  	try {
	 	  this.regex = new RegExp(pat);  	
	 	}
	 	catch(e){
	 		// ignore--we might be in a state where the regexp is invalid because
	 		// _isRegEx hasn't been changed to false yet, so we executed the wildcard
	 		// replace() calls. however, this code is about to re-run because we'll be
	 		// changed to a wildcard and re-calculate the regex correctly.
	 	}
  },
  
  fromDOM : function(node) {
	  this.name = node.hasAttribute("notes") ? node.getAttribute("notes") : (node.getAttribute("name") || ""); // name was called notes in v1.0
	  this._isRegEx = node.getAttribute("isRegEx") == "true";
	  this._pattern = node.hasAttribute("pattern") ? node.getAttribute("pattern") : "";
	  this.isBlackList = node.hasAttribute("isBlackList") ? node.getAttribute("isBlackList") == "true" : false; // new for 2.0  
	  this.enabled = node.hasAttribute("enabled") ? node.getAttribute("enabled") == "true" : true; // new for 2.0
	  this.isMultiLine = node.hasAttribute("isMultiLine") ? node.getAttribute("isMultiLine") == "true" : false; // new for 2.0. Don't set _isMultiLine because isMultiLine sets the regex
  },

  toDOM : function(doc) {
    var matchElem = doc.createElement("match");
    matchElem.setAttribute("enabled", this.enabled ? "true" : "false");        
    matchElem.setAttribute("name", this.name);
    matchElem.setAttribute("pattern", this._pattern);
    matchElem.setAttribute("isRegEx", this.isRegEx ? "true" : "false");  
    matchElem.setAttribute("isBlackList", this.isBlackList ? "true" : "false");      
    matchElem.setAttribute("isMultiLine", this._isMultiLine ? "true" : "false");      
    return matchElem; 
  }
};

///////////////////////////// ManualConf class ///////////////////////
function ManualConf() {
  this.wrappedJSObject = this;
  this.http = this.httpport = this.ssl = this.sslport = this.ftp = this.ftpport = 
    this.gopher = this.gopherport = this.socks = this.socksport = "";
  this.socksversion = "5";
  this.makeProxies();
}

ManualConf.prototype = {
  QueryInterface: gQueryInterface,
  
	__registration: function() {
		return ({topics: null,
			observerName: null,
		  contractId: "@leahscape.org/foxyproxy/manualconf;1",
			classId: Components.ID("{457e4d50-f194-11da-8ad9-0800200c9a66}"),
			constructor: ManualConf,
			className: "FoxyProxy ManualConfiguration Component"});
	},
	        
  fromDOM : function(node) {
    this.http = node.getAttribute("http");
    this.httpport = node.getAttribute("httpport");
    this.ssl = node.getAttribute("ssl");
    this.sslport = node.getAttribute("sslport");
    this.ftp = node.getAttribute("ftp");
    this.ftpport = node.getAttribute("ftpport");
    this.gopher = node.getAttribute("gopher");
    this.gopherport = node.getAttribute("gopherport");
    this.socks = node.getAttribute("socks");
    this.socksport = node.getAttribute("socksport");
    this.socksversion = node.getAttribute("socksversion");
    this.makeProxies();      
  },

  makeProxies : function() {    
    this.http != "" && (this.httpProxy = proxyService.newProxyInfo("http", this.http, this.httpport, 0, 0, null)); // never ignore, never failover
    this.ssl != "" && (this.sslProxy = proxyService.newProxyInfo("http", this.ssl, this.sslport, 0, 0, null));
    this.ftp != "" && (this.ftpProxy = proxyService.newProxyInfo("http", this.ftp, this.ftpport, 0, 0, null));
    this.gopher != "" && (this.gopherProxy = proxyService.newProxyInfo("http", this.gopher, this.gopherport, 0, 0, null));
    this.socks != "" && (this.socksProxy = proxyService.newProxyInfo(this.socksversion == "5"?"socks":"socks4", this.socks, this.socksport,
      fp.proxyDNS ? CI.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST : 0, 0, null));
  },

  toDOM : function(doc)  {
    var e = doc.createElement("manualconf"); 
    e.setAttribute("http", this.http);      
    e.setAttribute("httpport", this.httpport);  
    e.setAttribute("ssl", this.ssl);  
    e.setAttribute("sslport", this.sslport);
    e.setAttribute("ftp", this.ftp);  
    e.setAttribute("ftpport", this.ftpport);  
    e.setAttribute("gopher", this.gopher);  
    e.setAttribute("gopherport", this.gopherport); 
    e.setAttribute("socks", this.socks);  
    e.setAttribute("socksport", this.socksport);    
    e.setAttribute("socksversion", this.socksversion);
    return e;
  }    
};

///////////////////////////// AutoConf class ///////////////////////
function AutoConf(owner, node) {
  this.wrappedJSObject = this;
  this.fromDOM(owner, node);
}

AutoConf.prototype = {
  QueryInterface: gQueryInterface,  
  parser : /\s*(\S+)\s*(?:([^:]+):?(\d*)\s*[;]?\s*)?/,
  status : 0,
  error : null,

	__registration: function() {
		return ({topics: null,
			observerName: null,
		  contractId: "@leahscape.org/foxyproxy/autoconf;1",
			classId: Components.ID("{54382370-f194-11da-8ad9-0800200c9a66}"),
			constructor: AutoConf,
			className: "FoxyProxy AutoConfiguration Component"});
	},
	    
  fromDOM : function(owner, node) {
    this.owner = owner;
    this.url = node ? node.getAttribute("url") : "";
    this._pac = "";
    this._resolver = CC["@mozilla.org/network/proxy-auto-config;1"]
      .createInstance(CI.nsIProxyAutoConfig);  
  },
  
  toDOM : function(doc) {  
    var e = doc.createElement("autoconf");
    e.setAttribute("url", this.url);
    return e;
  },

  loadPAC : function() {
    this._pac = "";
    try {
      var req = CC["@mozilla.org/xmlextras/xmlhttprequest;1"]
        .createInstance(CI.nsIXMLHttpRequest);
      req.open("GET", this.url, false);
      req.send(null);
      this.status = req.status;
      if (this.status == 200 || (this.status == 0 && this.url.indexOf("file://") == 0)) {
        dump("this.status="+this.status+"\n");
        try {
          this._pac = req.responseText;
          this._resolver.init(this.url, this._pac);
          fp.pacLoadNotification && fp.notifier.notify(fp.getMessage("pac.status"), fp.getMessage("pac.status.success", [this.owner.name]));
          this.owner._enabled = true; // Use _enabled so we don't loop infinitely
          this.error = null;   
        }
        catch(e) {
          this._pac = "";
          this.badPAC("pac.status.error", e);
        }     
      }
      else {
        this.badPAC("pac.status.loadfailure");
      }
    }
    catch(e) {
      this.badPAC("pac.status.loadfailure", e);
    } 
  },

  badPAC : function(res, e) {
		if (e) {
      dump(e) + "\n";
      this.error = e;
    }
    fp.pacErrorNotification && fp.notifier.notify(fp.getMessage("pac.status"), fp.getMessage(res, [this.owner.name, this.status, this.error]));
    if (this.owner.lastresort)
      this.owner.mode = "direct"; // don't disable!
    else
      this.owner.enabled = false;
  }
};

///////////////////////////// MatchingProxy class ///////////////////////
function MatchingProxy() {
  this.wrappedJSObject = this;
}

MatchingProxy.prototype = {
  QueryInterface: gQueryInterface,
  randomMsg : null,
  allMsg : null,
  regExMsg : null,
  wcMsg : null,
  blackMsg : null,
  whiteMsg : null,
  
  _init : function() {
    this.randomMsg = fp.getMessage("proxy.random");
    this.allMsg = fp.getMessage("proxy.all.urls");
    this.regExMsg = fp.getMessage("foxyproxy.regex.label");
    this.wcMsg = fp.getMessage("foxyproxy.wildcard.label");
    this.blackMsg = fp.getMessage("foxyproxy.blacklist.label");
    this.whiteMsg = fp.getMessage("foxyproxy.whitelist.label");   
  },
  
  init : function(proxy, aMatch, uriStr, type) {
    (!this.randomMsg && this._init());
    this.timestamp = Date.now();
    this.uri = uriStr;
    this.proxy = proxy;
    this.proxyName = proxy.name; // Make local copy so logg history doesn't change if user changes proxy    
    this.proxyNotes = proxy.notes;  // ""
    if (type == "pat") {
      this.matchName = aMatch.name;  // Make local copy so logg history doesn't change if user changes proxy
      this.matchPattern = aMatch.pattern; // ""
      this.matchType = aMatch.isRegEx ? this.regExMsg : this.wcMsg;  
      this.whiteBlack = aMatch.isBlackList ? this.blackMsg : this.whiteMsg; // ""  
		}
		else if (type == "rand")
      this.matchName = this.matchPattern = this.matchType = this.whiteBlack = this.randomMsg;
		else // "ded"
		  this.whiteBlack = this.matchName = this.matchPattern = this.matchType = this.allMsg;
		return this;
  },
  
	__registration: function() {
		return ({topics: null,
			observerName: null,
		  contractId: "@leahscape.org/foxyproxy/matchingproxy;1",
			classId: Components.ID("{c5338500-f195-11da-8ad9-0800200c9a66}"),
			constructor: MatchingProxy,
			className: "FoxyProxy MatchingProxy Component"});
	}	  
};
