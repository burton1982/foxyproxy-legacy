/**
  FoxyProxy
  Copyright (C) 2006-#%#% Eric H. Jung and FoxyProxy, Inc.
  http://getfoxyproxy.org/
  eric.jung@yahoo.com

  This source code is released under the GPL license,
  available in the LICENSE file at the root of this installation
  and also online at http://www.gnu.org/licenses/old-licenses/gpl-2.0.html
**/

/* This class exists because we do not want to expose proxy.js (Proxy class)
   directly to web content. That is because such consumers could access
   the .wrappedJSObject property on new Proxy objects and really destroy
   a FoxyProxy configuration. So, we have this value object (a.k.a. data
   transfer object) which they manipulate. It's just a container of
   data/properties, no code.
*/

// Constants
var CC = Components.classes,
  CI = Components.interfaces,
  CU = Components.utils,
  CR = Components.results;

CU.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * FoxyProxy Api - Non-singleton ProxyConfig instances
 */
function ProxyConfig(wrappedProxy) {
  this._wrappedProxy = wrappedProxy || Proxy.fromProxyConfig(this);
  this.manualConfig.owner = this.autoConfig.owner = this;
};

ProxyConfig.prototype = {
  _wrappedProxy: null,

  // getter only for |id| -- no setter
  get id() {
    return this._wrappedProxy.id;
  },

  _name: "",

  get name() {
    return this._wrappedProxy.name;
  },

  set name(e) {
    if (this._wrappedProxy.lastresort) return null; // cannot change Default name
    this._wrappedProxy.name = e;
  },

  _notes: "",

  get notes() {
    return this._wrappedProxy.notes;
  },

  set notes(e) {
    if (this._wrappedProxy.lastresort) return null; // cannot change Default notes    
    this._wrappedProxy.notes = e;
  },

  _color: "#0055E5", // same as DEFAULT_COLOR in proxy.js

  get color() {
    return this._wrappedProxy.color;
  },

  set color(e) {
    this._wrappedProxy.color = e;
  },

  _mode: "manual",

  get mode() {
    return this._wrappedProxy.mode;
  },

  set mode(e) {
    this._wrappedProxy.mode = e;
  },

  _enabled: true,

  get enabled() {
    return this._wrappedProxy.enabled;
  },

  set enabled(e) {
    if (this._wrappedProxy.lastresort) return null; // cannot disable Default
    this._wrappedProxy.enabled = e;
  },

  _selectedTabIndex: 1,

  get selectedTabIndex() {
    return this._wrappedProxy.selectedTabIndex;
  },

  set selectedTabIndex(e) {
    this._wrappedProxy.selectedTabIndex = e;
  },

  _animatedIcons: true,

  get animatedIcons() {
    return this._wrappedProxy.animatedIcons;
  },

  set animatedIcons(e) {
    this._wrappedProxy.animatedIcons = e;
  },

  _includeInCycle: true,

  get includeInCycle() {
    return this._wrappedProxy.animatedIcons;
  },

  set includeInCycle(e) {
   this._wrappedProxy.includeInCycle = e;
  },

  _clearCacheBeforeUse: false,

  get clearCacheBeforeUse() {
    return this._wrappedProxy.clearCacheBeforeUse;
  },

  set clearCacheBeforeUse(e) {
    this._wrappedProxy.clearCacheBeforeUse = e;
  },

  _disableCache: false,

  get disableCache() {
    return this._wrappedProxy.disableCache;
  },

  set disableCache(e) {
    this._wrappedProxy.disableCache = e;
  },

  _clearCookiesBeforeUse: false,

  get clearCookiesBeforeUse() {
    return this._wrappedProxy.clearCookiesBeforeUse;
  },

  set clearCookiesBeforeUse(e) {
    this._wrappedProxy.clearCookiesBeforeUse = e;
  },

  _rejectCookies: false,

  get rejectCookies() {
    return this._wrappedProxy.rejectCookies;
  },

  set rejectCookies(e) {
    this._wrappedProxy.rejectCookies = e;
  },

  _proxyDNS: true,

  get proxyDNS() {
    return this._wrappedProxy.proxyDNS;
  },

  set proxyDNS(e) {
    this._wrappedProxy.proxyDNS = e;
  },

  manualConfig: {
    owner: null,
    _host: "",

    get host() {
      return this.owner._wrappedProxy.manualconf.host;
    },

    set host(e) {
      this.owner._wrappedProxy.manualconf.host = e;
    },

    _port: "",

    get port() {
      return this.owner._wrappedProxy.manualconf.port;
    },

    set port(e) {
      this.owner._wrappedProxy.manualconf.port = e;
    },

    _socks: false,

    get socks() {
      return this.owner._wrappedProxy.manualconf.isSocks;
    },

    set socks(e) {
      this.owner._wrappedProxy.manualconf.isSocks = e;
    },

    _socksVersion: 5,

    get socksversion() {
      return this.owner._wrappedProxy.manualconf.socksversion;
    },

    set socksversion(e) {
      this.owner._wrappedProxy.manualconf.socksversion = e;
    }
  },

  autoConfig: {
    owner: null,
    _loadNotification: true,

    get loadNotification() {
      return this.owner._wrappedProxy.autoconf.loadNotification;
    },

    set loadNotification(e) {
      this.owner._wrappedProxy.autoconf.loadNotification = e;
    },

    _errorNotification: true,

    get errorNotification() {
      return this.owner._wrappedProxy.autoconf.errorNotification;
    },

    set errorNotification(e) {
      this.owner._wrappedProxy.autoconf.errorNotification = e;
    },

    _url: "",

    get url() {
      return this.owner._wrappedProxy.autoconf.url;
    },

    set url(e) {
      this.owner._wrappedProxy.autoconf.url = e;
    },

    _autoReload: false,

    get autoReload() {
      return this.owner._wrappedProxy.autoconf.autoReload;
    },

    set autoReload(e) {
      this.owner._wrappedProxy.autoconf.autoReload = e;
    },

    _reloadFrequencyMins: 60,

    get reloadFrequencyMins() {
      return this.owner._wrappedProxy.autoconf.reloadFrequencyMins;
    },

    set reloadFrequencyMins(e) {
      this.owner._wrappedProxy.autoconf.reloadFrequencyMins = e;
    },

    _disableOnBadPAC: true,

    get disableOnBadPAC() {
      return this.owner._wrappedProxy.autoconf.disableOnBadPAC;
    },

    set disableOnBadPAC(e) {
      this.owner._wrappedProxy.autoconf.disableOnBadPAC = e;
    },

    _mode: "pac",

    get mode() {
      return this.owner._wrappedProxy.autoconf.mode;
    },

    set mode(e) {
      this.owner._wrappedProxy.autoconf.mode = e;
    }
  },

  // nsIClassInfo
  /*
    Gecko 2.x only (doesn't work with Firefox 3.6.x)
      classInfo: generateCI({ interfaces: ["foxyProxyConfig"], classID: Components.ID("{c5a3caf1-d6bf-43be-8de6-e508ad02ca36}"),
      contractID: "@leahscape.org/foxyproxy/proxyconfig;1",
      classDescription: "FoxyProxy API ProxyConfig", flags: CI.nsIClassInfo.DOM_OBJECT}),
  */

  flags: CI.nsIClassInfo.DOM_OBJECT,
  implementationLanguage: CI.nsIProgrammingLanguage.JAVASCRIPT,
  getHelperForLanguage: function(l) null,
  getInterfaces: function(count) {
    let interfaces = [CI.foxyProxyConfig];
    count.value = interfaces.length;
    return interfaces;
  },

  classDescription: "FoxyProxy API ProxyConfig",
  contractID: "@leahscape.org/foxyproxy/proxyconfig;1",
  classID: Components.ID("{c5a3caf1-d6bf-43be-8de6-e508ad02ca36}"), // uuid from IDL
  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.foxyProxyConfig, CI.nsIClassInfo]),
};
/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4)
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 and earlier (Firefox 3.6)
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([ProxyConfig]);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule([ProxyConfig]);
