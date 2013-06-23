var url = require('url');
var request = require('request');
var xml2js = require('xml2js');
var crypto = require('crypto');
var qs = require('querystring');
var debug = require('debug')('iview:hds:video');
var boxParser = require('./parser');
var config = require('../config');
var AkamaiHDSMedia = require('./media');
var AkamaiHDKey = new Buffer(config.akamaiHD, 'base64');

var AkamaiHDSVideo = module.exports = function(data) {
  if (!(this instanceof AkamaiHDSVideo)) return new AkamaiHDSVideo(data);

  debug('creating AkamaiHDSVideo obj - %j', data);

  this.manifestUrl = data.manifestUrl || null;
  this.baseUrl = data.baseUrl || null;
  this.playerHash = data.playerHash || config.playerHash || null;
  this._manifest = null;
};
AkamaiHDSVideo.prototype.generatePlayerVerificationToken = function(fn) {
  if (!this.playerHash || !AkamaiHDKey)
    throw new Error('Player Hash or AkamaiHDKey not set - cannot generate pvtoken!')

  var self = this;
  if(!this._manifest) {
    return this.getManifest(function(err){
      if (err) return fn(err);
      self.generatePlayerVerificationToken(fn);
    });
  }
  
  var pv = this._manifest['pv-2.0'][0].split(';');
  debug('pv-2.0: pv = %s, hdntl = %s', pv[0], pv[1])
  var pvtoken = 'st=0~exp=9999999998~acl=*~data=' + pv[0] + '!' + this.playerHash;
  var hmac = crypto.createHmac('sha256', AkamaiHDKey)
  hmac.update(pvtoken);
  pvtoken += '~hmac=' + hmac.digest('hex');
  debug('calculated pvtoken - %s', pvtoken);

  var ret = qs.parse(pv[1]);
  ret.pvtoken = pvtoken;
  fn(null, ret);
}
AkamaiHDSVideo.prototype.getManifest = function(fn) {
  debug('getManifest - %s', this.manifestUrl);

  if (this._manifest) {
    debug('using cached manifest data');
    fn(null, this._manifest);
  }

  var self = this;
  request(this.manifestUrl, function(err, res, body) {
    if (err) return fn(err);
    if (res.statusCode != 200) return fn(new Error('Could not download xml'))

    xml2js.parseString(body, function(err, result) {
      if (err) return fn(err)
      if (!result.manifest) return fn(new Error('Invalid manifest response'));
      
      self._manifest = result.manifest;
      debug('retrieved manifest - %j', self._manifest);
      fn(null, self._manifest);
    })
  })
};
AkamaiHDSVideo.prototype.getMedia = function(fn) {
  debug('getMedia');
  var self = this;

  if(!this._manifest) {
    return this.getManifest(function(err){
      if (err) return fn(err);
      self.getMedia(fn);
    });
  }

  var bootstrapList = {};
  this._manifest.bootstrapInfo.forEach(function(bootstrap){
    bootstrapList[bootstrap.$.id] = boxParser.parse(new Buffer(bootstrap._, 'base64'));
  });

  var baseUrl = this._manifest.baseURL || this.baseUrl;
  this.generatePlayerVerificationToken(function(err, token){
    var media = [];
    self._manifest.media.forEach(function(mediaInfo) {
      var mediaObj = new AkamaiHDSMedia({
        id: self._manifest.id + '/' + mediaInfo.$.url,
        bitrate: mediaInfo.$.bitrate,
        url: mediaInfo.$.url,
        baseUrl: baseUrl,
        bootstrap: bootstrapList[mediaInfo.$.bootstrapInfoId],
        duration: self._manifest.duration[0],
        token: token
      });
      media.push(mediaObj);
    })
    debug('found %d media renditions for video', media.length)

    fn(null, media);
  })
}