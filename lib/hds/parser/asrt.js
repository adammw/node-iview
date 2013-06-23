var AsrtBox = module.exports = function() {
  this.version = null;
  this.flags = null;
  this.qualitySegmentUrlModifiers = null;
  this.segments = null;
}
AsrtBox.parse = function(buf) {
  var box = new AsrtBox();
  box.version = buf.readUInt8(0);
  box.flags = buf.readUInt24BE(1);
  var qualityEntryCount = buf.readUInt8(4);
  var offset = 5;
  box.qualitySegmentUrlModifiers = [];
  for (var i = 0; i < qualityEntryCount; i++) {
    var qualitySegmentUrlModifier = buf.readCString(offset);
    box.qualitySegmentUrlModifiers.push(qualitySegmentUrlModifier.str);
    offset = qualitySegmentUrlModifier.end;
  }
  var segCount = buf.readUInt32BE(offset);
  offset += 4;
  box.segments = [];
  for (var i = 0; i < segCount; i++) {
    firstSegment = buf.readUInt32BE(offset);
    fragmentsPerSegment = buf.readUInt32BE(offset+4);
    box.segments.push({
      firstSegment: firstSegment,
      fragmentsPerSegment: fragmentsPerSegment
    });
    offset += 8;
  }
  return box;
}