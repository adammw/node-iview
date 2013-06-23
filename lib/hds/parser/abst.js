var bignum = require('bignum');
var debug = require('debug')('iview:hds:parser:abst');
var Box = require('./');

var AbstBox = module.exports = function() {
  this.version = null;
  this.flags = null;
  this.bootstrapVersion = null;
  this.profile = null;
  this.live = null;
  this.update = null;
  this.timescale = null;
  this.currentMediaTime = null;
  this.smpteTimeCodeOffset = null;
  this.movieIdentifier = null;
  this.serverEntries = null;
  this.qualityEntries = null;
  this.drmData = null;
  this.metadata = null;
  this.segTable = null;
  this.fragTable = null;
}
AbstBox.parse = function(buf) {
  debug('AbstBox.parse(%j)', buf);
  var box = new AbstBox();
  box.version = buf.readUInt8(0);
  box.flags = buf.readUInt24BE(1);
  box.bootstrapVersion = buf.readUInt32BE(4);
  var byte = buf.readUInt8(8);
  box.profile = (byte & 0xc0) >> 6;
  box.live = (byte & 0x20) >> 5;
  box.update = (byte & 0x10) >> 4;
  box.timescale = buf.readUInt32BE(9);
  box.currentMediaTime = bignum.fromBuffer(buf.slice(13, 21), { size: 8 });
  box.smpteTimeCodeOffset = bignum.fromBuffer(buf.slice(21, 29), { size: 8 });
  var movieIdentifierString = buf.readCString(29);
  box.movieIdentifier = movieIdentifierString.str;
  var offset = movieIdentifierString.end;
  var serverEntryCount = buf.readUInt8(offset++);
  box.serverEntries = []
  for (var i = 0; i < serverEntryCount; i++) {
    var serverEntry = buf.readCString(offset);
    offset = serverEntry.end;
    box.serverEntries.push(serverEntry.str);
  }
  var qualityEntryCount = buf.readUInt8(offset++);
  box.qualityEntries = [];
  for (var i = 0; i < qualityEntryCount; i++) {
    var qualityEntry = buf.readCString(offset);
    offset = qualityEntry.end;
    box.qualityEntries.push(qualityEntry.str);
  }
  var drmData = buf.readCString(offset);
  box.drmData = drmData.str;
  offset = drmData.end;

  var metadata = buf.readCString(offset);
  box.metadata = metadata.str;
  offset = metadata.end;

  var segRunTableCount = buf.readUInt8(offset++);
  debug('will parse %d children as segments', segRunTableCount);
  box.segTable = [];
  for (var i = 0; i < segRunTableCount; i++) {
    var childBox = Box.parse(buf.slice(offset));
    box.segTable.push(childBox);
    offset += childBox.size;
  }
  debug('%d children parsed as segments', box.segTable.length);

  var fragRunTableCount = buf.readUInt8(offset++);
  debug('will parse %d children as fragments', segRunTableCount);
  box.fragTable = [];
  for (var i = 0; i < fragRunTableCount; i++) {
    var childBox = Box.parse(buf.slice(offset));
    box.fragTable.push(childBox);
    offset += childBox.size;
  }
  debug('%d children parsed as fragments', box.fragTable.length);

  return box;
}