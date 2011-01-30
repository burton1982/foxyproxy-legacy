var CI = Components.interfaces, CC = Components.classes;
const DEF_PATTERN = "*${3}${6}/*";
function SuperAdd(e) { this.elemName = e; this.elemNameCamelCase = e=="autoadd"?"AutoAdd":"QuickAdd";}
SuperAdd.prototype = {
  owner : null,
  _reload : true,
  _enabled : false,
  _proxy : null,
  _notify : true,
  match : null,
  matchName : null,
  elemName : null,
  elemNameCamelCase : null,
  
  _urlTemplate : DEF_PATTERN,
  _ios : CC["@mozilla.org/network/io-service;1"].getService(CI.nsIIOService),

  init : function(matchName) {
		this.matchName = matchName;	    
		this.match = CC["@leahscape.org/foxyproxy/match;1"].createInstance(CI.nsISupports).wrappedJSObject;
		this.match.isMultiLine = true;
		this.match.name = this.matchName;  
  },
  
  get enabled() { return this._enabled; },
  set enabled(e) {
    this._enabled = e;
    this.owner.writeSettings();
		gBroadcast(e, "foxyproxy-mode-change", null);
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
  
  perform : function(url, content) {
    if (this.match.pattern != "") {
      if (this.owner.getMatchingProxy(url) == this.owner.proxies.lastresort) { // no current proxies match (except the lastresort, which matches everything anyway)
        if (this.match.regex.test(content)) {      
        	return this.addPattern(url);
        }
      }
    }
    return false;
  }, 
  
  applyTemplate : function(url) { 
    var parsedUrl = this._ios.newURI(url, "UTF-8", null).QueryInterface(CI.nsIURL);	
    var ret = this._urlTemplate.replace("${0}", parsedUrl.scheme?parsedUrl.scheme:"", "g");    
		ret = ret.replace("${1}", parsedUrl.username?parsedUrl.username:"", "g");    
		ret = ret.replace("${2}", parsedUrl.password?parsedUrl.password:"", "g"); 
		ret = ret.replace("${3}", parsedUrl.userPass?(parsedUrl.userPass+"@"):"", "g");	
		ret = ret.replace("${4}", parsedUrl.host?parsedUrl.host:"", "g"); 
		ret = ret.replace("${5}", parsedUrl.port == -1?"":parsedUrl.port, "g"); 
		ret = ret.replace("${6}", parsedUrl.hostPort?parsedUrl.hostPort:"", "g"); 
		ret = ret.replace("${7}", parsedUrl.prePath?parsedUrl.prePath:"", "g"); 								
		ret = ret.replace("${8}", parsedUrl.directory?parsedUrl.directory:"", "g"); 
		ret = ret.replace("${9}", parsedUrl.fileBaseName?parsedUrl.fileBaseName:"", "g"); 
		ret = ret.replace("${10}", parsedUrl.fileExtension?parsedUrl.fileExtension:"", "g"); 
		ret = ret.replace("${11}", parsedUrl.fileName?parsedUrl.fileName:"", "g"); 
		ret = ret.replace("${12}", parsedUrl.path?parsedUrl.path:"", "g"); 
		ret = ret.replace("${13}", parsedUrl.ref?parsedUrl.ref:"", "g"); 								
		ret = ret.replace("${14}", parsedUrl.query?parsedUrl.query:"", "g"); 
		return ret.replace("${15}", parsedUrl.spec?parsedUrl.spec:"", "g"); 
  },  
  
  addPattern : function(url) {
	  if (!this._proxy.isMatch(url)) { // Ensure we don't match an existing pattern       
	    var pat = this.applyTemplate(url);                  
	    var match = CC["@leahscape.org/foxyproxy/match;1"].createInstance(CI.nsISupports).wrappedJSObject;
	    match.name = this.matchName;			      
	    match.pattern = pat;
	    match.isRegEx = this.match.isRegEx; // todo: make this dynamic
	    this._proxy.matches.push(match);      
	    this._notify && this.owner.notifier.notify(this.owner.getMessage("superadd.notify", [this.elemNameCamelCase]), this.owner.getMessage("superadd.url.added", [pat, this._proxy.name]));        
	    this.owner.writeSettings();
	    return true;
	  }  
  },
  
  allowed : function() {
    for (var i=0,p; i<this.owner.proxies.length && (p=this.owner.proxies.item(i)); i++)
      if (p.mode!="direct" && p.enabled)
        return true;
    return false;
  },
  
  toDOM : function(doc) {
    var e = doc.createElement(this.elemName);
    e.setAttribute("enabled", this.enabled ? "true" : "false");
    e.setAttribute("urlTemplate", this._urlTemplate);
    e.setAttribute("reload", this._reload);			
    e.setAttribute("notify", this._notify);
    this._proxy && e.setAttribute("proxy-id", this._proxy.id);
    e.appendChild(this.match.toDOM(doc));
    return e;
  },
  
  fromDOM : function(doc) {
    var n = doc.getElementsByTagName(this.elemName)[0];
    var proxyId;
    if (n) {
      this._enabled = n.getAttribute("enabled") == "true";
      this._urlTemplate = n.getAttribute("urlTemplate");
      ((!this._urlTemplate || this._urlTemplate == "") && (this._urlTemplate = DEF_PATTERN));
      // TODO: Next line is a one-time conversion from 2.3 to 2.4. Remove next line after 2.4 release!
			//this._urlTemplate = this._urlTemplate.replace("${1}", "${3}${6}", "g");       
      this._reload = n.getAttribute("reload") == "true";      
      this._notify = n.getAttribute("notify") == "true";      	      	      
      proxyId = n.getAttribute("proxy-id");
      this.match.fromDOM(n.getElementsByTagName("match")[0]);   
      (!this.match.name || this.match.name == "") && (this.match.name = this.owner.getMessage("foxyproxy.autoadd.pattern.label"));
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
      this.owner.alert(null, this.owner.getMessage("superadd.error", [this.elemName]));
    }	    
  }    
};