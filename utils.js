var $ = require('gulp-load-plugins')({lazy: true});
var Stream = require('stream');
var colors = $.util.colors;

function Utils() {

  this.requireJsPaths = null;
  this.log = log;
  this.addTimestampComment = addTimestampComment;
  this.getRequireJsConfigPaths = getRequireJsConfigPaths;
  this.replaceRequireJsConfigPaths = replaceRequireJsConfigPaths;

  /**
   * @desc Log a message or series of messages using chalk's blue color.
   * Can pass in a string, object or array.
   */
  function log(msg) {
    if (typeof(msg) === 'object') {
      for (var item in msg) {
        if (msg.hasOwnProperty(item)) {
          $.util.log($.util.colors.blue(msg[item]));
        }
      }
    } else {
      $.util.log($.util.colors.blue(msg));
    }
  }

  /**
   * @desc Replaces require js config paths
   * @returns {Object}
   */
  function replaceRequireJsConfigPaths() {
    var pathsObject = this.requireJsPaths;
    var stream = new Stream.Transform({objectMode: true});

    stream._transform = function(file, unused, callback) {
      var content = String(file.contents),
        start = /\/\*\* requirejs-config-paths:start \*\*\//gim,
        end = /\/\*\* requirejs-config-paths:end \*\*\//gim;

      var final = '';
      var split = content.split(start);
      var temp, splitTwo;

      for(var key in pathsObject) {
        pathsObject[key] = './' + key;
      }

      for(var i = 0; i < split.length; i++) {
        if(split[i].match(end)) {
          splitTwo = split[i].split(end);
          splitTwo[0] = JSON.stringify(pathsObject) + ',';
          temp = splitTwo.join('');
          split[i] = 'paths: ' + temp.replace(/\.js/g, '').replace(/"/g, '\'');
          break;
        }
      }

      final = split.join('');

      file.contents = new Buffer(final);

      callback(null, file);
    };

    return stream;
  }

  /**
   * @desc Gets require js config paths from main file
   * @returns {Object}
   */
  function getRequireJsConfigPaths() {
    var that = this;
    var stream = new Stream.Transform({objectMode: true});

    stream._transform = function(file, unused, callback) {
      var content = String(file.contents),
        start = /\/\*\* requirejs-config-paths:start \*\*\//gim,
        end = /\/\*\* requirejs-config-paths:end \*\*\//gim;

      var final = '';
      var split = content.split(start);
      var splitTwo;
      split.forEach(function(item) {
        if(item.match(end)) {
          splitTwo = item.split(end);
          final += splitTwo[0];
        }
      });

      final = final.substring(10, final.length - 4);
      final = final.replace(/'/gi, '"');
      file.contents = new Buffer(final);

      callback(null, file);
      that.requireJsPaths = JSON.parse(final);
    };

    return stream;
  }

  /**
   * @desc Adds timestamp to the end of the file
   */
  function addTimestampComment() {
    var stream = new Stream.Transform({objectMode: true});

    stream._transform = function(file, unused, callback) {
      var content = String(file.contents),
        final;

      final = content + '/* ' + new Date().getTime() + ' */';

      file.contents = new Buffer(final);

      callback(null, file);
    };

    return stream;
  }
}

module.exports = new Utils();