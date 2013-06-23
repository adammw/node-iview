var bignum = require('bignum');

var AfrtBox = module.exports = function() {
  this.version = null;
  this.flags = null;
  this.timescale = null;
  this.qualitySegmentUrlModifiers = null;
  this.fragments = null;
}
AfrtBox.parse = function(buf) {
  var box = new AfrtBox();
  box.version = buf.readUInt8(0);
  box.flags = buf.readUInt24BE(1);
  box.timescale = buf.readUInt32BE(4);
  var qualityEntryCount = buf.readUInt8(8);
  var offset = 9;
  box.qualitySegmentUrlModifiers = [];
  for (var i = 0; i < qualityEntryCount; i++) {
    var qualitySegmentUrlModifier = buf.readCString(offset);
    box.qualitySegmentUrlModifiers.push(qualitySegmentUrlModifier.str);
    offset = qualitySegmentUrlModifier.end;
  }
  var fragEntries = buf.readUInt32BE(offset);
  offset += 4;
  box.fragments = [];
  for (var i = 0; i < fragEntries; i++) {
    var fragEntry = {
      firstFragment: buf.readUInt32BE(offset),
      firstFragmentTimestamp: bignum.fromBuffer(buf.slice(offset+4, offset+12), { size: 8 }),
      fragmentDuration: buf.readUInt32BE(offset+12),
      discontinuityIndicator: null
    };
    offset += 16;
    if (fragEntry.fragmentDuration == 0)
      fragEntry.discontinuityIndicator = buf.readUInt8(offset++);
    box.fragments.push(fragEntry);
  }
  return box;
}