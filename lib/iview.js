var path = require('path');
var request = require('request');
var xml2js = require('xml2js');
var debug = require('debug')('iview');
var urlparse = require('url').parse;
var config = require('./config');
var AkamaiHDSVideo = require('./hds/video');

var getBaseUrl = function(url) {
  url = urlparse(url)
  return path.dirname(url.protocol + '//' + url.host + url.pathname);
}

var iView = module.exports = function() {
  if (!(this instanceof iView)) return new iView();
  this.auth = null;
};
iView.prototype.getAuth = function(fn) {
  debug('getAuth');

  var self = this;
  if (this.auth) return fn(null, this.config);

  request(config.authUrl, function(err, res, body) {
    if (err) return fn(err);
    if (res.statusCode != 200) return fn(new Error('Could not download auth xml'))
    xml2js.parseString(body, function(err, result) {
      if (err) fn(err);
      if (!result.iview) return fn(new Error('Invalid authentication response'));

      self.auth = result.iview;
      debug('retrieved auth - %j', self.auth);
      fn(null, self.auth);
    })
  })
};
iView.prototype.getManifestUrl = function(videoPath) {
  return this.auth.server[0] + this.auth.path[0] + videoPath + '/manifest.f4m?hdcore=true&hdnea=' + this.auth.tokenhd[0];
};
iView.prototype.isHDS = function() {
  if (!this.auth) return null;
  debug('auth server: %s',this.auth.server[0]);
  return ('http:' == urlparse(this.auth.server[0]).protocol);
}
iView.prototype.getVideo = function(videoPath, fn) {
  var self = this;
  if (!this.auth) {
    this.getAuth(function(err) {
      if (err) return fn(err);
      self.getVideo(videoPath, fn);
    });
    return;
  }

  if (this.isHDS()) {
    var manifestUrl = this.getManifestUrl(videoPath);
    var baseUrl = getBaseUrl(manifestUrl);
    var video = new AkamaiHDSVideo({
      manifestUrl: manifestUrl,
      baseUrl: baseUrl
    });
    fn(null, video);
  } else {
    fn(new Error('TODO: implement RTMP streaming'));
  }
} 