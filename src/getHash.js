/**
 * djb2 string hash implementation based on string-hash module:
 * https://github.com/darkskyapp/string-hash
 */
 function hash(str) {
  var hashStr = 5381;
  var i = str.length;

  while (i) {
    hashStr = (hashStr * 33) ^ str.charCodeAt(--i);
  }
  return hashStr >>> 0;
}

/**
 * base62 encode implementation based on base62 module:
 * https://github.com/andrew/base62.js
 */
var CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function encode(integer) {
  if (integer === 0) return '0';

  var str = '';
  while (integer > 0) {
    str = CHARS[integer % 62] + str;
    integer = Math.floor(integer / 62);
  }
  return str;
}

module.exports = function(content){
  return encode(hash(content||''));
}