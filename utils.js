var $ = require('gulp-load-plugins')({lazy: true});
var Stream = require('stream');

function Utils() {
  var that = this;
  that.log = log;
  that.addTimestampComment = addTimestampComment;
  that.isNotPrivate = isNotPrivate;
  that.insertObjectKey = insertObjectKey;

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
   * @param {Object} file
   * @returns {boolean}
   */
  function isNotPrivate(file){
    return !/^_/.test(file.path.split('/').pop());
  }

  /**
   * @desc Inserts stringified object as key value in file by placeholder regexp
   * @param {string} key
   * @param {Object} objectToInsert
   * @param {Object} placeholderRegex
   * @returns {Object}
   */
  function insertObjectKey(key, objectToInsert, placeholderRegex) {
    var stream = new Stream.Transform({objectMode: true});

    stream._transform = function(file, unused, callback) {
      var content = String(file.contents);
      var textToInsert = key + ': ';

      textToInsert += JSON.stringify(objectToInsert) + ',';
      textToInsert = textToInsert.replace(/],/g, '],\n');
      content = content.replace(placeholderRegex, textToInsert);

      file.contents = new Buffer(content);

      callback(null, file);
    };

    return stream;

  }


}

module.exports = new Utils();