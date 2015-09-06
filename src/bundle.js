(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
var cp = require('child_process')
var quote = require('shell-quote').quote
var zeroFill = require('zero-fill')

if (!cp.execSync) {
  console.error('Error: Missing child_process.execSync. Please use node 0.12 or iojs.')
  process.exit(1)
}

// Path to Airport binary on 10.7, 10.8, and 10.9 (might be different on older OS X)
var PATH_TO_AIRPORT = '/System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport'

// Regex to validate a MAC address
// Example: 00-00-00-00-00-00 or 00:00:00:00:00:00 or 000000000000
var MAC_ADDRESS_RE = /([0-9A-F]{1,2})[:-]?([0-9A-F]{1,2})[:-]?([0-9A-F]{1,2})[:-]?([0-9A-F]{1,2})[:-]?([0-9A-F]{1,2})[:-]?([0-9A-F]{1,2})/i

// Regex to validate a MAC address in cisco-style
// Example: 0123.4567.89ab
var CISCO_MAC_ADDRESS_RE = /([0-9A-F]{0,4})\.([0-9A-F]{0,4})\.([0-9A-F]{0,4})/i

// The possible port names for wireless devices as returned by networksetup.
var WIRELESS_PORT_NAMES = ['wi-fi', 'airport']
exports.WIRELESS_PORT_NAMES = WIRELESS_PORT_NAMES

/**
 * Returns the list of interfaces found on this machine as reported by the
 * `networksetup` command.
 * @param {Array.<string>|null} targets
 * @return {Array.<Object>)}
 */
exports.findInterfaces = function (targets) {
  targets = targets || []

  targets = targets.map(function (target) {
    return target.toLowerCase()
  })

  var output, interfaces, details, result, i, port, device, address, it, j, target

  if (process.platform === 'darwin') {

    // Parse the output of `networksetup -listallhardwareports` which gives
    // us 3 fields per port:
    // - the port name,
    // - the device associated with this port, if any,
    // - the MAC address, if any, otherwise 'N/A'

    try {
      output = cp.execSync('networksetup -listallhardwareports').toString()
    } catch (err) {
      throw err
    }
    details = []
    while (true) {
      result = /(?:Hardware Port|Device|Ethernet Address): (.+)/.exec(output)
      if (!result || !result[1]) {
        break
      }
      details.push(result[1])
      output = output.slice(result.index + result[1].length)
    }

    interfaces = [] // to return

    // Split the results into chunks of 3 (for our three fields) and yield
    // those that match `targets`.
    for (i = 0; i < details.length; i += 3) {
      port = details[i]
      device = details[i + 1]
      address = details[i + 2]

      address = MAC_ADDRESS_RE.exec(address.toUpperCase())
      if (address) {
        address = exports.normalize(address[0])
      }

      it = {
        address: address,
        currentAddress: exports.getInterfaceMAC(device),
        device: device,
        port: port
      }

      if (targets.length === 0) {
        // Not trying to match anything in particular, return everything.
        interfaces.push(it)
        continue
      }

      for (j = 0; j < targets.length; j++) {
        target = targets[j]
        if (target === port.toLowerCase() || target === device.toLowerCase()) {
          interfaces.push(it)
          break
        }
      }
    }

  } else if (process.platform === 'linux') {

    // Parse the output of `ifconfig` which gives us:
    // - the adapter description
    // - the adapter name/device associated with this, if any,
    // - the MAC address, if any
    try {
      output = cp.execSync('ifconfig', { stdio: 'pipe' }).toString()
    } catch (err) {
      throw err
    }

    details = []
    while (true) {
      result = /(.*?)HWaddr(.*)/mi.exec(output)
      if (!result || !result[1] || !result[2]) {
        break
      }
      details.push(result[1], result[2])
      output = output.slice(result.index + result[0].length)
    }

    interfaces = []

    for (i = 0; i < details.length; i += 2) {
      var s = details[i].split(':')
      if (s.length >= 2) {
        device = s[0].split(' ')[0]
        port = s[1].trim()
      }

      address = details[i + 1].trim()
      if (address) {
        address = exports.normalize(address)
      }

      it = {
        address: address,
        currentAddress: exports.getInterfaceMAC(device),
        device: device,
        port: port
      }

      if (targets.length === 0) {
        // Not trying to match anything in particular, return everything.
        interfaces.push(it)
        continue
      }

      for (j = 0; j < targets.length; j++) {
        target = targets[j]
        if (target === port.toLowerCase() || target === device.toLowerCase()) {
          interfaces.push(it)
          break
        }
      }

    }

  } else if (process.platform === 'windows') {

  }

  return interfaces
}

/**
 * Returns the first interface which matches `target`
 * @param  {string} target
 * @return {Object}
 */
exports.findInterface = function (target) {
  var interfaces = exports.findInterfaces([target])
  return interfaces && interfaces[0]
}

/**
 * Returns currently-set MAC address of given interface. This is distinct from the
 * interface's hardware MAC address.
 * @return {string}
 */
exports.getInterfaceMAC = function (device) {
  var output, address

  if (process.platform === 'darwin' || process.platform === 'linux') {

    try {
      output = cp.execSync(quote(['ifconfig', device]), { stdio: 'pipe' }).toString()
    } catch (err) {
      return null
    }

    address = MAC_ADDRESS_RE.exec(output)
    return address && exports.normalize(address[0])

  } else if (process.platform === 'windows') {

  }
}

/**
 * Sets the mac address for given `device` to `mac`.
 *
 * Device varies by platform:
 *   OS X, Linux: this is the interface name in ifconfig
 *   Windows: this is the network adapter name in ipconfig
 *
 * @param {string} device
 * @param {string} mac
 * @param {string=} port
 */
exports.setInterfaceMAC = function (device, mac, port) {
  if (!MAC_ADDRESS_RE.exec(mac)) {
    throw new Error(mac + ' is not a valid MAC address')
  }

  if (process.platform === 'darwin') {

    if (port && port.toLowerCase().indexOf(WIRELESS_PORT_NAMES) >= 0) {
      // Turn on the device, assuming it's an airport device.
      try {
        cp.execSync(quote(['networksetup', '-setairportpower', device, 'on']))
      } catch (err) {
        throw new Error('Unable to power on wifi device')
      }
    }

    // For some reason this seems to be required even when changing a non-airport device.
    try {
      cp.execSync(quote([PATH_TO_AIRPORT, '-z']))
    } catch (err) {
      throw new Error('Unable to disassociate from wifi networks')
    }

    // Change the MAC.
    try {
      cp.execSync(quote(['ifconfig', device, 'ether', mac]))
    } catch (err) {
      throw new Error('Unable to change MAC address')
    }

    // Associate airport with known network (if any)
    // Note: This does not work on OS X 10.9 due to changes in the Airport utility
    try {
      cp.execSync('networksetup -detectnewhardware')
    } catch (err) {
      throw new Error('Unable to associate with known networks')
    }

  } else if (process.platform === 'linux') {

    // Set the device's mac address.
    // Handles shutting down and starting back up interface.
    try {
      cp.execSync(quote(['ifconfig', device, 'down', 'hw', 'ether', mac]))
      cp.execSync(quote(['ifconfig', device, 'up']))
    } catch (err) {
      throw new Error('Unable to change MAC address')
    }

  } else if (process.platform === 'win32') {

  }
}

/**
 * Generates and returns a random MAC address.
 * @param  {boolean} localAdmin  locally administered address
 * @return {string}
 */
exports.random = function (localAdmin) {
  // By default use a random address in VMWare's MAC address
  // range used by VMWare VMs, which has a very slim chance of colliding
  // with existing devices.
  var mac = [
    0x00,
    0x05,
    0x69,
    random(0x00, 0x7f),
    random(0x00, 0xff),
    random(0x00, 0xff)
  ]

  if (localAdmin) {
    // Universally administered and locally administered addresses are
    // distinguished by setting the second least significant bit of the
    // most significant byte of the address. If the bit is 0, the address
    // is universally administered. If it is 1, the address is locally
    // administered. In the example address 02-00-00-00-00-01 the most
    // significant byte is 02h. The binary is 00000010 and the second
    // least significant bit is 1. Therefore, it is a locally administered
    // address.[3] The bit is 0 in all OUIs.
    mac[0] |= 2
  }

  return mac
    .map(function (byte) {
      return zeroFill(2, byte.toString(16))
    })
    .join(':').toUpperCase()
}

/**
 * Takes a MAC address in various formats:
 *
 *      - 00:00:00:00:00:00,
 *      - 00-00-00-00-00-00,
 *      - 0000.0000.0000
 *
 *  ... and returns it in the format 00:00:00:00:00:00.
 *
 * @param  {string} mac
 * @return {string}
 */
exports.normalize = function (mac) {
  var m = CISCO_MAC_ADDRESS_RE.exec(mac)
  if (m) {
    var halfwords = m.slice(1)
    mac = halfwords.map(function (halfword) {
      return zeroFill(4, halfword)
    }).join('')
    return chunk(mac, 2).join(':').toUpperCase()
  }

  m = MAC_ADDRESS_RE.exec(mac)
  if (m) {
    var bytes = m.slice(1)
    return bytes
      .map(function (byte) {
        return zeroFill(2, byte)
      })
      .join(':')
      .toUpperCase()
  }

  // return None
}

function chunk (str, n) {
  var arr = []
  for (var i = 0; i < str.length; i += n) {
    arr.push(str.slice(i, i + n))
  }
  return arr
}

/**
 * Return a random integer between min and max (inclusive).
 * @param  {number} min
 * @param  {number=} max
 * @return {number}
 */
function random (min, max) {
  if (max == null) {
    max = min
    min = 0
  }
  return min + Math.floor(Math.random() * (max - min + 1))
}

}).call(this,require('_process'))
},{"_process":12,"child_process":11,"shell-quote":2,"zero-fill":9}],2:[function(require,module,exports){
var json = typeof JSON !== undefined ? JSON : require('jsonify');
var map = require('array-map');
var filter = require('array-filter');
var reduce = require('array-reduce');

exports.quote = function (xs) {
    return map(xs, function (s) {
        if (s && typeof s === 'object') {
            return s.op.replace(/(.)/g, '\\$1');
        }
        else if (/["\s]/.test(s) && !/'/.test(s)) {
            return "'" + s.replace(/(['\\])/g, '\\$1') + "'";
        }
        else if (/["'\s]/.test(s)) {
            return '"' + s.replace(/(["\\$`!])/g, '\\$1') + '"';
        }
        else {
            return String(s).replace(/([\\$`()!#&*|])/g, '\\$1');
        }
    }).join(' ');
};

var CONTROL = '(?:' + [
    '\\|\\|', '\\&\\&', ';;', '\\|\\&', '[&;()|<>]'
].join('|') + ')';
var META = '|&;()<> \\t';
var BAREWORD = '(\\\\[\'"' + META + ']|[^\\s\'"' + META + '])+';
var SINGLE_QUOTE = '"((\\\\"|[^"])*?)"';
var DOUBLE_QUOTE = '\'((\\\\\'|[^\'])*?)\'';

var TOKEN = '';
for (var i = 0; i < 4; i++) {
    TOKEN += (Math.pow(16,8)*Math.random()).toString(16);
}

exports.parse = function (s, env) {
    var mapped = parse(s, env);
    if (typeof env !== 'function') return mapped;
    return reduce(mapped, function (acc, s) {
        if (typeof s === 'object') return acc.concat(s);
        var xs = s.split(RegExp('(' + TOKEN + '.*?' + TOKEN + ')', 'g'));
        if (xs.length === 1) return acc.concat(xs[0]);
        return acc.concat(map(filter(xs, Boolean), function (x) {
            if (RegExp('^' + TOKEN).test(x)) {
                return json.parse(x.split(TOKEN)[1]);
            }
            else return x;
        }));
    }, []);
};

function parse (s, env) {
    var chunker = new RegExp([
        '(' + CONTROL + ')', // control chars
        '(' + BAREWORD + '|' + SINGLE_QUOTE + '|' + DOUBLE_QUOTE + ')*'
    ].join('|'), 'g');
    var match = filter(s.match(chunker), Boolean);
    
    if (!match) return [];
    if (!env) env = {};
    return map(match, function (s) {
        if (RegExp('^' + CONTROL + '$').test(s)) {
            return { op: s };
        }

        // Hand-written scanner/parser for Bash quoting rules:
        //
        //  1. inside single quotes, all characters are printed literally.
        //  2. inside double quotes, all characters are printed literally
        //     except variables prefixed by '$' and backslashes followed by
        //     either a double quote or another backslash.
        //  3. outside of any quotes, backslashes are treated as escape
        //     characters and not printed (unless they are themselves escaped)
        //  4. quote context can switch mid-token if there is no whitespace
        //     between the two quote contexts (e.g. all'one'"token" parses as
        //     "allonetoken")
        var SQ = "'";
        var DQ = '"';
        var BS = '\\';
        var DS = '$';
        var quote = false;
        var varname = false;
        var esc = false;
        var out = '';
        var isGlob = false;

        for (var i = 0, len = s.length; i < len; i++) {
            var c = s.charAt(i);
            isGlob = isGlob || (!quote && (c === '*' || c === '?'))
            if (esc) {
                out += c;
                esc = false;
            }
            else if (quote) {
                if (c === quote) {
                    quote = false;
                }
                else if (quote == SQ) {
                    out += c;
                }
                else { // Double quote
                    if (c === BS) {
                        i += 1;
                        c = s.charAt(i);
                        if (c === DQ || c === BS || c === DS) {
                            out += c;
                        } else {
                            out += BS + c;
                        }
                    }
                    else if (c === DS) {
                        out += parseEnvVar();
                    }
                    else {
                        out += c
                    }
                }
            }
            else if (c === DQ || c === SQ) {
                quote = c
            }
            else if (RegExp('^' + CONTROL + '$').test(c)) {
                return { op: s };
            }
            else if (c === BS) {
                esc = true
            }
            else if (c === DS) {
                out += parseEnvVar();
            }
            else out += c;
        }

        if (isGlob) return {op: 'glob', pattern: out};

        return out

        function parseEnvVar() {
            i += 1;
            var varend, varname;
            //debugger
            if (s.charAt(i) === '{') {
                i += 1
                if (s.charAt(i) === '}') {
                    throw new Error("Bad substitution: " + s.substr(i - 2, 3));
                }
                varend = s.indexOf('}', i);
                if (varend < 0) {
                    throw new Error("Bad substitution: " + s.substr(i));
                }
                varname = s.substr(i, varend - i);
                i = varend;
            }
            else if (/[*@#?$!_\-]/.test(s.charAt(i))) {
                varname = s.charAt(i);
                i += 1;
            }
            else {
                varend = s.substr(i).match(/[^\w\d_]/);
                if (!varend) {
                    varname = s.substr(i);
                    i = s.length;
                } else {
                    varname = s.substr(i, varend.index)
                    i += varend.index - 1;
                }
            }
            return getVar(null, '', varname);
        }
    });
    
    function getVar (_, pre, key) {
        var r = typeof env === 'function' ? env(key) : env[key];
        if (r === undefined) r = '';
        
        if (typeof r === 'object') {
            return pre + TOKEN + json.stringify(r) + TOKEN;
        }
        else return pre + r;
    }
};

},{"array-filter":3,"array-map":4,"array-reduce":5,"jsonify":6}],3:[function(require,module,exports){
/**
 * Array#filter.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @return {Array}
 */

module.exports = function (arr, fn) {
  if (arr.filter) return arr.filter(fn);
  var ret = [];
  for (var i = 0; i < arr.length; i++) {
    if (!hasOwn.call(arr, i)) continue;
    if (fn(arr[i], i, arr)) ret.push(arr[i]);
  }
  return ret;
};

var hasOwn = Object.prototype.hasOwnProperty;

},{}],4:[function(require,module,exports){
module.exports = function (xs, f) {
    if (xs.map) return xs.map(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        if (hasOwn.call(xs, i)) res.push(f(x, i, xs));
    }
    return res;
};

var hasOwn = Object.prototype.hasOwnProperty;

},{}],5:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;

module.exports = function (xs, f, acc) {
    var hasAcc = arguments.length >= 3;
    if (hasAcc && xs.reduce) return xs.reduce(f, acc);
    if (xs.reduce) return xs.reduce(f);
    
    for (var i = 0; i < xs.length; i++) {
        if (!hasOwn.call(xs, i)) continue;
        if (!hasAcc) {
            acc = xs[i];
            hasAcc = true;
            continue;
        }
        acc = f(acc, xs[i], i);
    }
    return acc;
};

},{}],6:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":7,"./lib/stringify":8}],7:[function(require,module,exports){
var at, // The index of the current character
    ch, // The current character
    escapee = {
        '"':  '"',
        '\\': '\\',
        '/':  '/',
        b:    '\b',
        f:    '\f',
        n:    '\n',
        r:    '\r',
        t:    '\t'
    },
    text,

    error = function (m) {
        // Call error when something is wrong.
        throw {
            name:    'SyntaxError',
            message: m,
            at:      at,
            text:    text
        };
    },
    
    next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        
        // Get the next character. When there are no more characters,
        // return the empty string.
        
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
    
    number = function () {
        // Parse a number value.
        var number,
            string = '';
        
        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        } else {
            return number;
        }
    },
    
    string = function () {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                } else if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error("Bad string");
    },

    white = function () {

// Skip whitespace.

        while (ch && ch <= ' ') {
            next();
        }
    },

    word = function () {

// true, false, or null.

        switch (ch) {
        case 't':
            next('t');
            next('r');
            next('u');
            next('e');
            return true;
        case 'f':
            next('f');
            next('a');
            next('l');
            next('s');
            next('e');
            return false;
        case 'n':
            next('n');
            next('u');
            next('l');
            next('l');
            return null;
        }
        error("Unexpected '" + ch + "'");
    },

    value,  // Place holder for the value function.

    array = function () {

// Parse an array value.

        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array;   // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error("Bad array");
    },

    object = function () {

// Parse an object value.

        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object;   // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error("Bad object");
    };

value = function () {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

    white();
    switch (ch) {
    case '{':
        return object();
    case '[':
        return array();
    case '"':
        return string();
    case '-':
        return number();
    default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
};

// Return the json_parse function. It will have access to all of the above
// functions and variables.

module.exports = function (source, reviver) {
    var result;
    
    text = source;
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
        error("Syntax error");
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }({'': result}, '')) : result;
};

},{}],8:[function(require,module,exports){
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    gap,
    indent,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    rep;

function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.
    
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    // Produce a string from holder[key].
    var i,          // The loop counter.
        k,          // The member key.
        v,          // The member value.
        length,
        mind = gap,
        partial,
        value = holder[key];
    
    // If the value has a toJSON method, call it to obtain a replacement value.
    if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }
    
    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.
    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }
    
    // What happens next depends on the value's type.
    switch (typeof value) {
        case 'string':
            return quote(value);
        
        case 'number':
            // JSON numbers must be finite. Encode non-finite numbers as null.
            return isFinite(value) ? String(value) : 'null';
        
        case 'boolean':
        case 'null':
            // If the value is a boolean or null, convert it to a string. Note:
            // typeof null does not produce 'null'. The case is included here in
            // the remote chance that this gets fixed someday.
            return String(value);
            
        case 'object':
            if (!value) return 'null';
            gap += indent;
            partial = [];
            
            // Array.isArray
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                
                // Join all of the elements together, separated with commas, and
                // wrap them in brackets.
                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            
            // If the replacer is an array, use it to select the members to be
            // stringified.
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else {
                // Otherwise, iterate through all of the keys in the object.
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            
        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v = partial.length === 0 ? '{}' : gap ?
            '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
}

module.exports = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    
    // If the space parameter is a number, make an indent string containing that
    // many spaces.
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    }
    // If the space parameter is a string, it will be used as the indent string.
    else if (typeof space === 'string') {
        indent = space;
    }

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.
    rep = replacer;
    if (replacer && typeof replacer !== 'function'
    && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    
    // Make a fake root object containing our value under the key of ''.
    // Return the result of stringifying the value.
    return str('', {'': value});
};

},{}],9:[function(require,module,exports){
/**
 * Given a number, return a zero-filled string.
 * From http://stackoverflow.com/questions/1267283/
 * @param  {number} width
 * @param  {number} number
 * @return {string}
 */
module.exports = function zeroFill (width, number, pad) {
  if (number === undefined) {
    return function (number, pad) {
      return zeroFill(width, number, pad)
    }
  }
  if (pad === undefined) pad = '0'
  width -= number.toString().length
  if (width > 0) return new Array(width + (/\./.test(number) ? 2 : 1)).join(pad) + number
  return number + ''
}

},{}],10:[function(require,module,exports){
exports.getit = function getit () {
  var spoof = require('spoof')
  return spoof.findInterfaces()
}

},{"spoof":1}],11:[function(require,module,exports){

},{}],12:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[10]);
