var _ = require('underscore');
var url = require('url');
var debug = require('debug')('iview:hds:media');
var request = require('request');
var stream = require('stream');
var Readable = stream.Readable;

var AkamaiHDSMedia = module.exports = function(data) {
  if (!(this instanceof AkamaiHDSMedia)) return new AkamaiHDSMedia(data);

  debug('creating AkamaiHDSMedia obj - %j', data);
  this.id = data.id || null;
  this.bitrate = data.bitrate || null;
  this.url = data.url || null;
  this.baseUrl = data.baseUrl || null;
  this.bootstrap = data.bootstrap || null;
  this.duration = data.duration || null;
  this.token = data.token || null;
}
AkamaiHDSMedia.prototype.getFragmentUrl = function(id) {
  var urlObj = url.parse(this.baseUrl);
  urlObj.pathname = url.resolve(urlObj.pathname + '/', this.url + 'Seg1-Frag' + id)
  if (this.token)
    urlObj.query = _.extend(urlObj.query || {}, this.token);
  return url.format(urlObj);
}
AkamaiHDSMedia.prototype.getFragment = function(id, fn) {
  debug('getFragment(%d)', id)

  var fragmentUrl = this.getFragmentUrl(id);
  debug('fragmentUrl = %s', fragmentUrl);

  var req = request(fragmentUrl);
  var stream = new Readable().wrap(req);
  fn(null, stream);
}