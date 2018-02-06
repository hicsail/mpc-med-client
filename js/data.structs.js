/**
 * Useful prototype/object method extensionf ro common data structures.
 */
 
if (!Object.keys) {
  Object.keys = (function () {
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString', 'toLocaleString', 'valueOf', 'hasOwnProperty',
          'isPrototypeOf', 'propertyIsEnumerable', 'constructor'
        ],
        dontEnumsLength = dontEnums.length;
    return function (obj) {
      if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) throw new TypeError('Object.keys called on non-object');
      var result = [];
      for (var prop in obj)
        if (hasOwnProperty.call(obj, prop))
          result.push(prop);
      if (hasDontEnumBug)
        for (var i=0; i < dontEnumsLength; i++)
          if (hasOwnProperty.call(obj, dontEnums[i])) result.push(dontEnums[i]);
      return result;
    };
  })();
}

if (!Array.prototype.filter) {
  Array.prototype.filter = function(fun /*, thisp */) {
    "use strict";
    if (this == null)
      throw new TypeError();
    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun != "function")
      throw new TypeError();
    var res = [];
    var thisp = arguments[1];
    for (var i = 0; i < len; i++) {
      if (i in t) {
        var val = t[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, t))
          res.push(val);
      }
    }
    return res;
  };
}

if ( !Array.prototype.forEach ) {
  Array.prototype.forEach = function(fn, scope) {
    for (var i = 0, len = this.length; i < len; ++i)
      fn.call(scope, this[i], i, this);
  };
}

if (!Array.prototype.map) {
  Array.prototype.map = function(callback, thisArg) {
    var T, A, k;
    if (this == null)
      throw new TypeError(" this is null or not defined");
    var O = Object(this);
    var len = O.length >>> 0;
    if (typeof callback !== "function")
      throw new TypeError(callback + " is not a function");
    if (thisArg)
      T = thisArg;
    A = new Array(len);
    k = 0;
    while(k < len) {
      var kValue, mappedValue;
      if (k in O) {
        kValue = O[ k ];
        mappedValue = callback.call(T, kValue, k, O);
        A[ k ] = mappedValue;
      }
      k++;
    }
    return A;
  };      
}

// https://github.com/ttaubert/node-arraybuffer-slice
// (c) 2013 Tim Taubert <tim@timtaubert.de>
// arraybuffer-slice may be freely distributed under the MIT license.

"use strict";

if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
  ArrayBuffer.prototype.slice = function (begin, end) {
    begin = (begin|0) || 0;
    var num = this.byteLength;
    end = end === (void 0) ? num : (end|0);
    // Handle negative values.
    if (begin < 0) begin += num;
    if (end < 0) end += num;
    if (num === 0 || begin >= num || begin >= end)
      return new ArrayBuffer(0);
    var length = Math.min(num - begin, end - begin);
    var target = new ArrayBuffer(length);
    var targetArray = new Uint8Array(target);
    targetArray.set(new Uint8Array(this, begin, length));
    return target;
  };
}

/* eof */