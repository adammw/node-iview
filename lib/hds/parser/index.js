var bignum = require('bignum');
var debug = require('debug')('iview:hds:parser');
require('buffertools');

// Monkey-patch Buffer for uint24 support
Buffer.prototype.readUInt24BE = function(offset) {
  return (this.readUInt8(offset) << 16) + (this.readUInt8(offset+1) << 8) + this.readUInt8(offset+2);
}
Buffer.prototype.writeUInt24BE = function(value, offset) {
  this[offset + 2] = value & 0xff;
    this[offset + 1] = value >> 8;
    this[offset] = value >> 16;
}
// Monkey-patch Buffer for C-string (NULL-terminated) support
Buffer.prototype.readCString = function(offset, encoding) {
  var buf = this;
  var end = buf.indexOf('\0', offset);
  return {
    str: buf.slice(offset, end).toString(encoding),
    end: (end+1)
  };
}

var Box = module.exports = function() {
  this.size = null;
  this.type = null;
  this.data = null;
};
Box.parse = function(buf) {
  var box = new Box();
  box.size = buf.readUInt32BE(0);
  box.type = buf.slice(4, 8).toString();
  var offset = 8;
  if (box.size == 1) {
    box.size = bignum.fromBuffer(buf.slice(8, 16), { size: 8 });
    offset += 8;
  }
  var data = buf.slice(offset);
  debug('parsers loaded for: %s', Object.keys(BoxParsers).join(', '));
  if (BoxParsers[box.type]) {
    debug('found parser for %s box type', box.type)
    box.data = BoxParsers[box.type].parse(data);
  } else {
    debug('no parser found for %s box type', box.type);
    box.data = data;
  }
  return box;
}

var BoxParsers = {
  'abst': require('./abst'),
  'asrt': require('./asrt'),
  'afrt': require('./afrt'),
};