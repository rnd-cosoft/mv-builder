var $ = require('gulp-load-plugins')({lazy: true});
var Stream = require('stream');
var colors = $.util.colors;

function Utils() {

  this.requireJsPaths = null;
  this.log = log;
  this.addTimestampComment = addTimestampComment;
  this.getLibPaths = getLibPaths;
  this.isNotPrivate = isNotPrivate;
  this.createLibsAllContent = createLibsAllContent;
  this.createLibsConfigContent = createLibsConfigContent;
  this.insertLibPaths = insertLibPaths;

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

  /**
   * @desc A function which filters private files out. Private files contain underscores.
   * @param file
   * @returns {boolean}
   */
  function isNotPrivate(file){
    return !/^_/.test(file.path.split('/').pop());
  }

  /**
   * @desc Gets libs paths from main file
   * @param {Object} file
   * @returns {Array}
   */
  function getLibPaths(file) {
    var content = String(file.contents),
      start = /\/\* libs-paths:start \*\//gim,
      end = /\/\* libs-paths:end \*\//gim;

    var libPathsSegment = '';
    var split = content.split(start);
    var splitTwo;
    split.forEach(function(item) {
      if(item.match(end)) {
        splitTwo = item.split(end);
        libPathsSegment += splitTwo[0];
      }
    });

    var libKeys = [];
    var objectKeyMatcher = /('|").*('|") *:/gi;
    var matches = libPathsSegment.match(objectKeyMatcher);
    matches.forEach(function(key) {
      libKeys.push(key.replace(/'/g, '').replace(':', ''));
    });

    return libKeys;
  }

  /**
   * @desc Creates libs.all.js content based on lib keys from file.data.libs array
   * @returns {Object}
   */
  function createLibsAllContent() {
    var stream = new Stream.Transform({objectMode: true});

    stream._transform = function(file, unused, callback) {
      var fileContents = [
        'define([\n',
        '], function() {});'
      ];

      if (file.data) {
        file.data.libs.forEach(function(lib) {
          if (lib) {
            fileContents[0] += "'" + lib + "',\n";
          }
        });
        file.contents = new Buffer(fileContents.join(''));
      }

      callback(null, file);
    };

    return stream;
  }

  /**
   * Creates libs.config.js content based on lib keys from file.data.libs array
   * @returns {Object}
   */
  function createLibsConfigContent() {
    var stream = new Stream.Transform({objectMode: true});

    stream._transform = function(file, unused, callback) {
      var fileContents = [
        'module.exports = function () {\n',
        'return [\n',
        '];\n};'
      ];

      if (file.data) {
        file.data.libs.forEach(function(lib) {
          if (lib) {
            fileContents[1] += "'" + lib + "',\n";
          }
        });
        file.contents = new Buffer(fileContents.join(''));
      }

      callback(null, file);
    };

    return stream;
  }

  /**
   * @desc Inserts lib paths to file content from file.data.libs
   * @returns {Object}
   */
  function insertLibPaths() {
    var stream = new Stream.Transform({objectMode: true});

    stream._transform = function(file, unused, callback) {
      var content = String(file.contents);
      var libs = '';

      if (file.data) {
        file.data.libs.forEach(function(lib) {
          if (lib) {
            libs += "'" + lib + "',\n";
          }
        });
        content = content.replace(/\/\* build:insert-libs-here \*\//gi, libs);

        file.contents = new Buffer(content);
      }

      callback(null, file);
    };

    return stream;
  }


}

module.exports = new Utils();