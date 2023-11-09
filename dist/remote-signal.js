(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Remote = factory());
})(this, (function () { 'use strict';

	function createCommonjsModule(fn) {
	  var module = { exports: {} };
		return fn(module, module.exports), module.exports;
	}

	var byteLength_1 = byteLength;
	var toByteArray_1 = toByteArray;
	var fromByteArray_1 = fromByteArray;

	var lookup = [];
	var revLookup = [];
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

	var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	for (var i = 0, len = code.length; i < len; ++i) {
	  lookup[i] = code[i];
	  revLookup[code.charCodeAt(i)] = i;
	}

	// Support decoding URL-safe base64 strings, as Node.js does.
	// See: https://en.wikipedia.org/wiki/Base64#URL_applications
	revLookup['-'.charCodeAt(0)] = 62;
	revLookup['_'.charCodeAt(0)] = 63;

	function getLens (b64) {
	  var len = b64.length;

	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // Trim off extra bytes after placeholder bytes are found
	  // See: https://github.com/beatgammit/base64-js/issues/42
	  var validLen = b64.indexOf('=');
	  if (validLen === -1) validLen = len;

	  var placeHoldersLen = validLen === len
	    ? 0
	    : 4 - (validLen % 4);

	  return [validLen, placeHoldersLen]
	}

	// base64 is 4/3 + up to two characters of the original data
	function byteLength (b64) {
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function _byteLength (b64, validLen, placeHoldersLen) {
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function toByteArray (b64) {
	  var tmp;
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];

	  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

	  var curByte = 0;

	  // if there are placeholders, only get up to the last complete 4 chars
	  var len = placeHoldersLen > 0
	    ? validLen - 4
	    : validLen;

	  var i;
	  for (i = 0; i < len; i += 4) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 18) |
	      (revLookup[b64.charCodeAt(i + 1)] << 12) |
	      (revLookup[b64.charCodeAt(i + 2)] << 6) |
	      revLookup[b64.charCodeAt(i + 3)];
	    arr[curByte++] = (tmp >> 16) & 0xFF;
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 2) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 2) |
	      (revLookup[b64.charCodeAt(i + 1)] >> 4);
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 1) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 10) |
	      (revLookup[b64.charCodeAt(i + 1)] << 4) |
	      (revLookup[b64.charCodeAt(i + 2)] >> 2);
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] +
	    lookup[num >> 12 & 0x3F] +
	    lookup[num >> 6 & 0x3F] +
	    lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp;
	  var output = [];
	  for (var i = start; i < end; i += 3) {
	    tmp =
	      ((uint8[i] << 16) & 0xFF0000) +
	      ((uint8[i + 1] << 8) & 0xFF00) +
	      (uint8[i + 2] & 0xFF);
	    output.push(tripletToBase64(tmp));
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp;
	  var len = uint8.length;
	  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
	  var parts = [];
	  var maxChunkLength = 16383; // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 2] +
	      lookup[(tmp << 4) & 0x3F] +
	      '=='
	    );
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 10] +
	      lookup[(tmp >> 4) & 0x3F] +
	      lookup[(tmp << 2) & 0x3F] +
	      '='
	    );
	  }

	  return parts.join('')
	}

	var base64Js = {
		byteLength: byteLength_1,
		toByteArray: toByteArray_1,
		fromByteArray: fromByteArray_1
	};

	/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
	var read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m;
	  var eLen = (nBytes * 8) - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var nBits = -7;
	  var i = isLE ? (nBytes - 1) : 0;
	  var d = isLE ? -1 : 1;
	  var s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	};

	var write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c;
	  var eLen = (nBytes * 8) - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
	  var i = isLE ? 0 : (nBytes - 1);
	  var d = isLE ? 1 : -1;
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = ((value * c) - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128;
	};

	var ieee754 = {
		read: read,
		write: write
	};

	/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <https://feross.org>
	 * @license  MIT
	 */

	var buffer = createCommonjsModule(function (module, exports) {



	const customInspectSymbol =
	  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
	    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
	    : null;

	exports.Buffer = Buffer;
	exports.SlowBuffer = SlowBuffer;
	exports.INSPECT_MAX_BYTES = 50;

	const K_MAX_LENGTH = 0x7fffffff;
	exports.kMaxLength = K_MAX_LENGTH;

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
	 *               implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * We report that the browser does not support typed arrays if the are not subclassable
	 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
	 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
	 * for __proto__ and has a buggy typed array implementation.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

	if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
	    typeof console.error === 'function') {
	  console.error(
	    'This browser lacks typed array (Uint8Array) support which is required by ' +
	    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
	  );
	}

	function typedArraySupport () {
	  // Can typed array instances can be augmented?
	  try {
	    const arr = new Uint8Array(1);
	    const proto = { foo: function () { return 42 } };
	    Object.setPrototypeOf(proto, Uint8Array.prototype);
	    Object.setPrototypeOf(arr, proto);
	    return arr.foo() === 42
	  } catch (e) {
	    return false
	  }
	}

	Object.defineProperty(Buffer.prototype, 'parent', {
	  enumerable: true,
	  get: function () {
	    if (!Buffer.isBuffer(this)) return undefined
	    return this.buffer
	  }
	});

	Object.defineProperty(Buffer.prototype, 'offset', {
	  enumerable: true,
	  get: function () {
	    if (!Buffer.isBuffer(this)) return undefined
	    return this.byteOffset
	  }
	});

	function createBuffer (length) {
	  if (length > K_MAX_LENGTH) {
	    throw new RangeError('The value "' + length + '" is invalid for option "size"')
	  }
	  // Return an augmented `Uint8Array` instance
	  const buf = new Uint8Array(length);
	  Object.setPrototypeOf(buf, Buffer.prototype);
	  return buf
	}

	/**
	 * The Buffer constructor returns instances of `Uint8Array` that have their
	 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
	 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
	 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
	 * returns a single octet.
	 *
	 * The `Uint8Array` prototype remains unmodified.
	 */

	function Buffer (arg, encodingOrOffset, length) {
	  // Common case.
	  if (typeof arg === 'number') {
	    if (typeof encodingOrOffset === 'string') {
	      throw new TypeError(
	        'The "string" argument must be of type string. Received type number'
	      )
	    }
	    return allocUnsafe(arg)
	  }
	  return from(arg, encodingOrOffset, length)
	}

	Buffer.poolSize = 8192; // not used by this implementation

	function from (value, encodingOrOffset, length) {
	  if (typeof value === 'string') {
	    return fromString(value, encodingOrOffset)
	  }

	  if (ArrayBuffer.isView(value)) {
	    return fromArrayView(value)
	  }

	  if (value == null) {
	    throw new TypeError(
	      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
	      'or Array-like Object. Received type ' + (typeof value)
	    )
	  }

	  if (isInstance(value, ArrayBuffer) ||
	      (value && isInstance(value.buffer, ArrayBuffer))) {
	    return fromArrayBuffer(value, encodingOrOffset, length)
	  }

	  if (typeof SharedArrayBuffer !== 'undefined' &&
	      (isInstance(value, SharedArrayBuffer) ||
	      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
	    return fromArrayBuffer(value, encodingOrOffset, length)
	  }

	  if (typeof value === 'number') {
	    throw new TypeError(
	      'The "value" argument must not be of type number. Received type number'
	    )
	  }

	  const valueOf = value.valueOf && value.valueOf();
	  if (valueOf != null && valueOf !== value) {
	    return Buffer.from(valueOf, encodingOrOffset, length)
	  }

	  const b = fromObject(value);
	  if (b) return b

	  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
	      typeof value[Symbol.toPrimitive] === 'function') {
	    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
	  }

	  throw new TypeError(
	    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
	    'or Array-like Object. Received type ' + (typeof value)
	  )
	}

	/**
	 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
	 * if value is a number.
	 * Buffer.from(str[, encoding])
	 * Buffer.from(array)
	 * Buffer.from(buffer)
	 * Buffer.from(arrayBuffer[, byteOffset[, length]])
	 **/
	Buffer.from = function (value, encodingOrOffset, length) {
	  return from(value, encodingOrOffset, length)
	};

	// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
	// https://github.com/feross/buffer/pull/148
	Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
	Object.setPrototypeOf(Buffer, Uint8Array);

	function assertSize (size) {
	  if (typeof size !== 'number') {
	    throw new TypeError('"size" argument must be of type number')
	  } else if (size < 0) {
	    throw new RangeError('The value "' + size + '" is invalid for option "size"')
	  }
	}

	function alloc (size, fill, encoding) {
	  assertSize(size);
	  if (size <= 0) {
	    return createBuffer(size)
	  }
	  if (fill !== undefined) {
	    // Only pay attention to encoding if it's a string. This
	    // prevents accidentally sending in a number that would
	    // be interpreted as a start offset.
	    return typeof encoding === 'string'
	      ? createBuffer(size).fill(fill, encoding)
	      : createBuffer(size).fill(fill)
	  }
	  return createBuffer(size)
	}

	/**
	 * Creates a new filled Buffer instance.
	 * alloc(size[, fill[, encoding]])
	 **/
	Buffer.alloc = function (size, fill, encoding) {
	  return alloc(size, fill, encoding)
	};

	function allocUnsafe (size) {
	  assertSize(size);
	  return createBuffer(size < 0 ? 0 : checked(size) | 0)
	}

	/**
	 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
	 * */
	Buffer.allocUnsafe = function (size) {
	  return allocUnsafe(size)
	};
	/**
	 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
	 */
	Buffer.allocUnsafeSlow = function (size) {
	  return allocUnsafe(size)
	};

	function fromString (string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') {
	    encoding = 'utf8';
	  }

	  if (!Buffer.isEncoding(encoding)) {
	    throw new TypeError('Unknown encoding: ' + encoding)
	  }

	  const length = byteLength(string, encoding) | 0;
	  let buf = createBuffer(length);

	  const actual = buf.write(string, encoding);

	  if (actual !== length) {
	    // Writing a hex string, for example, that contains invalid characters will
	    // cause everything after the first invalid character to be ignored. (e.g.
	    // 'abxxcd' will be treated as 'ab')
	    buf = buf.slice(0, actual);
	  }

	  return buf
	}

	function fromArrayLike (array) {
	  const length = array.length < 0 ? 0 : checked(array.length) | 0;
	  const buf = createBuffer(length);
	  for (let i = 0; i < length; i += 1) {
	    buf[i] = array[i] & 255;
	  }
	  return buf
	}

	function fromArrayView (arrayView) {
	  if (isInstance(arrayView, Uint8Array)) {
	    const copy = new Uint8Array(arrayView);
	    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
	  }
	  return fromArrayLike(arrayView)
	}

	function fromArrayBuffer (array, byteOffset, length) {
	  if (byteOffset < 0 || array.byteLength < byteOffset) {
	    throw new RangeError('"offset" is outside of buffer bounds')
	  }

	  if (array.byteLength < byteOffset + (length || 0)) {
	    throw new RangeError('"length" is outside of buffer bounds')
	  }

	  let buf;
	  if (byteOffset === undefined && length === undefined) {
	    buf = new Uint8Array(array);
	  } else if (length === undefined) {
	    buf = new Uint8Array(array, byteOffset);
	  } else {
	    buf = new Uint8Array(array, byteOffset, length);
	  }

	  // Return an augmented `Uint8Array` instance
	  Object.setPrototypeOf(buf, Buffer.prototype);

	  return buf
	}

	function fromObject (obj) {
	  if (Buffer.isBuffer(obj)) {
	    const len = checked(obj.length) | 0;
	    const buf = createBuffer(len);

	    if (buf.length === 0) {
	      return buf
	    }

	    obj.copy(buf, 0, 0, len);
	    return buf
	  }

	  if (obj.length !== undefined) {
	    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
	      return createBuffer(0)
	    }
	    return fromArrayLike(obj)
	  }

	  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
	    return fromArrayLike(obj.data)
	  }
	}

	function checked (length) {
	  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= K_MAX_LENGTH) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (length) {
	  if (+length != length) { // eslint-disable-line eqeqeq
	    length = 0;
	  }
	  return Buffer.alloc(+length)
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return b != null && b._isBuffer === true &&
	    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
	};

	Buffer.compare = function compare (a, b) {
	  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
	  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError(
	      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
	    )
	  }

	  if (a === b) return 0

	  let x = a.length;
	  let y = b.length;

	  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
	    if (a[i] !== b[i]) {
	      x = a[i];
	      y = b[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'latin1':
	    case 'binary':
	    case 'base64':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	};

	Buffer.concat = function concat (list, length) {
	  if (!Array.isArray(list)) {
	    throw new TypeError('"list" argument must be an Array of Buffers')
	  }

	  if (list.length === 0) {
	    return Buffer.alloc(0)
	  }

	  let i;
	  if (length === undefined) {
	    length = 0;
	    for (i = 0; i < list.length; ++i) {
	      length += list[i].length;
	    }
	  }

	  const buffer = Buffer.allocUnsafe(length);
	  let pos = 0;
	  for (i = 0; i < list.length; ++i) {
	    let buf = list[i];
	    if (isInstance(buf, Uint8Array)) {
	      if (pos + buf.length > buffer.length) {
	        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
	        buf.copy(buffer, pos);
	      } else {
	        Uint8Array.prototype.set.call(
	          buffer,
	          buf,
	          pos
	        );
	      }
	    } else if (!Buffer.isBuffer(buf)) {
	      throw new TypeError('"list" argument must be an Array of Buffers')
	    } else {
	      buf.copy(buffer, pos);
	    }
	    pos += buf.length;
	  }
	  return buffer
	};

	function byteLength (string, encoding) {
	  if (Buffer.isBuffer(string)) {
	    return string.length
	  }
	  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
	    return string.byteLength
	  }
	  if (typeof string !== 'string') {
	    throw new TypeError(
	      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
	      'Received type ' + typeof string
	    )
	  }

	  const len = string.length;
	  const mustMatch = (arguments.length > 2 && arguments[2] === true);
	  if (!mustMatch && len === 0) return 0

	  // Use a for loop to avoid recursion
	  let loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) {
	          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
	        }
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	}
	Buffer.byteLength = byteLength;

	function slowToString (encoding, start, end) {
	  let loweredCase = false;

	  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
	  // property of a typed array.

	  // This behaves neither like String nor Uint8Array in that we set start/end
	  // to their upper/lower bounds if the value passed is out of range.
	  // undefined is handled specially as per ECMA-262 6th Edition,
	  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
	  if (start === undefined || start < 0) {
	    start = 0;
	  }
	  // Return early if start > this.length. Done here to prevent potential uint32
	  // coercion fail below.
	  if (start > this.length) {
	    return ''
	  }

	  if (end === undefined || end > this.length) {
	    end = this.length;
	  }

	  if (end <= 0) {
	    return ''
	  }

	  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
	  end >>>= 0;
	  start >>>= 0;

	  if (end <= start) {
	    return ''
	  }

	  if (!encoding) encoding = 'utf8';

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'latin1':
	      case 'binary':
	        return latin1Slice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase();
	        loweredCase = true;
	    }
	  }
	}

	// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
	// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
	// reliably in a browserify context because there could be multiple different
	// copies of the 'buffer' package in use. This method works even for Buffer
	// instances that were created from another copy of the `buffer` package.
	// See: https://github.com/feross/buffer/issues/154
	Buffer.prototype._isBuffer = true;

	function swap (b, n, m) {
	  const i = b[n];
	  b[n] = b[m];
	  b[m] = i;
	}

	Buffer.prototype.swap16 = function swap16 () {
	  const len = this.length;
	  if (len % 2 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 16-bits')
	  }
	  for (let i = 0; i < len; i += 2) {
	    swap(this, i, i + 1);
	  }
	  return this
	};

	Buffer.prototype.swap32 = function swap32 () {
	  const len = this.length;
	  if (len % 4 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 32-bits')
	  }
	  for (let i = 0; i < len; i += 4) {
	    swap(this, i, i + 3);
	    swap(this, i + 1, i + 2);
	  }
	  return this
	};

	Buffer.prototype.swap64 = function swap64 () {
	  const len = this.length;
	  if (len % 8 !== 0) {
	    throw new RangeError('Buffer size must be a multiple of 64-bits')
	  }
	  for (let i = 0; i < len; i += 8) {
	    swap(this, i, i + 7);
	    swap(this, i + 1, i + 6);
	    swap(this, i + 2, i + 5);
	    swap(this, i + 3, i + 4);
	  }
	  return this
	};

	Buffer.prototype.toString = function toString () {
	  const length = this.length;
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	};

	Buffer.prototype.toLocaleString = Buffer.prototype.toString;

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	};

	Buffer.prototype.inspect = function inspect () {
	  let str = '';
	  const max = exports.INSPECT_MAX_BYTES;
	  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
	  if (this.length > max) str += ' ... ';
	  return '<Buffer ' + str + '>'
	};
	if (customInspectSymbol) {
	  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
	}

	Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
	  if (isInstance(target, Uint8Array)) {
	    target = Buffer.from(target, target.offset, target.byteLength);
	  }
	  if (!Buffer.isBuffer(target)) {
	    throw new TypeError(
	      'The "target" argument must be one of type Buffer or Uint8Array. ' +
	      'Received type ' + (typeof target)
	    )
	  }

	  if (start === undefined) {
	    start = 0;
	  }
	  if (end === undefined) {
	    end = target ? target.length : 0;
	  }
	  if (thisStart === undefined) {
	    thisStart = 0;
	  }
	  if (thisEnd === undefined) {
	    thisEnd = this.length;
	  }

	  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
	    throw new RangeError('out of range index')
	  }

	  if (thisStart >= thisEnd && start >= end) {
	    return 0
	  }
	  if (thisStart >= thisEnd) {
	    return -1
	  }
	  if (start >= end) {
	    return 1
	  }

	  start >>>= 0;
	  end >>>= 0;
	  thisStart >>>= 0;
	  thisEnd >>>= 0;

	  if (this === target) return 0

	  let x = thisEnd - thisStart;
	  let y = end - start;
	  const len = Math.min(x, y);

	  const thisCopy = this.slice(thisStart, thisEnd);
	  const targetCopy = target.slice(start, end);

	  for (let i = 0; i < len; ++i) {
	    if (thisCopy[i] !== targetCopy[i]) {
	      x = thisCopy[i];
	      y = targetCopy[i];
	      break
	    }
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	};

	// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
	// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
	//
	// Arguments:
	// - buffer - a Buffer to search
	// - val - a string, Buffer, or number
	// - byteOffset - an index into `buffer`; will be clamped to an int32
	// - encoding - an optional encoding, relevant is val is a string
	// - dir - true for indexOf, false for lastIndexOf
	function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
	  // Empty buffer means no match
	  if (buffer.length === 0) return -1

	  // Normalize byteOffset
	  if (typeof byteOffset === 'string') {
	    encoding = byteOffset;
	    byteOffset = 0;
	  } else if (byteOffset > 0x7fffffff) {
	    byteOffset = 0x7fffffff;
	  } else if (byteOffset < -0x80000000) {
	    byteOffset = -0x80000000;
	  }
	  byteOffset = +byteOffset; // Coerce to Number.
	  if (numberIsNaN(byteOffset)) {
	    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
	    byteOffset = dir ? 0 : (buffer.length - 1);
	  }

	  // Normalize byteOffset: negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
	  if (byteOffset >= buffer.length) {
	    if (dir) return -1
	    else byteOffset = buffer.length - 1;
	  } else if (byteOffset < 0) {
	    if (dir) byteOffset = 0;
	    else return -1
	  }

	  // Normalize val
	  if (typeof val === 'string') {
	    val = Buffer.from(val, encoding);
	  }

	  // Finally, search either indexOf (if dir is true) or lastIndexOf
	  if (Buffer.isBuffer(val)) {
	    // Special case: looking for empty string/buffer always fails
	    if (val.length === 0) {
	      return -1
	    }
	    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
	  } else if (typeof val === 'number') {
	    val = val & 0xFF; // Search for a byte value [0-255]
	    if (typeof Uint8Array.prototype.indexOf === 'function') {
	      if (dir) {
	        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
	      } else {
	        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
	      }
	    }
	    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
	  let indexSize = 1;
	  let arrLength = arr.length;
	  let valLength = val.length;

	  if (encoding !== undefined) {
	    encoding = String(encoding).toLowerCase();
	    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
	        encoding === 'utf16le' || encoding === 'utf-16le') {
	      if (arr.length < 2 || val.length < 2) {
	        return -1
	      }
	      indexSize = 2;
	      arrLength /= 2;
	      valLength /= 2;
	      byteOffset /= 2;
	    }
	  }

	  function read (buf, i) {
	    if (indexSize === 1) {
	      return buf[i]
	    } else {
	      return buf.readUInt16BE(i * indexSize)
	    }
	  }

	  let i;
	  if (dir) {
	    let foundIndex = -1;
	    for (i = byteOffset; i < arrLength; i++) {
	      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
	        if (foundIndex === -1) foundIndex = i;
	        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
	      } else {
	        if (foundIndex !== -1) i -= i - foundIndex;
	        foundIndex = -1;
	      }
	    }
	  } else {
	    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
	    for (i = byteOffset; i >= 0; i--) {
	      let found = true;
	      for (let j = 0; j < valLength; j++) {
	        if (read(arr, i + j) !== read(val, j)) {
	          found = false;
	          break
	        }
	      }
	      if (found) return i
	    }
	  }

	  return -1
	}

	Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
	  return this.indexOf(val, byteOffset, encoding) !== -1
	};

	Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
	};

	Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
	  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
	};

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0;
	  const remaining = buf.length - offset;
	  if (!length) {
	    length = remaining;
	  } else {
	    length = Number(length);
	    if (length > remaining) {
	      length = remaining;
	    }
	  }

	  const strLen = string.length;

	  if (length > strLen / 2) {
	    length = strLen / 2;
	  }
	  let i;
	  for (i = 0; i < length; ++i) {
	    const parsed = parseInt(string.substr(i * 2, 2), 16);
	    if (numberIsNaN(parsed)) return i
	    buf[offset + i] = parsed;
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8';
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset;
	    length = this.length;
	    offset = 0;
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset >>> 0;
	    if (isFinite(length)) {
	      length = length >>> 0;
	      if (encoding === undefined) encoding = 'utf8';
	    } else {
	      encoding = length;
	      length = undefined;
	    }
	  } else {
	    throw new Error(
	      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
	    )
	  }

	  const remaining = this.length - offset;
	  if (length === undefined || length > remaining) length = remaining;

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('Attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8';

	  let loweredCase = false;
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	      case 'latin1':
	      case 'binary':
	        return asciiWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase();
	        loweredCase = true;
	    }
	  }
	};

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	};

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64Js.fromByteArray(buf)
	  } else {
	    return base64Js.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end);
	  const res = [];

	  let i = start;
	  while (i < end) {
	    const firstByte = buf[i];
	    let codePoint = null;
	    let bytesPerSequence = (firstByte > 0xEF)
	      ? 4
	      : (firstByte > 0xDF)
	          ? 3
	          : (firstByte > 0xBF)
	              ? 2
	              : 1;

	    if (i + bytesPerSequence <= end) {
	      let secondByte, thirdByte, fourthByte, tempCodePoint;

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte;
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1];
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint;
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1];
	          thirdByte = buf[i + 2];
	          fourthByte = buf[i + 3];
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint;
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD;
	      bytesPerSequence = 1;
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000;
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
	      codePoint = 0xDC00 | codePoint & 0x3FF;
	    }

	    res.push(codePoint);
	    i += bytesPerSequence;
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	const MAX_ARGUMENTS_LENGTH = 0x1000;

	function decodeCodePointsArray (codePoints) {
	  const len = codePoints.length;
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  let res = '';
	  let i = 0;
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    );
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  let ret = '';
	  end = Math.min(buf.length, end);

	  for (let i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i] & 0x7F);
	  }
	  return ret
	}

	function latin1Slice (buf, start, end) {
	  let ret = '';
	  end = Math.min(buf.length, end);

	  for (let i = start; i < end; ++i) {
	    ret += String.fromCharCode(buf[i]);
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  const len = buf.length;

	  if (!start || start < 0) start = 0;
	  if (!end || end < 0 || end > len) end = len;

	  let out = '';
	  for (let i = start; i < end; ++i) {
	    out += hexSliceLookupTable[buf[i]];
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  const bytes = buf.slice(start, end);
	  let res = '';
	  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
	  for (let i = 0; i < bytes.length - 1; i += 2) {
	    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  const len = this.length;
	  start = ~~start;
	  end = end === undefined ? len : ~~end;

	  if (start < 0) {
	    start += len;
	    if (start < 0) start = 0;
	  } else if (start > len) {
	    start = len;
	  }

	  if (end < 0) {
	    end += len;
	    if (end < 0) end = 0;
	  } else if (end > len) {
	    end = len;
	  }

	  if (end < start) end = start;

	  const newBuf = this.subarray(start, end);
	  // Return an augmented `Uint8Array` instance
	  Object.setPrototypeOf(newBuf, Buffer.prototype);

	  return newBuf
	};

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUintLE =
	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let val = this[offset];
	  let mul = 1;
	  let i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUintBE =
	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length);
	  }

	  let val = this[offset + --byteLength];
	  let mul = 1;
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul;
	  }

	  return val
	};

	Buffer.prototype.readUint8 =
	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  return this[offset]
	};

	Buffer.prototype.readUint16LE =
	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return this[offset] | (this[offset + 1] << 8)
	};

	Buffer.prototype.readUint16BE =
	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  return (this[offset] << 8) | this[offset + 1]
	};

	Buffer.prototype.readUint32LE =
	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	};

	Buffer.prototype.readUint32BE =
	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	};

	Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const lo = first +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 24;

	  const hi = this[++offset] +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    last * 2 ** 24;

	  return BigInt(lo) + (BigInt(hi) << BigInt(32))
	});

	Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const hi = first * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    this[++offset];

	  const lo = this[++offset] * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    last;

	  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
	});

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let val = this[offset];
	  let mul = 1;
	  let i = 0;
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) checkOffset(offset, byteLength, this.length);

	  let i = byteLength;
	  let mul = 1;
	  let val = this[offset + --i];
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul;
	  }
	  mul *= 0x80;

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

	  return val
	};

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 1, this.length);
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	};

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  const val = this[offset] | (this[offset + 1] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 2, this.length);
	  const val = this[offset + 1] | (this[offset] << 8);
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	};

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	};

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	};

	Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const val = this[offset + 4] +
	    this[offset + 5] * 2 ** 8 +
	    this[offset + 6] * 2 ** 16 +
	    (last << 24); // Overflow

	  return (BigInt(val) << BigInt(32)) +
	    BigInt(first +
	    this[++offset] * 2 ** 8 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 24)
	});

	Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
	  offset = offset >>> 0;
	  validateNumber(offset, 'offset');
	  const first = this[offset];
	  const last = this[offset + 7];
	  if (first === undefined || last === undefined) {
	    boundsError(offset, this.length - 8);
	  }

	  const val = (first << 24) + // Overflow
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    this[++offset];

	  return (BigInt(val) << BigInt(32)) +
	    BigInt(this[++offset] * 2 ** 24 +
	    this[++offset] * 2 ** 16 +
	    this[++offset] * 2 ** 8 +
	    last)
	});

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return ieee754.read(this, offset, true, 23, 4)
	};

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 4, this.length);
	  return ieee754.read(this, offset, false, 23, 4)
	};

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return ieee754.read(this, offset, true, 52, 8)
	};

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  offset = offset >>> 0;
	  if (!noAssert) checkOffset(offset, 8, this.length);
	  return ieee754.read(this, offset, false, 52, 8)
	};

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	}

	Buffer.prototype.writeUintLE =
	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  let mul = 1;
	  let i = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUintBE =
	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  byteLength = byteLength >>> 0;
	  if (!noAssert) {
	    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
	    checkInt(this, value, offset, byteLength, maxBytes, 0);
	  }

	  let i = byteLength - 1;
	  let mul = 1;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeUint8 =
	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeUint16LE =
	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  return offset + 2
	};

	Buffer.prototype.writeUint16BE =
	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
	  this[offset] = (value >>> 8);
	  this[offset + 1] = (value & 0xff);
	  return offset + 2
	};

	Buffer.prototype.writeUint32LE =
	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  this[offset + 3] = (value >>> 24);
	  this[offset + 2] = (value >>> 16);
	  this[offset + 1] = (value >>> 8);
	  this[offset] = (value & 0xff);
	  return offset + 4
	};

	Buffer.prototype.writeUint32BE =
	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
	  this[offset] = (value >>> 24);
	  this[offset + 1] = (value >>> 16);
	  this[offset + 2] = (value >>> 8);
	  this[offset + 3] = (value & 0xff);
	  return offset + 4
	};

	function wrtBigUInt64LE (buf, value, offset, min, max) {
	  checkIntBI(value, min, max, buf, offset, 7);

	  let lo = Number(value & BigInt(0xffffffff));
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  lo = lo >> 8;
	  buf[offset++] = lo;
	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  hi = hi >> 8;
	  buf[offset++] = hi;
	  return offset
	}

	function wrtBigUInt64BE (buf, value, offset, min, max) {
	  checkIntBI(value, min, max, buf, offset, 7);

	  let lo = Number(value & BigInt(0xffffffff));
	  buf[offset + 7] = lo;
	  lo = lo >> 8;
	  buf[offset + 6] = lo;
	  lo = lo >> 8;
	  buf[offset + 5] = lo;
	  lo = lo >> 8;
	  buf[offset + 4] = lo;
	  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
	  buf[offset + 3] = hi;
	  hi = hi >> 8;
	  buf[offset + 2] = hi;
	  hi = hi >> 8;
	  buf[offset + 1] = hi;
	  hi = hi >> 8;
	  buf[offset] = hi;
	  return offset + 8
	}

	Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
	  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
	});

	Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
	  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
	});

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    const limit = Math.pow(2, (8 * byteLength) - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  let i = 0;
	  let mul = 1;
	  let sub = 0;
	  this[offset] = value & 0xFF;
	  while (++i < byteLength && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    const limit = Math.pow(2, (8 * byteLength) - 1);

	    checkInt(this, value, offset, byteLength, limit - 1, -limit);
	  }

	  let i = byteLength - 1;
	  let mul = 1;
	  let sub = 0;
	  this[offset + i] = value & 0xFF;
	  while (--i >= 0 && (mul *= 0x100)) {
	    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
	      sub = 1;
	    }
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
	  }

	  return offset + byteLength
	};

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
	  if (value < 0) value = 0xff + value + 1;
	  this[offset] = (value & 0xff);
	  return offset + 1
	};

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  return offset + 2
	};

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
	  this[offset] = (value >>> 8);
	  this[offset + 1] = (value & 0xff);
	  return offset + 2
	};

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  this[offset] = (value & 0xff);
	  this[offset + 1] = (value >>> 8);
	  this[offset + 2] = (value >>> 16);
	  this[offset + 3] = (value >>> 24);
	  return offset + 4
	};

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
	  if (value < 0) value = 0xffffffff + value + 1;
	  this[offset] = (value >>> 24);
	  this[offset + 1] = (value >>> 16);
	  this[offset + 2] = (value >>> 8);
	  this[offset + 3] = (value & 0xff);
	  return offset + 4
	};

	Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
	  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
	});

	Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
	  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
	});

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (offset + ext > buf.length) throw new RangeError('Index out of range')
	  if (offset < 0) throw new RangeError('Index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4);
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4);
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	};

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  value = +value;
	  offset = offset >>> 0;
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8);
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8);
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	};

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	};

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
	  if (!start) start = 0;
	  if (!end && end !== 0) end = this.length;
	  if (targetStart >= target.length) targetStart = target.length;
	  if (!targetStart) targetStart = 0;
	  if (end > 0 && end < start) end = start;

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length;
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start;
	  }

	  const len = end - start;

	  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
	    // Use built-in when available, missing from IE11
	    this.copyWithin(targetStart, start, end);
	  } else {
	    Uint8Array.prototype.set.call(
	      target,
	      this.subarray(start, end),
	      targetStart
	    );
	  }

	  return len
	};

	// Usage:
	//    buffer.fill(number[, offset[, end]])
	//    buffer.fill(buffer[, offset[, end]])
	//    buffer.fill(string[, offset[, end]][, encoding])
	Buffer.prototype.fill = function fill (val, start, end, encoding) {
	  // Handle string cases:
	  if (typeof val === 'string') {
	    if (typeof start === 'string') {
	      encoding = start;
	      start = 0;
	      end = this.length;
	    } else if (typeof end === 'string') {
	      encoding = end;
	      end = this.length;
	    }
	    if (encoding !== undefined && typeof encoding !== 'string') {
	      throw new TypeError('encoding must be a string')
	    }
	    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
	      throw new TypeError('Unknown encoding: ' + encoding)
	    }
	    if (val.length === 1) {
	      const code = val.charCodeAt(0);
	      if ((encoding === 'utf8' && code < 128) ||
	          encoding === 'latin1') {
	        // Fast path: If `val` fits into a single byte, use that numeric value.
	        val = code;
	      }
	    }
	  } else if (typeof val === 'number') {
	    val = val & 255;
	  } else if (typeof val === 'boolean') {
	    val = Number(val);
	  }

	  // Invalid ranges are not set to a default, so can range check early.
	  if (start < 0 || this.length < start || this.length < end) {
	    throw new RangeError('Out of range index')
	  }

	  if (end <= start) {
	    return this
	  }

	  start = start >>> 0;
	  end = end === undefined ? this.length : end >>> 0;

	  if (!val) val = 0;

	  let i;
	  if (typeof val === 'number') {
	    for (i = start; i < end; ++i) {
	      this[i] = val;
	    }
	  } else {
	    const bytes = Buffer.isBuffer(val)
	      ? val
	      : Buffer.from(val, encoding);
	    const len = bytes.length;
	    if (len === 0) {
	      throw new TypeError('The value "' + val +
	        '" is invalid for argument "value"')
	    }
	    for (i = 0; i < end - start; ++i) {
	      this[i + start] = bytes[i % len];
	    }
	  }

	  return this
	};

	// CUSTOM ERRORS
	// =============

	// Simplified versions from Node, changed for Buffer-only usage
	const errors = {};
	function E (sym, getMessage, Base) {
	  errors[sym] = class NodeError extends Base {
	    constructor () {
	      super();

	      Object.defineProperty(this, 'message', {
	        value: getMessage.apply(this, arguments),
	        writable: true,
	        configurable: true
	      });

	      // Add the error code to the name to include it in the stack trace.
	      this.name = `${this.name} [${sym}]`;
	      // Access the stack to generate the error message including the error code
	      // from the name.
	      this.stack; // eslint-disable-line no-unused-expressions
	      // Reset the name to the actual name.
	      delete this.name;
	    }

	    get code () {
	      return sym
	    }

	    set code (value) {
	      Object.defineProperty(this, 'code', {
	        configurable: true,
	        enumerable: true,
	        value,
	        writable: true
	      });
	    }

	    toString () {
	      return `${this.name} [${sym}]: ${this.message}`
	    }
	  };
	}

	E('ERR_BUFFER_OUT_OF_BOUNDS',
	  function (name) {
	    if (name) {
	      return `${name} is outside of buffer bounds`
	    }

	    return 'Attempt to access memory outside buffer bounds'
	  }, RangeError);
	E('ERR_INVALID_ARG_TYPE',
	  function (name, actual) {
	    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
	  }, TypeError);
	E('ERR_OUT_OF_RANGE',
	  function (str, range, input) {
	    let msg = `The value of "${str}" is out of range.`;
	    let received = input;
	    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
	      received = addNumericalSeparator(String(input));
	    } else if (typeof input === 'bigint') {
	      received = String(input);
	      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
	        received = addNumericalSeparator(received);
	      }
	      received += 'n';
	    }
	    msg += ` It must be ${range}. Received ${received}`;
	    return msg
	  }, RangeError);

	function addNumericalSeparator (val) {
	  let res = '';
	  let i = val.length;
	  const start = val[0] === '-' ? 1 : 0;
	  for (; i >= start + 4; i -= 3) {
	    res = `_${val.slice(i - 3, i)}${res}`;
	  }
	  return `${val.slice(0, i)}${res}`
	}

	// CHECK FUNCTIONS
	// ===============

	function checkBounds (buf, offset, byteLength) {
	  validateNumber(offset, 'offset');
	  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
	    boundsError(offset, buf.length - (byteLength + 1));
	  }
	}

	function checkIntBI (value, min, max, buf, offset, byteLength) {
	  if (value > max || value < min) {
	    const n = typeof min === 'bigint' ? 'n' : '';
	    let range;
	    if (byteLength > 3) {
	      if (min === 0 || min === BigInt(0)) {
	        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
	      } else {
	        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
	                `${(byteLength + 1) * 8 - 1}${n}`;
	      }
	    } else {
	      range = `>= ${min}${n} and <= ${max}${n}`;
	    }
	    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
	  }
	  checkBounds(buf, offset, byteLength);
	}

	function validateNumber (value, name) {
	  if (typeof value !== 'number') {
	    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
	  }
	}

	function boundsError (value, length, type) {
	  if (Math.floor(value) !== value) {
	    validateNumber(value, type);
	    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
	  }

	  if (length < 0) {
	    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
	  }

	  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
	                                    `>= ${type ? 1 : 0} and <= ${length}`,
	                                    value)
	}

	// HELPER FUNCTIONS
	// ================

	const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

	function base64clean (str) {
	  // Node takes equal signs as end of the Base64 encoding
	  str = str.split('=')[0];
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = str.trim().replace(INVALID_BASE64_RE, '');
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '=';
	  }
	  return str
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity;
	  let codePoint;
	  const length = string.length;
	  let leadSurrogate = null;
	  const bytes = [];

	  for (let i = 0; i < length; ++i) {
	    codePoint = string.charCodeAt(i);

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint;

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	        leadSurrogate = codePoint;
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
	    }

	    leadSurrogate = null;

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint);
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      );
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  const byteArray = [];
	  for (let i = 0; i < str.length; ++i) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF);
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  let c, hi, lo;
	  const byteArray = [];
	  for (let i = 0; i < str.length; ++i) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i);
	    hi = c >> 8;
	    lo = c % 256;
	    byteArray.push(lo);
	    byteArray.push(hi);
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64Js.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  let i;
	  for (i = 0; i < length; ++i) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i];
	  }
	  return i
	}

	// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
	// the `instanceof` check but they should be treated as of that type.
	// See: https://github.com/feross/buffer/issues/166
	function isInstance (obj, type) {
	  return obj instanceof type ||
	    (obj != null && obj.constructor != null && obj.constructor.name != null &&
	      obj.constructor.name === type.name)
	}
	function numberIsNaN (obj) {
	  // For IE11 support
	  return obj !== obj // eslint-disable-line no-self-compare
	}

	// Create lookup table for `toString('hex')`
	// See: https://github.com/feross/buffer/issues/219
	const hexSliceLookupTable = (function () {
	  const alphabet = '0123456789abcdef';
	  const table = new Array(256);
	  for (let i = 0; i < 16; ++i) {
	    const i16 = i * 16;
	    for (let j = 0; j < 16; ++j) {
	      table[i16 + j] = alphabet[i] + alphabet[j];
	    }
	  }
	  return table
	})();

	// Return not function with Error if BigInt not supported
	function defineBigIntMethod (fn) {
	  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
	}

	function BufferBigIntNotDefined () {
	  throw new Error('BigInt not supported')
	}
	});

	const encoder$1 = new TextEncoder();
	const decoder$1 = new TextDecoder();


	const NB = numberBuffer;
	function numberBuffer(type, initValue = 0) {
	  let buffer$1;
	  if (type === undefined || typeof type !== 'string' || typeof initValue !== 'number') {
	    throw TypeError('invlaid init variablie type name. ')
	  }
	  type = type.toUpperCase();

	  if (type.includes('8')) {
	    buffer$1 = buffer.Buffer.alloc(1);
	    if (type.includes('I')) buffer$1.writeInt8(initValue);
	    else buffer$1.writeUint8(initValue);
	  } else if (type.includes('16')) {
	    buffer$1 = buffer.Buffer.alloc(2);
	    if (type.includes('I')) {
	      if (type.includes('L')) buffer$1.writeInt16LE(initValue);
	      else buffer$1.writeInt16BE(initValue);
	    } else {
	      if (type.includes('L')) buffer$1.writeUint16LE(initValue);
	      else buffer$1.writeUint16BE(initValue);
	    }
	  } else if (type.includes('32')) {
	    buffer$1 = buffer.Buffer.alloc(4);
	    if (type.includes('I')) {
	      if (type.includes('L')) buffer$1.writeInt32LE(initValue);
	      else buffer$1.writeInt32BE(initValue);
	    } else {
	      if (type.includes('L')) buffer$1.writeUint32LE(initValue);
	      else buffer$1.writeUint32BE(initValue);
	    }
	  } else if (type.includes('F')) {
	    buffer$1 = buffer.Buffer.alloc(4);
	    if (type.includes('L')) {
	      buffer$1.writeFloatLE(initValue);
	    } else {
	      buffer$1.writeFloatBE(initValue);
	    }
	  } else if (type.includes('N')) { // number as string
	    buffer$1 = buffer.Buffer.from(String(initValue));
	  } else {
	    console.log(`invalid type: ${type} or initvalue: ${initValue}`);
	  }
	  return buffer$1
	}


	const MB$1 = metaBuffer;
	function metaBuffer(name, typeOrData, initValue) {
	  let buffer$1;
	  let bufferType = 'B';
	  if (typeof typeOrData === 'number') {
	    if (typeof initValue === 'number') {  // initValue 0 should be passed.
	      buffer$1 = buffer.Buffer.alloc(typeOrData);
	      if( initValue !== 0) buffer$1.fill(initValue);
	      bufferType = 'B';
	    } else {
	      buffer$1 = buffer.Buffer.from(String(typeOrData));
	      bufferType = 'N';
	    }
	  } else if (typeof typeOrData === 'string' && typeof initValue === 'number') { // number with type.
	    bufferType = typeOrData.toUpperCase(); // use explicit type name
	    buffer$1 = numberBuffer(typeOrData, initValue); // notice.  two categories.  n: number string.  8, 16, 32: typed number.
	  } else if (typeof typeOrData === 'string' && initValue === undefined) { //  string buffer
	    buffer$1 = buffer.Buffer.from(typeOrData);
	    bufferType = 'S';
	  } else if (typeOrData instanceof Uint8Array && initValue === undefined) { // buffer | Uint8Array
	    // Buffer.from:  Copies the passed buffer data onto a new Buffer instance.
	    // typecasting Uint8Array to Buffer.
	    buffer$1 = (typeOrData instanceof buffer.Buffer) ? typeOrData : buffer.Buffer.from(typeOrData);
	  } else if (typeOrData instanceof ArrayBuffer && initValue === undefined) { // arrayBuffer
	    // Notice. typedArray is recommended instead of arrayBuffer
	    buffer$1 = buffer.Buffer.from(typeOrData);
	  } else if (ArrayBuffer.isView(typeOrData)) { // typedarray buffer
	    buffer$1 = buffer.Buffer.from(typeOrData.buffer, typeOrData.byteOffset, typeOrData.byteLength);
	  } else if (typeof typeOrData === 'object' && initValue === undefined) { //   object. like array. stringify
	    buffer$1 = buffer.Buffer.from(JSON.stringify(typeOrData));
	    bufferType = 'O';
	  } else if (typeof typeOrData === 'boolean' && initValue === undefined) { //   object. like array. stringify
	    const v = typeOrData ? 1 : 0;
	    buffer$1 = buffer.Buffer.from([v]);
	    bufferType = '!';
	  } else {
	    throw TypeError('invalid meta buffer type')
	  }

	  if (typeof name === 'string' && name.includes('#')) name = ''; //

	  return [name, bufferType, buffer$1]
	}

	const MBA = metaBufferArguments;
	function metaBufferArguments(...args) {
	  let i = 0;
	  const mba = args.map(
	    data => {
	      const argsIndex = i++;
	      // tip. MBA use index number as metabuffer's property name.
	      if (typeof data === 'number') {
	        // * JS's primitive Number stored as string.
	        return MB$1(argsIndex, 'N', data)
	      } else {
	        // typedarray, dataview, array, object, boolean
	        return MB$1(argsIndex, data)
	      }
	    });

	  return mba
	}

	function parseTypeName(type) {
	  type = type.toUpperCase();

	  if (type.includes('8')) {
	    if (type.includes('I')) {
	      return 'int8'
	    } else {
	      return 'uint8'
	    }
	  } else if (type.includes('16')) {
	    if (type.includes('I')) {
	      if (type.includes('L')) {
	        return 'int16_le'
	      } else {
	        return 'int16_be'
	      }
	    } else {
	      if (type.includes('L')) {
	        return 'uint16_le'
	      } else {
	        return 'uint16_be'
	      }
	    }
	  } else if (type.includes('32')) {
	    if (type.includes('I')) {
	      if (type.includes('L')) {
	        return 'int32_le'
	      } else {
	        return 'int32_be'
	      }
	    } else {
	      if (type.includes('L')) {
	        return 'uint32_le'
	      } else {
	        return 'uint32_be'
	      }
	    }
	  } else if (type.includes('F')) {
	    if (type.includes('L')) {
	      return 'float_le'
	    } else {
	      return 'float_be'
	    }
	  } else if (type === 'B') {
	    return 'buffer'
	  } else if (type === 'S') { // string or arguments
	    return 'string'
	  } else if (type === 'N') { // number encoded as string
	    return 'number'
	  } else if (type === 'O') { // object encoded string
	    return 'object'
	  } else if (type === '!') { // boolean  1:true 0:false
	    return 'boolean'
	  } else {
	    throw TypeError('invalid data type')
	  }

	}

	function readTypedBuffer(simpleType, buffer, offset, length) {

	  const type = parseTypeName(simpleType);

	  if (type == 'int8') return buffer.readInt8(offset)
	  else if (type === 'uint8') return buffer.readUint8(offset)
	  else if (type === 'int16_le') return buffer.readInt16LE(offset)
	  else if (type === 'int16_be') return buffer.readInt16BE(offset)
	  else if (type === 'uint16_le') return buffer.readUint16LE(offset)
	  else if (type === 'uint16_be') return buffer.readUint16BE(offset)
	  else if (type === 'int32_le') return buffer.readInt32LE(offset)
	  else if (type === 'int32_be') return buffer.readInt32BE(offset)
	  else if (type === 'uint32_le') return buffer.readUint32LE(offset)
	  else if (type === 'uint32_be') return buffer.readUint32BE(offset)
	  else if (type === 'float_le') return buffer.readFloatLE(offset)
	  else if (type === 'float_be') return buffer.readFloatBE(offset)

	  else if (type === 'buffer') {
	    return buffer.subarray(offset, offset + length)
	  } else if (type === 'string') {
	    const strBuffer = buffer.subarray(offset, offset + length);
	    return decoder$1.decode(strBuffer)
	  } else if (type === 'number') {
	    const strNumber = buffer.subarray(offset, offset + length);
	    return Number(decoder$1.decode(strNumber))
	  } else if (type === 'object') {
	    const objEncoded = buffer.subarray(offset, offset + length);
	    try {
	      return JSON.parse(decoder$1.decode(objEncoded))
	    } catch (error) {
	      console.log('err. obj parse');
	    }
	  } else if (type === 'boolean') {
	    const v = buffer.readInt8(offset);
	    return v === 1
	  } else {
	    throw TypeError('invalid data')
	  }
	}

	function flatSubArray(args) {
	  let subArr = [];
	  const mainArr = args.filter(item => {
	    if (Array.isArray(item[0])) subArr = subArr.concat(item);
	    else return item
	  });
	  return mainArr.concat(subArr)
	}

	function pack(...args) {
	  const bufArr = flatSubArray(args);
	  let size = 0;
	  const info = [];
	  let offset = 0;

	  bufArr.forEach(bufPack => {
	    const [name, type, data] = bufPack;
	    size += data.byteLength;

	    if (typeof name === 'number' || name.length > 0) {
	    // MBA item use number type name.
	    // MB item use string type name.   null string means omit.
	    
	    // change to store more informative meta info.  
	    info.push([name, type, offset, data.byteLength]); 
	    
	    }
	    offset = size;
	  });


	  let infoEncoded;
	  let infoSize;

	  if (info.length > 0) {
	    let infoStr = JSON.stringify(info);
	    // console.log('pack infoStr , size:', infoStr , infoStr.length )
	    infoEncoded = encoder$1.encode(infoStr);
	    infoSize = infoEncoded.byteLength;
	    size = size + infoSize + 2;
	  }

	  const buffer$1 = buffer.Buffer.alloc(size);
	  offset = 0;
	  bufArr.forEach(bufPack => {
	    const buf = bufPack[2];
	    buffer$1.set(buf, offset);
	    offset += buf.byteLength;
	  });

	  if (info.length > 0) {
	    buffer$1.set(infoEncoded, offset);
	    const infoSizeBuff = NB('16', infoSize);
	    buffer$1.set(infoSizeBuff, offset + infoSize);
	    return buffer$1
	  } else {
	    return buffer$1
	  }
	}


	/**
	 * unpack() will use embeded meta info from the binary pack.  
	 * You can specify (optional) meta obejct. 
	 * (It's useful to read pure buffer data.)
	 * 
	 * You can get the meta object from:  getFrame(pack) , meta()
	 * @param {Buffer|Uint8Array} binPack binaryData
	 * @param {Object} meta *OPTION*  
	 * @returns {Object|undefined} success: return Object (include buffer data).   fail: return undefined
	 */
	function unpack(binPack, meta) {

	  const infoArr = meta || getMeta(binPack);
	  if (!infoArr) return

	  const buffer$1 = buffer.Buffer.from(binPack);
	  const binObj = {};
	  let readCounter = 0;
	  infoArr.forEach(bufPack => {
	    const [name, type, offset, length] = bufPack;
	    binObj[name] = readTypedBuffer(type, buffer$1, offset, length);
	    // console.log( '###3 len',length )
	    if( length) readCounter += length;
	  });

	  // Can not define meta for variable size buffer 
	  // unpacker support automatic property to read left(did't read) buffers.
	  // console.log("######, unpack: buffer " , readCounter, buffer ,buffer.byteLength)
	  if(  meta && buffer$1.byteLength !== readCounter ){
	    let leftSize = buffer$1.byteLength - readCounter;
	    // console.log('total,left buffer size', buffer.byteLength, leftSize )
	    binObj["$OTHERS"] = readTypedBuffer('b', buffer$1, readCounter, leftSize);
	  }

	  // set args with values if exist.
	  let mbaIndex = 0;
	  let args = [];
	  while( binObj[mbaIndex]){
	    args.push( binObj[mbaIndex++]);
	  }
	  
	  if( args.length > 0 ) {
	    binObj.args = args; 
	    binObj.$ = binObj.args; 
	  }

	  return binObj

	}



	const U8 = parseUint8Array;   //alias
	/**
	 * 
	 * @param {any} data 
	 * @param {Boolean} shareArrayBuffer false(default):  return new( or copied) ArrayBuffer.    true: share the input data's arrayBuffer.
	 * @returns {Uint8Array}
	 */
	function parseUint8Array(data, shareArrayBuffer = false) {
	  if (data === undefined) throw TypeError('Invalid data type: Undefined')
	  if (typeof data === 'string') {
	    return encoder$1.encode(data)
	  } else if (typeof data === 'number') { // number -> 1 byte uint8array(number)
	    return Uint8Array.from([data])
	  } else if (data instanceof ArrayBuffer) { // arraybuffer -> wrap uint8array(ab)
	    if (shareArrayBuffer) {
	      return new Uint8Array(data)
	    } else {
	      const originData = new Uint8Array(data);
	      const dataCopy = new Uint8Array(data.byteLength);
	      dataCopy.set(originData);
	      return dataCopy
	    }
	  } else if (ArrayBuffer.isView(data)) { // accept Buffer too.
	    if (shareArrayBuffer) {
	      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength) // DataView, TypedArray >  uint8array( use offset, length )
	    } else {
	      // new memory to protect origin arraybuffer.
	      const originData = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
	      const dataCopy = new Uint8Array(data.byteLength);
	      dataCopy.set(originData);
	      return dataCopy
	    }
	  } else { // array, object
	    return encoder$1.encode(JSON.stringify(data)) // object(array.. )  > JSON.str > encode > unint8array
	  }
	}

	const B8 = parseBuffer;

	function parseBuffer(data, shareArrayBuffer = false) {

	  const u8 = parseUint8Array(data, shareArrayBuffer);
	  if( shareArrayBuffer){
	    return buffer.Buffer.from( u8.buffer, u8.byteOffset, u8.byteLength )
	  }else {
	    return buffer.Buffer.from(u8)
	  }
	}

	const B8pack = parseBufferThenConcat;
	function parseBufferThenConcat(...dataArray) {
	  const buffers = dataArray.map(data => parseBuffer(data));
	  return buffer.Buffer.concat( buffers)
	}


	const U8pack = parseUint8ThenConcat; // alias
	/**
	 * 1. parse list of data into U8 list
	 * 2. return new Uint8Array merged.
	 * @param  {...any} dataArray 
	 * @returns 
	 */
	function parseUint8ThenConcat(...dataArray) {
	  try {
	    let bufferSize = 0;
	    let offset = 0;
	    const buffers = dataArray.map(data => parseUint8Array(data));
	    buffers.forEach(buf => { bufferSize += buf.byteLength; });
	    const buffer = new Uint8Array(bufferSize);
	    buffers.forEach(buf => {
	      buffer.set(buf, offset);
	      offset += buf.byteLength;
	    });
	    return buffer
	  } catch (error) {
	    console.log(error);
	  }
	}

	function hex(buffer) {
	  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('')
	}

	function equal(buf1, buf2) {
	  if (buf1.byteLength !== buf2.byteLength) return false
	  for (let i = 0; i < buf1.byteLength; i++) {
	    if (buf1[i] !== buf2[i]) return false
	  }
	  return true
	}




	function getBufferSize(binPack) {
	  if (getMetaSize$1(binPack) === 0) {
	    return binPack.byteLength
	  } else {
	    return binPack.byteLength - getMetaSize$1(binPack) - TAIL_LEN
	  }

	}

	// MB and MBA 
	function parseMetaInfo(binPack, infoSize) {
	  try {
	    const buffer = new Uint8Array(binPack.buffer, binPack.byteOffset, binPack.byteLength);
	    const infoFrom = buffer.byteLength - infoSize - 2;
	    const infoEncoded = buffer.subarray(infoFrom, buffer.byteLength - 2);
	    const decoded = decoder$1.decode(infoEncoded);
	    const info = JSON.parse(decoded);

	    if (!Array.isArray(info) || !Array.isArray(info[0])) return

	    let firstItem = info[0];
	    if (!firstItem) return

	    if (firstItem.length < 3) return
	    const [name, type, offset] = firstItem;

	    if ( typeof type !== 'string' || typeof offset !== 'number') return

	    return info
	  } catch (error) {
	    // return undefined
	  }
	}


	/** 
	 * Meta buffer pack Tail:
	 * binary Pack include TAIL(two bytes size) info at the end if it has JSON info.
	 * not include TAIL if it has not JSON.
	 */
	const TAIL_LEN = 2;

	/**
	 * 
	 * @param {Buffer|Uint8Array|ArrayBuffer} binPack 
	 * @returns {Number} last two byte value( read Uint16 bigendian )
	 */
	function readTail(binPack) {
	  if( binPack instanceof ArrayBuffer ){
	    binPack = buffer.Buffer.from(binPack); // creates a view for ArrayBuffer, without copying.
	  } 
	  if (binPack instanceof Uint8Array) {
	    if (binPack.byteLength <= TAIL_LEN) return 0

	    const dv = new DataView(binPack.buffer, binPack.byteOffset, binPack.byteLength);
	    const infoSize = dv.getUint16(binPack.byteLength - TAIL_LEN);  // last 2 bytes for json-info-length.
	    return infoSize

	  } else {
	    // throw TypeError('invalid data type.')
	    return 0
	  }

	}


	// binay data pack is not always Buffer.  
	// It should accept Uint8Array binPack.
	// This function don't use Buffer method.

	function getMetaSize$1(binPack) {
	  if( binPack instanceof ArrayBuffer ){
	    binPack = buffer.Buffer.from(binPack); // creates a view for ArrayBuffer, without copying.
	  } 
	  if (binPack instanceof Uint8Array) {

	    const size = binPack.byteLength;
	    if (size <= TAIL_LEN) return 0

	    //1. tail size check
	    const infoSize = readTail(binPack);
	    if (infoSize === 0 || infoSize > size) return 0
	    //2. try parse JSON 
	    const success = parseMetaInfo(binPack, infoSize);
	    //3. return success: jsonInfoSize,  fail: 0
	    if (success) return infoSize
	    else return 0
	  }else {
	    return 0
	  }
	}


	/**
	 * 
	 * @param {Buffer|Uint8Array} binPack 
	 * @returns {Buffer} 
	 */
	function getBuffer(binPack) {
	  const rawBufferSize = getBufferSize(binPack);
	  return binPack.subarray(0, rawBufferSize)
	}



	/**
	 * extract Meta info object if it has.
	 * 
	 * @param {Buffer|Uint8Array|ArrayBuffer} binPack 
	 * @param {Boolean} showDetail add additional item info: full data type name and bytelength.
	 * @returns {Object|undefined} success: return MetaInfo Object.   fail: return undefined.(No valid JSON included.)
	 */
	function getMeta(binPack, showDetail = false) {
	  if( binPack instanceof ArrayBuffer ){
	    binPack = buffer.Buffer.from(binPack); // creates a view for ArrayBuffer, without copying.
	  } 
	  const infoSize = readTail(binPack);
	  if (infoSize === 0) return

	  // check valid Meta
	  let metaInfo = parseMetaInfo(binPack, infoSize);
	  if (!metaInfo) return

	  if (!showDetail) {
	    return metaInfo
	  } else {
	    // add additional info
	    metaInfo.forEach(bufPack => {
	      const len = bufPack[3];
	      if (len == undefined) {  // add size info.
	        if (bufPack[1].includes('8')) bufPack[3] = 1;
	        else if (bufPack[1].includes('16')) bufPack[3] = 2;
	        else if (bufPack[1].includes('32')) bufPack[3] = 4;
	        else if (bufPack[1].includes('F')) bufPack[3] = 4;
	        else if (bufPack[1].includes('!')) bufPack[3] = 1;
	      }
	      bufPack[4] = parseTypeName(bufPack[1]);  // add full-type-name.
	    });
	    return metaInfo
	  }
	}

	function rawPack( ...args){
	  return getBuffer( pack(...args) )
	}

	function meta( ...args){
	  return getMeta( pack(...args) )
	}

	function metaDetail( ...args){
	  return getMeta( pack(...args) , true)
	}



	function getMetaDetail(binPack) {
	  return getMeta(binPack, true)
	}

	var MBP = /*#__PURE__*/Object.freeze({
		__proto__: null,
		Buffer: buffer.Buffer,
		NB: NB,
		numberBuffer: numberBuffer,
		MB: MB$1,
		metaBuffer: metaBuffer,
		MBA: MBA,
		metaBufferArguments: metaBufferArguments,
		parseTypeName: parseTypeName,
		readTypedBuffer: readTypedBuffer,
		pack: pack,
		unpack: unpack,
		U8: U8,
		parseUint8Array: parseUint8Array,
		B8: B8,
		parseBuffer: parseBuffer,
		B8pack: B8pack,
		parseBufferThenConcat: parseBufferThenConcat,
		U8pack: U8pack,
		parseUint8ThenConcat: parseUint8ThenConcat,
		hex: hex,
		equal: equal,
		getBufferSize: getBufferSize,
		parseMetaInfo: parseMetaInfo,
		TAIL_LEN: TAIL_LEN,
		readTail: readTail,
		getMetaSize: getMetaSize$1,
		getBuffer: getBuffer,
		getMeta: getMeta,
		rawPack: rawPack,
		meta: meta,
		metaDetail: metaDetail,
		getMetaDetail: getMetaDetail
	});

	var eventemitter3 = createCommonjsModule(function (module) {

	var has = Object.prototype.hasOwnProperty
	  , prefix = '~';

	/**
	 * Constructor to create a storage for our `EE` objects.
	 * An `Events` instance is a plain object whose properties are event names.
	 *
	 * @constructor
	 * @private
	 */
	function Events() {}

	//
	// We try to not inherit from `Object.prototype`. In some engines creating an
	// instance in this way is faster than calling `Object.create(null)` directly.
	// If `Object.create(null)` is not supported we prefix the event names with a
	// character to make sure that the built-in object properties are not
	// overridden or used as an attack vector.
	//
	if (Object.create) {
	  Events.prototype = Object.create(null);

	  //
	  // This hack is needed because the `__proto__` property is still inherited in
	  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
	  //
	  if (!new Events().__proto__) prefix = false;
	}

	/**
	 * Representation of a single event listener.
	 *
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	 * @constructor
	 * @private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}

	/**
	 * Add a listener for a given event.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} once Specify if the listener is a one-time listener.
	 * @returns {EventEmitter}
	 * @private
	 */
	function addListener(emitter, event, fn, context, once) {
	  if (typeof fn !== 'function') {
	    throw new TypeError('The listener must be a function');
	  }

	  var listener = new EE(fn, context || emitter, once)
	    , evt = prefix ? prefix + event : event;

	  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
	  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
	  else emitter._events[evt] = [emitter._events[evt], listener];

	  return emitter;
	}

	/**
	 * Clear event by name.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} evt The Event name.
	 * @private
	 */
	function clearEvent(emitter, evt) {
	  if (--emitter._eventsCount === 0) emitter._events = new Events();
	  else delete emitter._events[evt];
	}

	/**
	 * Minimal `EventEmitter` interface that is molded against the Node.js
	 * `EventEmitter` interface.
	 *
	 * @constructor
	 * @public
	 */
	function EventEmitter() {
	  this._events = new Events();
	  this._eventsCount = 0;
	}

	/**
	 * Return an array listing the events for which the emitter has registered
	 * listeners.
	 *
	 * @returns {Array}
	 * @public
	 */
	EventEmitter.prototype.eventNames = function eventNames() {
	  var names = []
	    , events
	    , name;

	  if (this._eventsCount === 0) return names;

	  for (name in (events = this._events)) {
	    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	  }

	  if (Object.getOwnPropertySymbols) {
	    return names.concat(Object.getOwnPropertySymbols(events));
	  }

	  return names;
	};

	/**
	 * Return the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Array} The registered listeners.
	 * @public
	 */
	EventEmitter.prototype.listeners = function listeners(event) {
	  var evt = prefix ? prefix + event : event
	    , handlers = this._events[evt];

	  if (!handlers) return [];
	  if (handlers.fn) return [handlers.fn];

	  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
	    ee[i] = handlers[i].fn;
	  }

	  return ee;
	};

	/**
	 * Return the number of listeners listening to a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Number} The number of listeners.
	 * @public
	 */
	EventEmitter.prototype.listenerCount = function listenerCount(event) {
	  var evt = prefix ? prefix + event : event
	    , listeners = this._events[evt];

	  if (!listeners) return 0;
	  if (listeners.fn) return 1;
	  return listeners.length;
	};

	/**
	 * Calls each of the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Boolean} `true` if the event had listeners, else `false`.
	 * @public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return false;

	  var listeners = this._events[evt]
	    , len = arguments.length
	    , args
	    , i;

	  if (listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }

	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }

	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;

	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }

	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }

	  return true;
	};

	/**
	 * Add a listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  return addListener(this, event, fn, context, false);
	};

	/**
	 * Add a one-time listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  return addListener(this, event, fn, context, true);
	};

	/**
	 * Remove the listeners of a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn Only remove the listeners that match this function.
	 * @param {*} context Only remove the listeners that have this context.
	 * @param {Boolean} once Only remove one-time listeners.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return this;
	  if (!fn) {
	    clearEvent(this, evt);
	    return this;
	  }

	  var listeners = this._events[evt];

	  if (listeners.fn) {
	    if (
	      listeners.fn === fn &&
	      (!once || listeners.once) &&
	      (!context || listeners.context === context)
	    ) {
	      clearEvent(this, evt);
	    }
	  } else {
	    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
	      if (
	        listeners[i].fn !== fn ||
	        (once && !listeners[i].once) ||
	        (context && listeners[i].context !== context)
	      ) {
	        events.push(listeners[i]);
	      }
	    }

	    //
	    // Reset the array, or remove it completely if we have no more listeners.
	    //
	    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
	    else clearEvent(this, evt);
	  }

	  return this;
	};

	/**
	 * Remove all listeners, or those of the specified event.
	 *
	 * @param {(String|Symbol)} [event] The event name.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  var evt;

	  if (event) {
	    evt = prefix ? prefix + event : event;
	    if (this._events[evt]) clearEvent(this, evt);
	  } else {
	    this._events = new Events();
	    this._eventsCount = 0;
	  }

	  return this;
	};

	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;

	//
	// Expose the prefix.
	//
	EventEmitter.prefixed = prefix;

	//
	// Allow `EventEmitter` to be imported as module namespace.
	//
	EventEmitter.EventEmitter = EventEmitter;

	//
	// Expose the module.
	//
	{
	  module.exports = EventEmitter;
	}
	});

	// SHA-256 (+ HMAC and PBKDF2) for JavaScript.
	//
	// Written in 2014-2016 by Dmitry Chestnykh.
	// Public domain, no warranty.
	//
	// Functions (accept and return Uint8Arrays):
	//
	//   sha256(message) -> hash
	//   sha256.hmac(key, message) -> mac
	//   sha256.pbkdf2(password, salt, rounds, dkLen) -> dk
	//
	//  Classes:
	//
	//   new sha256.Hash()
	//   new sha256.HMAC(key)
	//
	var digestLength = 32;
	var blockSize = 64;
	// SHA-256 constants
	const K = new Uint32Array([
	  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
	  0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
	  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
	  0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
	  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
	  0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
	  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
	  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
	  0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
	  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
	  0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
	  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
	]);
	function hashBlocks (w, v, p, pos, len) {
	  let a, b, c, d, e, f, g, h, u, i, j, t1, t2;
	  while (len >= 64) {
	    a = v[0];
	    b = v[1];
	    c = v[2];
	    d = v[3];
	    e = v[4];
	    f = v[5];
	    g = v[6];
	    h = v[7];
	    for (i = 0; i < 16; i++) {
	      j = pos + i * 4;
	      w[i] = (((p[j] & 0xff) << 24) | ((p[j + 1] & 0xff) << 16) |
	                ((p[j + 2] & 0xff) << 8) | (p[j + 3] & 0xff));
	    }
	    for (i = 16; i < 64; i++) {
	      u = w[i - 2];
	      t1 = (u >>> 17 | u << (32 - 17)) ^ (u >>> 19 | u << (32 - 19)) ^ (u >>> 10);
	      u = w[i - 15];
	      t2 = (u >>> 7 | u << (32 - 7)) ^ (u >>> 18 | u << (32 - 18)) ^ (u >>> 3);
	      w[i] = (t1 + w[i - 7] | 0) + (t2 + w[i - 16] | 0);
	    }
	    for (i = 0; i < 64; i++) {
	      t1 = (((((e >>> 6 | e << (32 - 6)) ^ (e >>> 11 | e << (32 - 11)) ^
	                (e >>> 25 | e << (32 - 25))) + ((e & f) ^ (~e & g))) | 0) +
	                ((h + ((K[i] + w[i]) | 0)) | 0)) | 0;
	      t2 = (((a >>> 2 | a << (32 - 2)) ^ (a >>> 13 | a << (32 - 13)) ^
	                (a >>> 22 | a << (32 - 22))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
	      h = g;
	      g = f;
	      f = e;
	      e = (d + t1) | 0;
	      d = c;
	      c = b;
	      b = a;
	      a = (t1 + t2) | 0;
	    }
	    v[0] += a;
	    v[1] += b;
	    v[2] += c;
	    v[3] += d;
	    v[4] += e;
	    v[5] += f;
	    v[6] += g;
	    v[7] += h;
	    pos += 64;
	    len -= 64;
	  }
	  return pos
	}
	// Hash implements SHA256 hash algorithm.
	const Hash = /** @class */ (function () {
	  function Hash () {
	    this.digestLength = digestLength;
	    this.blockSize = blockSize;
	    // Note: Int32Array is used instead of Uint32Array for performance reasons.
	    this.state = new Int32Array(8); // hash state
	    this.temp = new Int32Array(64); // temporary state
	    this.buffer = new Uint8Array(128); // buffer for data to hash
	    this.bufferLength = 0; // number of bytes in buffer
	    this.bytesHashed = 0; // number of total bytes hashed
	    this.finished = false; // indicates whether the hash was finalized
	    this.reset();
	  }
	  // Resets hash state making it possible
	  // to re-use this instance to hash other data.
	  Hash.prototype.reset = function () {
	    this.state[0] = 0x6a09e667;
	    this.state[1] = 0xbb67ae85;
	    this.state[2] = 0x3c6ef372;
	    this.state[3] = 0xa54ff53a;
	    this.state[4] = 0x510e527f;
	    this.state[5] = 0x9b05688c;
	    this.state[6] = 0x1f83d9ab;
	    this.state[7] = 0x5be0cd19;
	    this.bufferLength = 0;
	    this.bytesHashed = 0;
	    this.finished = false;
	    return this
	  };
	  // Cleans internal buffers and re-initializes hash state.
	  Hash.prototype.clean = function () {
	    for (var i = 0; i < this.buffer.length; i++) {
	      this.buffer[i] = 0;
	    }
	    for (var i = 0; i < this.temp.length; i++) {
	      this.temp[i] = 0;
	    }
	    this.reset();
	  };
	  // Updates hash state with the given data.
	  //
	  // Optionally, length of the data can be specified to hash
	  // fewer bytes than data.length.
	  //
	  // Throws error when trying to update already finalized hash:
	  // instance must be reset to use it again.
	  Hash.prototype.update = function (data, dataLength) {
	    if (dataLength === void 0) { dataLength = data.length; }
	    if (this.finished) {
	      throw new Error("SHA256: can't update because hash was finished.")
	    }
	    let dataPos = 0;
	    this.bytesHashed += dataLength;
	    if (this.bufferLength > 0) {
	      while (this.bufferLength < 64 && dataLength > 0) {
	        this.buffer[this.bufferLength++] = data[dataPos++];
	        dataLength--;
	      }
	      if (this.bufferLength === 64) {
	        hashBlocks(this.temp, this.state, this.buffer, 0, 64);
	        this.bufferLength = 0;
	      }
	    }
	    if (dataLength >= 64) {
	      dataPos = hashBlocks(this.temp, this.state, data, dataPos, dataLength);
	      dataLength %= 64;
	    }
	    while (dataLength > 0) {
	      this.buffer[this.bufferLength++] = data[dataPos++];
	      dataLength--;
	    }
	    return this
	  };
	  // Finalizes hash state and puts hash into out.
	  //
	  // If hash was already finalized, puts the same value.
	  Hash.prototype.finish = function (out) {
	    if (!this.finished) {
	      const bytesHashed = this.bytesHashed;
	      const left = this.bufferLength;
	      const bitLenHi = (bytesHashed / 0x20000000) | 0;
	      const bitLenLo = bytesHashed << 3;
	      const padLength = (bytesHashed % 64 < 56) ? 64 : 128;
	      this.buffer[left] = 0x80;
	      for (var i = left + 1; i < padLength - 8; i++) {
	        this.buffer[i] = 0;
	      }
	      this.buffer[padLength - 8] = (bitLenHi >>> 24) & 0xff;
	      this.buffer[padLength - 7] = (bitLenHi >>> 16) & 0xff;
	      this.buffer[padLength - 6] = (bitLenHi >>> 8) & 0xff;
	      this.buffer[padLength - 5] = (bitLenHi >>> 0) & 0xff;
	      this.buffer[padLength - 4] = (bitLenLo >>> 24) & 0xff;
	      this.buffer[padLength - 3] = (bitLenLo >>> 16) & 0xff;
	      this.buffer[padLength - 2] = (bitLenLo >>> 8) & 0xff;
	      this.buffer[padLength - 1] = (bitLenLo >>> 0) & 0xff;
	      hashBlocks(this.temp, this.state, this.buffer, 0, padLength);
	      this.finished = true;
	    }
	    for (var i = 0; i < 8; i++) {
	      out[i * 4 + 0] = (this.state[i] >>> 24) & 0xff;
	      out[i * 4 + 1] = (this.state[i] >>> 16) & 0xff;
	      out[i * 4 + 2] = (this.state[i] >>> 8) & 0xff;
	      out[i * 4 + 3] = (this.state[i] >>> 0) & 0xff;
	    }
	    return this
	  };
	  // Returns the final hash digest.
	  Hash.prototype.digest = function () {
	    const out = new Uint8Array(this.digestLength);
	    this.finish(out);
	    return out
	  };
	  // Internal function for use in HMAC for optimization.
	  Hash.prototype._saveState = function (out) {
	    for (let i = 0; i < this.state.length; i++) {
	      out[i] = this.state[i];
	    }
	  };
	  // Internal function for use in HMAC for optimization.
	  Hash.prototype._restoreState = function (from, bytesHashed) {
	    for (let i = 0; i < this.state.length; i++) {
	      this.state[i] = from[i];
	    }
	    this.bytesHashed = bytesHashed;
	    this.finished = false;
	    this.bufferLength = 0;
	  };
	  return Hash
	}());
	// HMAC implements HMAC-SHA256 message authentication algorithm.
	const HMAC = /** @class */ (function () {
	  function HMAC (key) {
	    this.inner = new Hash();
	    this.outer = new Hash();
	    this.blockSize = this.inner.blockSize;
	    this.digestLength = this.inner.digestLength;
	    const pad = new Uint8Array(this.blockSize);
	    if (key.length > this.blockSize) {
	      (new Hash()).update(key).finish(pad).clean();
	    } else {
	      for (var i = 0; i < key.length; i++) {
	        pad[i] = key[i];
	      }
	    }
	    for (var i = 0; i < pad.length; i++) {
	      pad[i] ^= 0x36;
	    }
	    this.inner.update(pad);
	    for (var i = 0; i < pad.length; i++) {
	      pad[i] ^= 0x36 ^ 0x5c;
	    }
	    this.outer.update(pad);
	    this.istate = new Uint32Array(8);
	    this.ostate = new Uint32Array(8);
	    this.inner._saveState(this.istate);
	    this.outer._saveState(this.ostate);
	    for (var i = 0; i < pad.length; i++) {
	      pad[i] = 0;
	    }
	  }
	  // Returns HMAC state to the state initialized with key
	  // to make it possible to run HMAC over the other data with the same
	  // key without creating a new instance.
	  HMAC.prototype.reset = function () {
	    this.inner._restoreState(this.istate, this.inner.blockSize);
	    this.outer._restoreState(this.ostate, this.outer.blockSize);
	    return this
	  };
	  // Cleans HMAC state.
	  HMAC.prototype.clean = function () {
	    for (let i = 0; i < this.istate.length; i++) {
	      this.ostate[i] = this.istate[i] = 0;
	    }
	    this.inner.clean();
	    this.outer.clean();
	  };
	  // Updates state with provided data.
	  HMAC.prototype.update = function (data) {
	    this.inner.update(data);
	    return this
	  };
	  // Finalizes HMAC and puts the result in out.
	  HMAC.prototype.finish = function (out) {
	    if (this.outer.finished) {
	      this.outer.finish(out);
	    } else {
	      this.inner.finish(out);
	      this.outer.update(out, this.digestLength).finish(out);
	    }
	    return this
	  };
	  // Returns message authentication code.
	  HMAC.prototype.digest = function () {
	    const out = new Uint8Array(this.digestLength);
	    this.finish(out);
	    return out
	  };
	  return HMAC
	}());
	// Returns SHA256 hash of data.
	function hash (data) {
	  const h = (new Hash()).update(data);
	  const digest = h.digest();
	  h.clean();
	  return digest
	}
	// Function hash is both available as module.hash and as default export.
	// export default hash
	// Returns HMAC-SHA256 of data under the key.
	function hmac (key, data) {
	  const h = (new HMAC(key)).update(data);
	  const digest = h.digest();
	  h.clean();
	  return digest
	}

	/*
	Tip.
	 fast-sha256 use data:8Uint8Array
	 sha256-mbp use data:any  ( internal type converter )

	 MBP.U8( any ) return Uint8Array
	 MBP.B8( any ) reutn Buffer instance

	*/
	const sha256 = {};

	sha256.hash = function (data) {
	  return hash(U8(data))
	};

	sha256.hex = function (data) {
	  return B8( hash(U8(data)) ).toString('hex')
	};

	sha256.base64= function (data) {
	  return B8(  hash(U8(data)) ).toString('base64')
	};

	sha256.hmac = function (key, data) {
	  return hmac(U8(key), U8(data))
	};

	const MB = MB$1;


	// remocon message pack one byte header. 
	let BohoMsg = {
	  AUTH_REQ : 0xB0,  
	  AUTH_NONCE: 0xB1,
	  AUTH_HMAC: 0xB2,
	  AUTH_ACK: 0xB3,
	  AUTH_FAIL: 0xB4,
	  AUTH_EXT: 0xB5,
	  ENC_PACK : 0xB6,  
	  ENC_E2E : 0xB7,  
	  ENC_488 : 0xB8
	};

	for (let c in BohoMsg) { BohoMsg[BohoMsg[c]] = c; }

	const Meta = {

	  AUTH_REQ: meta(  // 2
	    MB('header','8', 0),
	    MB('reserved','8', 0)
	  ),

	  AUTH_NONCE: meta(  // 13
	    MB('header','8', 0),
	    MB('unixTime','32L', 0),
	    MB('milTime','32L', 0 ),
	    MB('nonce', buffer.Buffer.alloc(4))
	  ),

	  AUTH_HMAC: meta( // 45
	    MB('header','8', 0),
	    MB('id8',buffer.Buffer.alloc(8)),
	    MB('nonce', buffer.Buffer.alloc(4)),
	    MB('hmac32', buffer.Buffer.alloc(32))
	  ),
	    
	  AUTH_ACK: meta( // 33
	    MB('header','8', 0),
	    MB('hmac32', buffer.Buffer.alloc(32))
	  ),
	    

	  ENC_PACK: meta(  //25 + payload
	    MB('type','8',0),
	    MB('len','32L',0),  // pure xdata size.  
	    MB('salt12', buffer.Buffer.alloc(12)),  // sec,mil,rand
	    MB('hmac',8,0)
	    // MB( 'xdata', encData )
	    ),


	  ENC_488: meta(   // 21 + payload
	    MB('type','8', 0 ),
	    MB('len','32L', 0 ),
	    MB('otpSrc8', buffer.Buffer.alloc(8) ),
	    MB('hmac8', buffer.Buffer.alloc(8) )
	    // MB('xdata', encData ) 
	    )


	  };


	  function getMetaSize(meta){
	    let lastItem = meta[ meta.length - 1];
	    return lastItem[2] + lastItem[3]
	  }

	  const MetaSize = {
	    AUTH_REQ: getMetaSize( Meta.AUTH_REQ ),
	    AUTH_NONCE: getMetaSize( Meta.AUTH_NONCE ),
	    AUTH_HMAC: getMetaSize( Meta.AUTH_HMAC ),
	    AUTH_ACK: getMetaSize( Meta.AUTH_ACK ),
	    ENC_PACK: getMetaSize( Meta.ENC_PACK ),
	    ENC_488: getMetaSize( Meta.ENC_488 )
	  };

	// console.log( 'boho MetaSize', MetaSize )
	// boho MetaSize {
	//   AUTH_REQ: 2,
	//   AUTH_NONCE: 13,
	//   AUTH_HMAC: 45,
	//   AUTH_ACK: 33,
	//   ENC_PACK: 25,
	//   ENC_488: 21
	// }

	let isNode = false;
	try {
	  isNode = Object.prototype.toString.call(global.process) === '[object process]';
	} catch (e) { }


	function RAND(size) {
	  if( isNode ){
	    return webcrypto.getRandomValues(buffer.Buffer.alloc(size))
	  }else {
	    return self.crypto.getRandomValues(buffer.Buffer.alloc(size))
	  }
	}



	class Boho {
	  // A. Core
	  constructor() {

	    this._id8 = buffer.Buffer.alloc(8);
	    this._otpSrc44 = buffer.Buffer.alloc(44);
	    this._otp36 = buffer.Buffer.alloc(36);
	    this._hmac = buffer.Buffer.alloc(32);

	    this.auth_salt12 = buffer.Buffer.alloc(12);
	    this.localNonce = buffer.Buffer.alloc(4);
	    this.remoteNonce = buffer.Buffer.alloc(4);
	    this.isAuthorized = false;

	  }

	  clearAuth(){
	    this._id8.fill(0);
	    this._otpSrc44.fill(0);
	    this._otp36.fill(0);
	    this._hmac.fill(0);
	    this.auth_salt12.fill(0);
	    this.localNonce.fill(0);
	    this.remoteNonce.fill(0);
	    this.isAuthorized = false;
	  }

	  // for the self
	  set_hash_id8(data) {
	    let idSum = B8(sha256.hash(data));
	    idSum.copy(this._id8, 0, 0, 8);
	  }

	  set_id8(data) {
	    let encStr = B8(data);
	    this._id8.fill(0);
	    encStr.copy(this._id8, 0, 0, 8);
	  }

	  set_key(data) {
	    let keySum = B8(sha256.hash(data));
	    keySum.copy(this._otpSrc44, 0, 0, 32);
	  }

	  //  id_key == 'id' + '.' + 'key' 
	  set_id_key(id_key) {
	    let delimiterPosition = id_key.indexOf('.');
	    if( delimiterPosition == -1 ) return
	    let id = id_key.substring(0, delimiterPosition);
	    let key = id_key.substring(delimiterPosition + 1);
	    this.set_id8(id);
	    this.set_key(key);
	  }

	  copy_id8(data) {
	    data.copy(this._id8, 0, 0, 8);
	  }

	  copy_key(data) {
	    data.copy(this._otpSrc44, 0, 0, 32);
	  }


	  sha256_n(srcData, n) {
	    let hashSum = sha256.hash(srcData);
	    for (let i = 0; i < n; i++) hashSum = sha256.hash(hashSum);
	    return hashSum
	  }


	  // useful general encryption  i.e. enc_pack
	  set_clock_rand() {

	    let milTime = Date.now();
	    let secTime = parseInt(milTime / 1000);
	    milTime = milTime % 0xffffffff;
	    const salt12 = buffer.Buffer.concat([
	     NB('32L', secTime),
	     NB('32L', milTime),
	      RAND(4)
	    ]);

	    salt12.copy(this._otpSrc44, 32);
	  }

	  // for secure communication sender. 
	  set_clock_nonce(nonce) {
	    let milTime = Date.now();
	    let secTime = parseInt(milTime / 1000);
	    milTime = milTime % 0xffffffff;
	    const salt12 = buffer.Buffer.concat([
	     NB('32L', secTime),
	     NB('32L', milTime),
	      nonce
	    ]);

	    salt12.copy(this._otpSrc44, 32);
	  }


	  set_salt12(salt12) {
	    salt12.copy(this._otpSrc44, 32);
	  }

	  resetOTP() {
	    let otp32 = B8(sha256.hash(this._otpSrc44));
	    otp32.copy(this._otp36, 0, 0, 32);
	  }

	  getIndexOTP(otpIndex) {
	    this._otp36.writeUInt32LE(otpIndex, 32);
	    return sha256.hash(this._otp36)
	  }


	  generateHMAC(data) {
	    let hmacSrc = buffer.Buffer.concat([this._otpSrc44, data]);
	    this._hmac = B8(sha256.hash(hmacSrc));
	  }

	  // return 8 bytes of hash
	  getHMAC8(data) {
	    let hmacSrc = buffer.Buffer.concat([this._otpSrc44, data]);
	    this._hmac = B8(sha256.hash(hmacSrc));
	    return this._hmac.subarray(0, 8)
	  }

	  xotp(data, otpStartIndex = 0, shareDataBuffer = false) {

	    data = B8(data, shareDataBuffer);

	    let len = data.byteLength;
	    let otpIndex = otpStartIndex;
	    let dataOffset = 0;
	    let xorCalcLen = 0;

	    while (len > 0) {
	      xorCalcLen = len < 32 ? len : 32;
	      let iotp = this.getIndexOTP(++otpIndex);
	      for (let i = 0; i < xorCalcLen; i++) {
	        data[dataOffset++] ^= iotp[i];
	      }
	      len -= 32;
	    }
	    return data
	  }

	  // B. AUTH process

	  // step 1
	  // client send AUTH_REQ
	  auth_req() {
	    return pack(
	      MB$1('#type', '8', BohoMsg.AUTH_REQ),
	      MB$1('#reserved', '8', 0)
	    )
	  }

	  // step 2
	  // server send AUTH_NONCE
	  auth_nonce() {
	    let now = Date.now();
	    let unixTime = Math.floor(now / 1000);
	    let milTime = now % 1000;
	    this.localNonce = RAND(4);
	    this.auth_salt12 = buffer.Buffer.concat([
	     NB('32L', unixTime),
	     NB('32L', milTime),
	      this.localNonce
	    ]);

	    let infoPack = buffer.Buffer.concat([
	     NB('8', BohoMsg.AUTH_NONCE),
	      this.auth_salt12
	    ]);
	    return infoPack
	  }


	  // step 3
	  // client send AUTH_HMAC
	  // input :  auth_nonce buffer
	  auth_hmac(buffer$1) {
	    let auth_nonce = unpack(buffer$1, Meta.AUTH_NONCE);
	    if (auth_nonce) {
	      // console.log(' auth nonce', auth_nonce )

	      // let now = Date.now()
	      // let localUTC= Math.floor( now/ 1000 )
	      // let localMilTime = now % 1000

	      // console.log('time server [sec]', auth_nonce.unixTime, auth_nonce.milTime )
	      // console.log('time client [sec]', localUTC , localMilTime )
	      // console.log('time diff client and server[sec]', auth_nonce.unixTime - localUTC )

	      // let serverSecMil = auth_nonce.unixTime * 1000 + auth_nonce.milTime
	      // console.log('time diff msec client and server[msec]', serverSecMil - now )

	      let salt12 = buffer.Buffer.concat([
	       NB('32L', auth_nonce.unixTime),
	       NB('32L', auth_nonce.milTime),
	        auth_nonce.nonce
	      ]);

	      this.set_salt12(salt12);

	      this.localNonce = RAND(4);
	      // hmac( key, sec,mil,serverNonce, localNonce)
	      this.generateHMAC(this.localNonce);

	      // let hmac8 = this._hmac.subarray(0, 8)

	      this.remoteNonce = auth_nonce.nonce;

	      let auth_hmac_buffer = pack( // 21 -> 45
	       MB$1('#header', '8', BohoMsg.AUTH_HMAC),
	       MB$1('#id8', this._id8),
	       MB$1('#nonce', this.localNonce),
	       MB$1('#hmac32', this._hmac ), //full 32bytes hash
	      );

	      return auth_hmac_buffer
	    }
	    return false
	  }

	  /*  
	      step 4.  for server
	  
	      step 4-1. check client's auth_hmac
	      step 4-2. reply result
	          send AUTH_ACK  with another HMAC for client.
	          or send AUTH_FAIL when fail.
	   */

	  // input: unpack object or buffer of auth_hmac
	  check_auth_hmac(data) {
	    let infoPack;
	    if (data instanceof Uint8Array) {
	      infoPack = unpack(data, Meta.AUTH_HMAC);
	      if (!infoPack) {
	        // console.log('auth_hamc unpack fail.')
	        return
	      }
	    } else {
	      infoPack = data;

	    }
	    // console.log('auth_hamc infoObj', infoPack )

	    this.set_salt12(this.auth_salt12);

	    // hmac( key, sec,mil,serverNonce, clientNonce)
	    this.generateHMAC(infoPack.nonce);
	    // let hmac8 = this._hmac.subarray(0, 8)
	    let hmac32 = this._hmac;

	    if (equal(infoPack.hmac32, hmac32)) {
	      //Auth success then store client nonce.
	      this.remoteNonce = infoPack.nonce;

	      let salt12 = buffer.Buffer.concat([
	        this.localNonce,
	        this.remoteNonce,
	        this.localNonce
	      ]);
	      this.set_salt12(salt12);
	      this.generateHMAC(infoPack.nonce);
	      let replyHMAC = this._hmac;

	      let auth_ack = rawPack( 
	       MB$1('header', '8', BohoMsg.AUTH_ACK),
	       MB$1('hmac32', replyHMAC)
	      );
	      this.isAuthorized = true;
	      return auth_ack
	    }
	    return false
	  }



	  // step 5.  cross check
	  // client check server's hmac.  
	  check_auth_ack_hmac(buffer$1) {
	    // server response has hmac ( key + clientNonce)
	    let auth_ack = unpack(buffer$1, Meta.AUTH_ACK);
	    if (auth_ack) {
	      let salt12 = buffer.Buffer.concat([
	        this.remoteNonce,
	        this.localNonce,
	        this.remoteNonce,
	      ]);
	      this.set_salt12(salt12);
	      this.generateHMAC(this.localNonce);
	      // let hmac8 = this._hmac.subarray(0, 8)
	      let hmac32 = this._hmac;
	      //server side hmac using client nonce.
	      if (equal(hmac32, auth_ack.hmac32)) {
	        this.isAuthorized = true;
	        return true
	      }
	    }
	    // server hmac error
	    return
	  }

	  // C. Secure Communication

	  // Must AUTH first.
	  encrypt_488(data) {  // payload max about 2^32 bytes.
	    if (!this.isAuthorized) return

	    data = B8(data);

	    this.set_clock_nonce(this.remoteNonce);
	    this.resetOTP();

	    let hmac8 = this.getHMAC8(data);
	    let encData = this.xotp(data);

	    let pack$1 = pack(
	      MB$1('#type', '8', BohoMsg.ENC_488),
	      MB$1('#len', '32L', data.byteLength),
	      MB$1('#otpSrc8', this._otpSrc44.subarray(32, 40)),
	      MB$1('#hmac8', hmac8),
	      MB$1('#xdata', encData)
	    );
	    // console.log('enc pack result', pack )
	    return pack$1
	  }


	  decrypt_488(data) {
	    data = B8(data);

	    let pack = unpack(data, Meta.ENC_488);

	    if (pack) {

	      let salt12 = buffer.Buffer.concat([
	        pack.otpSrc8,
	        this.localNonce
	      ]);

	      this.set_salt12(salt12);
	      this.resetOTP();

	      let xdata = pack.$OTHERS.subarray(0, pack.len);
	      let decData = this.xotp(xdata);

	      let hmac8 = this.getHMAC8(decData);

	      if (equal(hmac8, pack.hmac8)) return decData

	      // console.log('hmac dismatch', decData )
	    }
	  }


	  // maxium data size is 2**32 -1 bytes.
	  encryptPack(data) {
	    data = B8(data);

	    this.set_clock_rand();
	    this.resetOTP();

	    let hmac8 = this.getHMAC8(data);
	    let encData = this.xotp(data);

	    let pack$1 = pack(
	      MB$1('#type', '8', BohoMsg.ENC_PACK),
	      MB$1('#len', '32L', data.byteLength),
	      MB$1('#salt12', this._otpSrc44.subarray(32)),
	      MB$1('#hmac8', hmac8),
	      MB$1('#xdata', encData)
	    );
	    return pack$1
	  }


	  decryptPack(data) {

	    if (data[0] !== BohoMsg.ENC_PACK) {
	      // console.log('Boho: Invalid packType')
	      return
	    }

	    // packLength
	    let readPackLen = data.readUint32LE(1);
	    if (readPackLen != data.byteLength - MetaSize.ENC_PACK) {
	      // console.log('Boho: Invalid LEN data_len: data.byteLen' , readPackLen, data.byteLength)
	      return
	    }

	    try {
	      let pack = unpack(data, Meta.ENC_PACK);
	      //  console.log('unpack result', pack )
	      if (!pack) return

	      this.set_salt12(pack.salt12);
	      this.resetOTP();

	      let xdata = pack.$OTHERS;
	      let decData = this.xotp(xdata);
	      let hmac8 = this.getHMAC8(decData);

	      if (equal(pack.hmac, hmac8)) {
	        pack.data = decData;
	        return pack
	      }
	      // console.log('Invalid HMAC', pack.hmac, hmac8 )

	    } catch (error) {
	      // console.log('Boho: unpack err', error )

	    }
	  }

	  encrypt_e2e(data, key) {
	    let baseKey = buffer.Buffer.alloc(32);
	    baseKey.set(this._otpSrc44.subarray(0, 32));
	    this.set_key(key);
	    let pack = this.encryptPack(data);
	    this._otpSrc44.set(baseKey);
	    return pack;
	  }

	  decrypt_e2e(data, key) {
	    let baseKey = buffer.Buffer.alloc(32);
	    baseKey.set(this._otpSrc44.subarray(0, 32));
	    this.set_key(key);
	    let decPack = this.decryptPack(data);
	    this._otpSrc44.set(baseKey);
	    return decPack
	  }

	}

	// table index related with:
	// - AUTH database level
	// - serverOption.defaultQuotaIndex

	// quota example
	// index range: 0~255.
	let quotaTable = {
	  // CongSocket
	  0: { // default. anonymouse:
	    signalSize: 1500,
	    publishCounter: 10,
	    trafficRate: 10000
	  },
	  1: { // auth_ultralight:  eg. Arduino Uno.
	    signalSize: 255,
	    publishCounter: 10,
	    trafficRate: 100000
	  },
	  2: { // auth_light:  eg. authorized ESP.
	    signalSize: 65535,
	    publishCounter: 10,
	    trafficRate: 1048576
	  },

	  // WebSocket (browser and node app)
	  3: { // authorized basic.
	    signalSize: 1048576,  
	    publishCounter: 10,
	    trafficRate: 1048576 * 20
	  },

	  // WebSocket (browser and node app)
	  10: { //  anonymouse
	    signalSize: 1500,  
	    publishCounter: 5,
	    trafficRate: 1048576 * 20
	  },

	  11: { // authorized basic.
	    signalSize: 65535,  
	    publishCounter: 10,
	    trafficRate: 1048576 * 20
	  },
	  
	  12: { // authorized power.
	    signalSize: 1048576,  
	    publishCounter: 100,
	    trafficRate: 1048576 * 20
	  },
	  
	  // you can add your custom quota level.

	  // super admin or root user.
	  // to monitor, metric, sudo command, db acess
	  255: { 
	    signalSize: 1048576 * 20,
	    publishCounter: 10000,
	    trafficRate: 1048576 * 100
	  }
	};

	// client remote state
	const STATES = {
	  OPENING: 0,
	  OPEN: 1,
	  CLOSING: 2,
	  CLOSED: 3,
	  SERVER_READY: 4,
	  AUTH_FAIL: 5,
	  AUTH_READY: 6,
	  READY: 7
	};
	for (let c in STATES) { STATES[STATES[c]] = c; }

	let ENC_MODE = {
	  NO: 0,
	  YES: 1,
	  AUTO: 2
	};

	for (let c in ENC_MODE) { ENC_MODE[ENC_MODE[c]] = c; }


	const SIZE_LIMIT = {
	  TAG_LEN1: 255,
	  TAG_LEN2: 65535,
	  REDIRECTION_CLOSE: 2,
	  CONNECTION_CHECKER_PERIOD: 3000,
	  PROMISE_TIMEOUT: 5000,
	  DID: 8,
	  CID: 12
	};

	let PAYLOAD_TYPE = {
	  EMPTY: 0, 
	  TEXT: 1,
	  BINARY: 2, 
	  OBJECT: 3, // one stringify able object. no buffer.
	  MJSON: 4, // multiple stringify able obejct.  JSON string. with top levle array , no buffer
	  MBA: 5  // "meta_buffer_arguments" arbitary types.  buffer included.
	};
	for (let c in PAYLOAD_TYPE) { PAYLOAD_TYPE[PAYLOAD_TYPE[c]] = c; }
	// console.log( PAYLOAD_TYPE )

	// MJSON: multiple arguments 
	// accepet only string, number, root depth js primittive object, 
	// unpack and will send to receiver handler with multiple params.

	// MBA: buffer pack of multiple arguments.  check "meta-buffer-pack" module. 
	// MBA: when armuents includes raw Buffer( TypedArray )

	// remote message pack one byte header. 
	let RemoteMsg = {

	  /* 
	  * 0~127dec.  reserved. for text stream.
	  * 0~31: control code
	  * 32~126: ascii charactor
	  * 127: DEL
	  */
	  
	  // ADMIN_REQ: 0xA0,

	  // DO NOT USE: 0xB0~ 0xBF
	  // Boho module using this numbers.
	  // AUTH_REQ : 0xB0,  
	  // AUTH_NONCE: 0xB1,
	  // AUTH_HMAC: 0xB2,
	  // AUTH_ACK: 0xB3,
	  // AUTH_FAIL: 0xB4,
	  // AUTH_EXT: 0xB5,
	  // ENC_PACK : 0xB6,  
	  // ENC_E2E : 0xB7,  
	  // ENC_488 : 0xB8
	  // reserved ~0xBF

	  // C. Remote status contorl.
	  SERVER_READY: 0xC0,
	  CID_REQ: 0xC1, 
	  CID_RES: 0xC2,  
	  QUOTA_LEVEL: 0xC3,
	  SERVER_CLEAR_AUTH: 0xC4, 
	  SERVER_REDIRECT: 0xC5,

	  // ..
	  LOOP: 0xCB,
	  ECHO: 0xCC,
	  PING: 0xCD,  
	  PONG: 0xCE,
	  CLOSE: 0xCF,
	  // ~CF


	  // D. Remote data signaling
	  SIGNAL: 0xD0,  
	  SIGNAL_REQ: 0xD1, 
	  SIGNAL_E2E: 0xD2, 
	  SUBSCRIBE: 0xD3,
	  SUBSCRIBE_REQ: 0xD4, 
	  UNSUBSCRIBE: 0xD5, 
	  SERVER_SIGNAL: 0xD6, 

	  // ..
	  IAM: 0xD9,
	  IAM_RES: 0xDA,
	  
	  //.. 
	  SET: 0xDB,   //
	  RESPONSE_CODE: 0xDC,   
	  RESPONSE_MBP: 0xDD,   

	  REQUEST: 0xDE, //client public
	  RESPONSE: 0xDF,
	  // ~DF


	  // F. Framing Flow control related framing protocol.(CongPacket)
	  FLOW_MODE: 0xF0,
	  WAIT: 0xF1,
	  RESUME: 0xF2,
	  //..
	  TIME_OUT: 0xFD,
	  OVER_SIZE: 0xFE,
	  OVER_FLOW: 0xFF

	};

	for (let c in RemoteMsg) { RemoteMsg[RemoteMsg[c]] = c; }

	const encoder = new TextEncoder();
	const decoder = new TextDecoder();

	function byteToUrl( buffer){
	  //ipv4(4bytes) , port(2bytes)
	  if(buffer.byteLength != 6 ) return 
	  let address = buffer[0].toString() + "."+ buffer[1].toString()
	                + "."+ buffer[2].toString() + "."+ buffer[3].toString();
	  let port = (buffer[4] << 8) + buffer[5]; 

	  return address +':'+ port.toString()
	}

	class RemoteCore extends eventemitter3{
	  constructor( url) {
	    super();
	    this.cid = "";   // get from the server  CID_RES
	    this.ip = "";    // get from the server  IAM_RES message.
	    this.socket = null;
	    this.url = url; // main server url
	    this.url2 = "";  // redirection url
	    this.url2closeCounter = 0;
	    this.state = STATES.CLOSED;  // Number type
	    this.stateName = this.getStateName(); // String type

	    this.txCounter = 0;
	    this.rxCounter = 0;
	    this.txBytes = 0;
	    this.rxBytes = 0;
	    
	    this.lastTxRxTime = Date.now();
	    this.connectionCheckerPeriod = SIZE_LIMIT.CONNECTION_CHECKER_PERIOD ; 
	    this.connectionCheckerIntervalID = null;

	    this.boho = new Boho();
	    this.TLS = false; // true if protocol is wss(TLS)
	    this.encMode = ENC_MODE.AUTO; 
	    this.useAuth = false;

	    this.nick = "";
	    this.channels = new Set();
	    this.promiseMap = new Map();
	    this.promiseTimeOut = SIZE_LIMIT.PROMISE_TIMEOUT;
	    this.mid = 0;  // promise message id 

	    this.level = 0; // also defaultQuotaLevel
	    this.quota = quotaTable[ this.level ];
	    this.serverSet = {};

	    this.linkMap = new Map();

	    this.on('open',this.onOpen.bind(this));
	    this.on('close',this.onClose.bind(this));
	    this.on('socket_data',this.onData.bind(this));
	    // this.on('auth_fail',this.onAuthFail.bind(this))
	    // this.on('server_signal', this.onServerSignal.bind(this))
	  }


	  // onAuthFail(event, reason){
	  // }

	  // onServerSignal(event, data ){
	  //   console.log('onServerSignal', event, data )
	  // }
	  
	  redirect(url){
	    this.url2 = url;
	    this.url2closeCounter = SIZE_LIMIT.REDIRECTION_CLOSE;
	    this.close();
	    this.open();
	  }

	  open(url ) {
	    if( !url && !this.url && !this.url2 ) return;
	    if( url ){
	        if( !this.url ){ // first connection
	          this.url = url;
	        }else if( url !== this.url ){ // main server change
	          this.url = url;
	          if( this.socket ){
	            this.close();
	            return
	          }
	        }
	    } 

	    let _url;
	    if( this.url2 ){
	      _url = this.url2;
	    }else if( this.url ){
	      _url = this.url;
	    }
	    
	    this.createConnection( _url);
	    if(!this.connectionCheckerIntervalID) this.connectionCheckerIntervalID = setInterval(this.keepAlive.bind(this), this.connectionCheckerPeriod);
	  }

	  onOpen( ){
	    if( this.url.includes("wss://" )){
	      this.TLS = true;
	    }
	    if(this.url2 ){
	      this.url2closeCounter = SIZE_LIMIT.REDIRECTION_CLOSE;
	    }
	    this.stateChange('open' );
	  }

	  onClose(){
	    this.boho.isAuthorized = false;
	    this.cid = "";
	    if(this.url2 ){
	      if(this.url2closeCounter < 0  ){
	        this.url2 = "";
	      }else {
	        this.url2closeCounter--;
	      }
	      // console.log('redirection close counter:', this.url2closeCounter)
	    }
	    this.stateChange('closed' );

	    // console.log('-- remote is closed:')
	  }

	  // manual login
	  login( id, key){
	    if( !id && !key){
	      console.log('no id and key.');
	      return
	    } 
	    console.log('manual login: ', id);

	    if( !key && id.includes('.') ){
	      this.boho.set_id_key(id);
	    }else if( id && key){
	      this.boho.set_id8(id);
	      this.boho.set_key(key);
	    }else {
	      console.log('no id or key.');
	      return
	    }
	    this.useAuth = true;
	    let auth_pack = this.boho.auth_req();
	    // console.log('auth_req_pack', auth_pack )
	    this.send(auth_pack );
	  }

	  // auto login
	  auth( id, key){
	    if( !id && !key){
	      console.log('no id and key.');
	      return
	    } 
	    // console.log('set auto auth: ', id)

	    if( !key && id.includes('.') ){
	      this.boho.set_id_key(id);
	    }else if( id && key){
	      this.boho.set_id8(id);
	      this.boho.set_key(key);
	    }else {
	      console.log('no id or key.');
	      return
	    }
	    this.useAuth = true;
	  }

	  onData( buffer$1 ){
	    // console.log('remote rcv socket_message', buffer )
	    //check first byte (remote message type)
	   let msgType = buffer$1[0];
	   let decoded;

	    if( msgType === BohoMsg.ENC_488 ){
	      decoded = this.boho.decrypt_488( buffer$1 );
	      if( decoded ){
	       //  console.log( decoded )
	        msgType = decoded[0];
	        buffer$1 = decoded; 
	        // console.log('DECODED MsgType:', RemoteMsg[ msgType ] )
	       }else {
	         console.log('DEC_FAIL', buffer$1.byteLength);
	       }
	     }else if( msgType === BohoMsg.ENC_E2E ){
	      // console.log('rcv ENC_E2E' )

	      try{
	        decoded = this.boho.decrypt_488( buffer$1 );
	        //헤더를 읽고 헤더크기만큼만 해석한다.
	        if( decoded ){
	          // console.log( 'ENC_E2E decoded ', decoded )
	          msgType = decoded[0];
	          // decoded has msg_header only. 
	          buffer$1.set( decoded ,MetaSize.ENC_488); // set decoded signal_e2e headaer.
	          buffer$1 = buffer$1.subarray( MetaSize.ENC_488 ); // reset offset.
	  // console.log('DECODED MsgType:', RemoteMsg[ msgType ] )
	          }else {
	            console.log('488 DEC_FAIL', buffer$1);
	            return
	          }

	      }catch(err){
	        console.log('E2E DEC_FAIL decryption error', err);
	        return
	      }

	     }

	    let type = RemoteMsg[ msgType ];
	    if( !type ) type = BohoMsg[ msgType ]; 

	// console.log( "MsgType: ", type , " LEN ", buffer.byteLength)

	   switch( msgType){
	      case RemoteMsg.OVER_SIZE :
	        console.log('## server sent: over_size event.');
	        this.emit('over_size','over_size');
	      break;
	      case RemoteMsg.PING :
	          this.pong();
	      break;

	      case RemoteMsg.PONG :
	      break;

	      case RemoteMsg.IAM_RES:
	          try {
	            let str = decoder.decode( buffer$1.subarray(1) );
	            let jsonInfo = JSON.parse(str); 
	            if( jsonInfo.ip ){
	              this.ip = jsonInfo.ip;
	            }
	            console.log('<IAM_RES>', JSON.stringify(jsonInfo));
	            // console.log('<IAM_RES>', JSON.stringify(jsonInfo,null,2))
	          } catch (error) {
	            console.log('<IAM_RES> data error');
	          }
	      break;

	    case RemoteMsg.CID_RES :
	      let cidStr = decoder.decode( buffer$1.subarray(1) );
	      // console.log( '>> CID_RES: ' ,cidStr )
	      this.cid = cidStr;
	      this.stateChange('ready','cid_ready' ); 
	      // change state before subscribe.
	      this.subscribe_memory_channels();
	      break;

	    case RemoteMsg.QUOTA_LEVEL :
	      let quotaLevel = buffer$1[1];
	      console.log( '>> QUOTA_LEVEL : ' ,quotaLevel );
	      this.level = quotaLevel;
	      this.quota = quotaTable[ quotaLevel ];
	      console.log('## current quota:', JSON.stringify(this.quota) );
	      break;

	    case RemoteMsg.SERVER_CLEAR_AUTH :
	      this.useAuth = false;
	      this.boho.clearAuth();
	      this.stop();
	      break;

	    case RemoteMsg.SERVER_REDIRECT :
	      // console.log( buffer.toString('hex'))
	      let host_port;
	      let url;
	      let protocol;
	      let addressType;
	      if( buffer$1.byteLength == 7){ // ipv4 ,port
	        addressType = 'IPV4:PORT';
	        host_port = byteToUrl( buffer$1.subarray(1)); 
	        protocol = 'cong://';
	      }else { // domain url
	        addressType= 'URL';
	        host_port = decoder.decode( buffer$1.subarray(1)); 
	        protocol = '';  // must included in url
	      }

	      url = protocol + host_port;

	      console.log(`REDIRECT TO <${addressType}> : ${url}` );
	      this.redirect(url);
	      break;

	    case RemoteMsg.SERVER_READY :
	      // console.log('>> SERVER_READY')
	      this.stateChange('server_ready','server_ready' );
	      if(this.useAuth){
	        this.send( this.boho.auth_req() );
	        // CID_REQ will be called, after auth_ack.
	      }else {
	        // CID_REQ here, if not using auth.
	        this.send( buffer.Buffer.from([RemoteMsg.CID_REQ])  );
	      }
	      break;
	    
	    case RemoteMsg.SERVER_SIGNAL:
	        try {
	          let str = decoder.decode( buffer$1.subarray(1) );
	          let ss = JSON.parse(str); 
	          console.log('SERVER_SIGNAL', JSON.stringify(ss));

	          if( ss.event && ss.data ){
	            this.serverSet = ss.data;
	            this.emit( ss.event , ss.data  );
	          }
	       
	        } catch (error) {
	          console.log('<SERVER_SIGNAL> parsing error');
	        }
	    break;

	    case RemoteMsg.SET:
	        try {
	          let setPack = unpack(buffer$1);
	          if(setPack ){
	            console.log('[SET] topic: ',setPack.topic );
	            this.emit( setPack.topic, ...setPack.args );
	          }
	        } catch (error) {
	          console.log('<SET> parsing error');
	        }
	    break;

	     case RemoteMsg.SIGNAL_E2E: 
	     case RemoteMsg.SIGNAL: 
	      try{
	          let tagLen = buffer$1.readUint8(1);
	          let tagBuf = buffer$1.subarray(2, 2 + tagLen );
	          let tag = decoder.decode(tagBuf);

	          let payloadType = buffer$1.readUint8( 2 + tagLen );
	          let payloadBuffer = buffer$1.subarray( 3 + tagLen );
	  
	          /* three types of signal message.
	            > unicast message to me:  tag includes @, no cid: '@*'
	            > cid_sub message:  tag includes cid and @ both : 'cid@*'
	            > ch_sub message:  else.
	          */


	          switch( payloadType ){

	            case PAYLOAD_TYPE.EMPTY:  // 0
	              if( tag.indexOf('@') === 0 )  this.emit( '@', null , tag);
	                else this.emit( tag, null , tag );
	              break;

	            case PAYLOAD_TYPE.TEXT: // 1
	            // !! Must remove null char before decode in JS.
	            // string payload contains null char for the c/cpp devices.
	              let payloadStringWithoutNull = payloadBuffer.subarray(0,payloadBuffer.byteLength - 1 );
	              let oneString = decoder.decode( payloadStringWithoutNull );
	              if( tag.indexOf('@') === 0 )  this.emit( '@', oneString , tag );
	              if( tag !== '@') this.emit( tag, oneString , tag );
	              break;
	              
	            case PAYLOAD_TYPE.BINARY: // 2
	              if( tag.indexOf('@') === 0 ) this.emit( '@', payloadBuffer , tag  );
	              if( tag !== '@') this.emit( tag, payloadBuffer , tag );
	              break;

	            case PAYLOAD_TYPE.OBJECT:
	              let oneObjectBuffer = decoder.decode( payloadBuffer );
	              let oneJSONObject = JSON.parse( oneObjectBuffer );
	              if( tag.indexOf('@') === 0 ) this.emit( '@', oneJSONObject , tag  );
	              if( tag !== '@') this.emit( tag, oneJSONObject , tag  );
	                break;
	                
	            case PAYLOAD_TYPE.MJSON: 
	              let mjsonBuffer = decoder.decode( payloadBuffer );
	              // console.log('raw mjson tag', tag)
	              // console.log('raw mjson', mjsonBuffer)
	              let mjson = JSON.parse( mjsonBuffer );
	              // console.log('parsed mjson', mjson)
	              if( tag.indexOf('@') === 0 ) this.emit( '@', ...mjson , tag  );
	              if( tag !== '@') this.emit( tag, ...mjson , tag  );
	              break;

	            case PAYLOAD_TYPE.MBA: 
	              let mbaObject = unpack( buffer$1 );
	              if( tag.indexOf('@') === 0 ) this.emit( '@', ...mbaObject.args , tag  );
	              if( tag !== '@') this.emit( tag, ...mbaObject.args , tag  );
	              break;

	            default:
	              console.log('## Unkown payloadtype', payloadType);

	          }


	        }catch(err){
	          console.log('## signal parse err',err);
	        }
	        break;


	      
	      case RemoteMsg.RESPONSE_MBP:
	        this.testPromise( buffer$1);
	        break;



	      case BohoMsg.AUTH_NONCE:
	        // console.log('auth_nonce', buffer )
	        let auth_hmac = this.boho.auth_hmac( buffer$1 );
	        if(auth_hmac){
	          this.send( auth_hmac );
	        }else {
	          this.stateChange('auth_fail', 'Invalid local auth_hmac.' );
	          console.log('auth_fail', 'Invalid local auth_hmac.' );
	        }
	        break;
	        case BohoMsg.AUTH_FAIL:
	          this.stateChange('auth_fail','server reject auth.' );
	          console.log('auth_fail', 'server reject auth.' );
	          break;
	          case BohoMsg.AUTH_ACK:
	            if(this.boho.check_auth_ack_hmac( buffer$1 ) ){
	              // this.emit('authorized' );   
	              this.stateChange('auth_ready','server sent auth_ack' );
	              this.send( buffer.Buffer.from([RemoteMsg.CID_REQ ]) );
	            }else {
	              // this.emit('auth_fail','invalid server hmac')
	              this.stateChange('auth_fail','invalid server_hmac' );
	              console.log('auth_fail', 'Invalid server hmac.' );
	        }
	        break;
	      
	      default:
	        try {
	            decoded = decoder.decode( buffer$1 );
	            // console.log('text message:', decoded)
	            this.emit('text_message', decoded);
	        } catch (error) {
	          
	        } 

	        break;

	    }
	  }

	  iam( title ){
	    // console.log('iam', title)
	    if(title ){
	      this.send_enc_mode(  pack( 
	          MB$1('#MsgType','8', RemoteMsg.IAM ) , 
	          MB$1('#', title )
	        ));
	    }else {
	      this.send_enc_mode(  pack( 
	          MB$1('#MsgType','8', RemoteMsg.IAM )
	        ));
	    }
	  }


	  ping(){
	    this.send( buffer.Buffer.from( [ RemoteMsg.PING ]));
	  }

	  pong(){
	    this.send( buffer.Buffer.from( [ RemoteMsg.PONG ]));
	  }


	  // application level ping tool.  
	  // simple message sending and reply.
	  echo( args ){
	    if(args ){
	      console.log( 'echo args:', args );
	      this.send_enc_mode(  pack( 
	        MB$1('#MsgType','8', RemoteMsg.ECHO ) , 
	        MB$1('#msg', args )
	      ));
	    }else {
	      // # do not encrypt blank echo #
	      this.send( buffer.Buffer.from([ RemoteMsg.ECHO ]));
	    }
	  }


	  bin(...data){
	    this.send( U8pack( ...data) );
	  }

	  send( data ){
	    if( data.byteLength > this.quota.signalSize ){
	      this.emit('over_size');
	      console.log('## QUOTA LIMIT OVER!! \nsignal message.byteLength: ', data.byteLength );
	      console.log('## your maximum signalSize(bytes) is:', this.quota.signalSize );
	      return
	    }
	    this.socket_send( data );
	  }

	  /*
	   Policy. Should message do encrypt?

	   if encMode == auto
	     NO. if connection using TLS line.
	        // ex. wss://url connection.
	     YES. if no TLS line.
	        // ex. ws://url connection.

	   if encMode == YES
	     YES. encrypt the message.

	   if encMode == NO
	     NO. do not ecnrypt message.

	  */
	  getEncryptionMode(){
	    if( this.encMode === ENC_MODE.YES || 
	      this.encMode === ENC_MODE.AUTO && 
	      !this.TLS && this.boho.isAuthorized
	      ){
	        return true;
	      }else {
	        return false
	      }
	  }

	  send_enc_mode( data ,useEncryption  ){
	    
	    // use default policy.
	    if( useEncryption === undefined){
	      useEncryption = this.getEncryptionMode();
	    }
	      
	    if( data[0] == RemoteMsg.SIGNAL_E2E && useEncryption){
	      // input data:  signal_header + e2ePayload
	      // encrypt signal_header area only. payload is encrypted with e2e key already.
	      let tagLen = data[1];
	      let encHeader = this.boho.encrypt_488( data.subarray(0, 3 + tagLen));
	      encHeader[0] = BohoMsg.ENC_E2E;
	      this.send( buffer.Buffer.concat([encHeader, data.subarray(3+tagLen) ]));
	      // console.log('<< send_enc_mode [ ENC_E2E ]')
	      
	    }else if( useEncryption ){
	      // console.log('<< send_enc_mode [ ENC_488 ]')
	      let encPack = this.boho.encrypt_488( data ); 
	      this.send( encPack );
	    }else {
	      // console.log('<< send_enc_mode  [ PLAIN ]' )
	      this.send( data );
	    }

	  }

	  
	  setMsgPromise(mid ){
	    return new Promise( (resolve, reject)=>{
	      this.promiseMap.set( mid, [resolve, reject ] );
	      // console.log('set promise.  mid, size', mid, this.promiseMap.size)
	      setTimeout( e=>{ 
	        if(this.promiseMap.has(mid )){
	          reject('timeout');
	          this.promiseMap.delete( mid );
	          // console.log('promise timeout. mid, size:', mid, this.promiseMap.size)
	        }
	      }, this.promiseTimeOut);
	    })
	  }

	  testPromise( buffer ){
	    // console.log('mbp buffer : ', buffer , buffer.byteLength)
	    // let mbp = ( buffer.byteLength > 4  ) ?  buffer.subarray(4) : ""

	    let res = unpack(buffer);
	    if( !res ) return
	    // console.log( res )

	    // console.log(`RESPONSE_MBP  MID: ${mid} status: ${status} ,mbp: ${ buffer.subarray(4)} `)

	    if( this.promiseMap.has(res.mid)){
	      // console.log('res promise msg', mid)
	      let [ resolve, reject ] = this.promiseMap.get( res.mid );
	      this.promiseMap.delete( res.mid );

	      if(res.status < 128){
	        res.ok = true;
	        // console.log( 'unpack meta:', meta)
	        resolve( res  );
	      } else {
	        res.ok = false ;
	        reject ( res );
	      } 

	      
	    }else {
	      console.log('no promise id');
	    }
	  }


	  publish( ...args ){
	      this.signal( ...args );
	  }


	  parsePayload( args ){
	    // console.log( 'parsePayload args', args )
	    let type, pack;
	    if( args.length == 0){
	      type = PAYLOAD_TYPE.EMPTY; 
	      pack = null;
	    }else if( args.length == 1){
	      if( typeof args[0] === 'string' || typeof args[0] === 'number'){
	       type = PAYLOAD_TYPE.TEXT;
	       pack = encoder.encode( args[0] + "."); // add null area.
	       pack[pack.byteLength - 1 ] = 0; // set null.

	      }else if( ArrayBuffer.isView( args[0]) || args[0] instanceof ArrayBuffer ){  //one buffer
	        type = PAYLOAD_TYPE.BINARY;
	        pack = B8( args[0 ] );
	      }else if(typeof args[0] === 'object'){ 
	        type = PAYLOAD_TYPE.OBJECT;
	        pack = encoder.encode( JSON.stringify( args[0]) );
	      }else {
	        //
	        console.log('unknown type payload arguments');
	      }
	    }else { // args 2 and more
	      let containsBuffer = false;
	      args.forEach( item =>{
	        if( ArrayBuffer.isView( item ) || item instanceof ArrayBuffer ) containsBuffer = true;
	        // console.log('payload item', item )
	      });

	      if( containsBuffer ){
	        type = PAYLOAD_TYPE.MBA;
	        // pack 
	      }else {
	        type = PAYLOAD_TYPE.MJSON;
	          // args is array
	        pack = encoder.encode( JSON.stringify( args ) );
	      }
	      
	    }
	    
	    return { type: type, buffer: pack }

	  }  

	  get_signal_pack( tag, ...args ){
	    if( typeof tag !== 'string') throw TypeError('tag should be string.')
	    let tagEncoded = encoder.encode( tag);
	    let payload = this.parsePayload( args );

	    let sigPack;
	    if( payload.type == PAYLOAD_TYPE.EMPTY ){
	      sigPack = pack( 
	        MB$1('#MsgType','8', RemoteMsg.SIGNAL) , 
	        MB$1('#tagLen','8', tagEncoded.byteLength),
	        MB$1('#tag', tagEncoded),
	        MB$1('#payloadType', '8', payload.type )
	        );
	    }else if( payload.type == PAYLOAD_TYPE.MBA ){
	      sigPack = pack( 
	        MB$1('#MsgType','8', RemoteMsg.SIGNAL) , 
	        MB$1('#tagLen','8', tagEncoded.byteLength),
	        MB$1('#tag', tagEncoded),
	        MB$1('#payloadType', '8', payload.type ),
	        MBA(...args)
	        );
	    }else {
	      sigPack = pack( 
	        MB$1('#MsgType','8', RemoteMsg.SIGNAL) , 
	        MB$1('#tagLen','8', tagEncoded.byteLength),
	        MB$1('#tag', tagEncoded),
	        MB$1('#payloadType', '8', payload.type ),
	        MB$1('#payload', payload.buffer )
	        );
	    }
	    return sigPack
	  }


	  signal( tag , ...args ){
	    if( typeof tag !== 'string') throw TypeError('tag should be string.')

	    let signalPack = this.get_signal_pack(tag, ...args );
	    this.send_enc_mode( signalPack );
	  }

	  decrypt_e2e( data, key ){
	   return this.boho.decrypt_e2e( data, key )
	  }

	  signal_e2e( tag , data, key){

	    if( typeof tag !== 'string') throw TypeError('tag should be string.')
	    let tagEncoded = encoder.encode( tag);
	    let dataPack = B8( data  );

	    //encrypt payload area with key
	    let sercretPack = this.boho.encrypt_e2e( dataPack, key );

	    //change signal MsgType header into SIGNAL_E2E
	    let signalPack = pack( 
	      MB$1('#MsgType','8', RemoteMsg.SIGNAL_E2E) , 
	      MB$1('#tagLen','8', tagEncoded.byteLength),
	      MB$1('#tag', tagEncoded),
	      MB$1('#payloadType', '8', PAYLOAD_TYPE.BINARY ),
	      MB$1('#payload', sercretPack )
	      );

	    this.send_enc_mode( signalPack );
	  }
	    
	    
	  
	  set( storeName, ...args ){
	    if( !storeName || args.length == 0 ){
	      return Promise.reject(new Error('set need storeName and value)'))
	    } 
	    return this.req('store', 'set', storeName, ...args )
	  }
	  
	  async get( storeName ){
	    if( !storeName ){
	      return Promise.reject(new Error('store get need storeName)'))
	    } 
	    let pack = await this.req('store', 'get', storeName );
	    let { $ } = unpack(pack.body);
	    return $
	  }
	  
	  
	  req( target, topic, ...args ){
	    // console.log('common_req args', args)
	    if( !target || !topic) 
	      return Promise.reject(new Error('request need target and topic)'))
	    let sigPack;
	    if(args.length > 0){
	        sigPack = pack( 
	        MB$1('#MsgType','8', RemoteMsg.REQUEST) ,
	        MB$1('mid','16',++this.mid), 
	        MB$1('target', target ), 
	        MB$1('topic', topic ), 
	        MBA(  ...args )
	        );
	    }else {
	        sigPack = pack( 
	        MB$1('#MsgType','8', RemoteMsg.REQUEST) ,
	        MB$1('mid','16',++this.mid), 
	        MB$1('target', target ), 
	        MB$1('topic', topic )
	        );
	    }
	    // console.log('<< adminPack', this.mid, sigPack)
	    this.send_enc_mode(  sigPack  );
	    return this.setMsgPromise( this.mid )
	  }


	  subscribe(tag ){
	    if( typeof tag !== 'string') throw TypeError('tag should be string.')
	    if( this.state !== STATES.READY ) return 

	    let tagList = tag.split(',');
	    tagList.forEach( tag=>{
	      this.channels.add(tag);
	    });

	    let tagEncoded = encoder.encode( tag); 
	    if( tagEncoded.byteLength > SIZE_LIMIT.TAG_LEN1 ) throw TypeError('please use tag string bytelength below:' + SIZE_LIMIT.TAG_LEN1 )

	    this.send_enc_mode( 
	      buffer.Buffer.concat( [
	        NB('8',RemoteMsg.SUBSCRIBE),  
	        NB('8', tagEncoded.byteLength), 
	        tagEncoded ]) );
	  }

	  subscribe_promise(tag){
	    if( typeof tag !== 'string') throw TypeError('tag should be string.')
	    if( this.state !== STATES.READY ){
	      console.log('not ready state:', this.state );
	      return Promise.reject('subscribe_promise:: connection is not ready')
	    }

	    let tagEncoded = encoder.encode( tag); 
	    if( tagEncoded.byteLength > SIZE_LIMIT.TAG_LEN2 ) throw TypeError('please use tag string bytelength: ' + SIZE_LIMIT.TAG_LEN2)

	    this.send_enc_mode( 
	      buffer.Buffer.concat( [
	        NB('8',RemoteMsg.SUBSCRIBE_REQ),  
	        NB('16', ++this.mid), 
	        NB('16', tagEncoded.byteLength), 
	        tagEncoded ]) );
	    return this.setMsgPromise( this.mid )
	  }

	  subscribe_memory_channels( ){ //local cache . auto_resubscribe
	    if(this.channels.size == 0) return
	    let chList = Array.from( this.channels).join(',');
	    // console.log('<< subscibe memory channels by cid', chList , this.cid )

	    this.subscribe_promise( chList)
	    .then( (res )=>{ 
	      // console.log('>> SUBSCRIBE_REQ result', res ) // return code == map.size
	    }).catch( (e)=>{
	      console.log('>> SUBSCRIBE FAIL:', e);
	    }); 

	  }

	  unsubscribe(tag = ""){
	    // console.log('unsub', tag)
	    if( typeof tag !== 'string') throw TypeError('tag should be string.')
	    
	    if(tag == ""){
	      // console.log('unsub all')
	      this.channels.clear();
	    }else {
	      let tagList = tag.split(',');
	      tagList.forEach( tag=>{
	        this.channels.delete(tag);
	      });
	    }

	    let tagEncoded = encoder.encode( tag); 
	    if( tagEncoded.byteLength > SIZE_LIMIT.TAG_LEN1 ) throw TypeError('please use tag string bytelength below:' + SIZE_LIMIT.TAG_LEN1 )

	    this.send_enc_mode( buffer.Buffer.concat( [
	      NB('8',RemoteMsg.UNSUBSCRIBE),  
	      NB('8', tagEncoded.byteLength), 
	      tagEncoded ]) );
	  }


	  listen(tag , handler){
	    if( typeof tag !== 'string') throw TypeError('tag should be string.')
	    if( tag.length > 255 || tag.length == 0 ) throw TypeError('tag string length range: 1~255')
	    if( typeof handler !== 'function') throw TypeError('handler is not a function.')
	    
	    if( tag.indexOf('@') !== 0){
	      this.channels.add(tag); 
	    }
	    // console.log('channels:', this.channels )
	    this.on( tag , handler);
	    // do not subscribe now.
	    // will subscribe when receive CID_RES signal from server.
	  
	  }



	  link( to , tag , handler){
	    if( typeof to !== 'string') throw TypeError('to(local link target) is not a string.')
	    if( typeof tag !== 'string') throw TypeError('tag is not a string.')
	    if( tag.length > 255 || tag.length == 0 ) throw TypeError('tag string length range: 1~255')
	    if( typeof handler !== 'function') throw TypeError('handler is not a function.')
	    
	    if( tag.indexOf('@') !== 0){
	      this.channels.add(tag); 
	    }
	    
	    let linkSet;
	    if( this.linkMap.has(to) ){
	      linkSet = this.linkMap.get(to);
	    }else {
	      linkSet = new Set();
	    }
	    
	    linkSet.add(tag );
	    this.linkMap.set( to, linkSet);
	    this.on( tag , handler);
	    this.subscribe( tag );
	    // console.log('link [to] linkMap:', to, this.linkMap )
	  
	  }
	  

	  unlink( to, tag){
	    if( typeof to !== 'string') throw TypeError('to(local link target) is not a string.')
	    if( typeof tag !== 'string') throw TypeError('tag is not a string.')
	    if( tag.length > 255 || tag.length == 0 ) throw TypeError('tag string length range: 1~255')
	    
	    if( !this.linkMap.has( to ) ) return;

	    let linkSet = this.linkMap.get(to);
	    let tags = Array.from(linkSet);
	    for(let i=0; i< tags.length; i++){
	      if( tags[i] == tag ){
	        this.unsubscribe( tag );
	        this.removeAllListeners(tag);
	        linkSet.delete(tag);
	        this.linkMap.set( to , linkSet);
	        break;
	      }
	    }

	    // console.log('unlink linkMap result:', this.linkMap )
	  }

	  unlinkAll( to){
	    if( typeof to !== 'string') throw TypeError('to(local link target) is not a string.')
	    if( !this.linkMap.has( to ) ) return;

	    let linkSet = this.linkMap.get(to);
	    let tags =  Array.from(linkSet);
	    for(let i=0; i< tags.length; i++){
	        this.unsubscribe( tags[i] );
	        this.removeAllListeners(tags[i]);
	        linkSet.delete(tags[i]);
	    }
	    this.linkMap.delete( to );

	    // console.log('unlinkAll linkMap result:', this.linkMap )
	  }



	  getMetric(){
	    return { 
	      tx: this.txCounter, 
	      rx: this.rxCounter, 
	      txb: this.txBytes, 
	      rxb: this.rxBytes,
	      last: ( Date.now() - this.lastTxRxTime) / 1000
	    }

	  }

	  getState(){
	    return this.state
	  }

	  getStateName(){ 
	    //state <number>
	    //value of constant STATES.NAME < number >
	    //type of constant STATES.NAME name < string uppercase >
	    //stateName,eventName <string lowercase>
	    return ( STATES[ this.state ]).toLowerCase()
	  }

	  getSecurity(){
	    return {
	      useAuth: this.useAuth,
	      isTLS: this.TLS, 
	      isAuthorized: this.boho.isAuthorized,
	      encMode: this.encMode,
	      usingEncryption: this.getEncryptionMode()
	    }
	  }

	  stateChange(state, emitEventAndMessage ){
	    // STATES constant name : string upperCase
	    // eventName, .stateName : string lowerCase
	    // .state : number
	    let eventName = state.toLowerCase();
	    this.state = STATES[ state.toUpperCase() ]; // state: number
	    if(emitEventAndMessage) this.emit(eventName, emitEventAndMessage);
	    
	    if( this.stateName !== eventName ){
	      // console.log(`change: ${this.stateName} => ${eventName}` )
	      this.emit('change', eventName);
	      this.stateName = eventName;
	    } 
	  }
	 
	}

	// Browser WebSocket
	class Remote extends RemoteCore{
	  constructor(url  ) {
	    super(url);
	    document.addEventListener('visibilitychange', this.browserVisiblePing.bind(this));
	    if(url) this.open();
	  }

	  browserVisiblePing(){
	    if (document.visibilityState === 'visible') {
	      console.log('[Remote connection check] visibilityState is visible.');
	      this.ping();
	    }
	  }

	  
	  close() {
	    this.socket?.close();
	    this.socket = null;
	  }

	  stop(){
	    this.close();
	    clearInterval(this.connectionCheckerIntervalID);
	    this.connectionCheckerIntervalID = null;
	  } 
	  
	  
	  keepAlive() {
	    if ( !this.socket || this.socket?.readyState === 3 ) { //closed
	      this.open();
	    }
	  }

	  createConnection(url){
	    // Web Browser WebSocket
	    this.socket = new WebSocket (url );
	    this.stateChange('opening');

	    this.socket.binaryType = "arraybuffer";
	    this.socket.onopen = () => {
	      this.socket.onmessage = this.onWebSocketMessage.bind(this) ;
	      this.emit('open' );
	    };

	    this.socket.onerror = (e)=>{ 
	      this.emit('error', e);
	    };

	    this.socket.onclose = ()=>{ 
	      this.emit('close' );
	    };
	  }

	  onWebSocketMessage( event ) {
	    this.rxCounter++;
	    this.lastTxRxTime = Date.now();
	    let buffer$1;

	    // if( event.data instanceof ArrayBuffer ){
	    //   //binary frame
	    // }else{
	    //   //text frame
	    // }
	    buffer$1 = buffer.Buffer.from( event.data );
	    this.rxBytes += buffer$1.byteLength;

	    this.emit('socket_data', buffer$1  );
	  }

	  socket_send(data) {  
	    if( this.socket?.readyState === 1 ){ //open
	      // console.log('websocket send', data)
	      this.socket.send( data );
	      this.txCounter++;
	      this.txBytes += data.byteLength;
	      this.lastTxRxTime = Date.now();
	    }else {
	      console.log('.');
	    }
	  }
	 
	}

	Boho.RAND = RAND;
	Boho.BohoMsg = BohoMsg;
	Boho.Meta = Meta;
	Boho.MetaSize = MetaSize;
	Boho.sha256 = sha256;
	Remote.Boho = Boho;
	Remote.MBP = MBP;
	Remote.Buffer = buffer.Buffer;

	return Remote;

}));
//# sourceMappingURL=remote-signal.js.map
