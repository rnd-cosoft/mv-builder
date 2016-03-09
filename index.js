var del = require('del');
var args = require('yargs').argv;
var merge = require('merge-stream');
var requirejs = require('requirejs');
var $ = require('gulp-load-plugins')({lazy: true});
var utils = require('./utils');

function MvBuilder(gulp, config, buildConfig) {

  var common = require('./tasks/common')(gulp, config);
  var build = require('./tasks/build')(gulp, config, buildConfig);

  /**
   * List the available gulp tasks
   */
  gulp.task('help', $.taskListing);
  gulp.task('default', ['help']);

}

module.exports = MvBuilder;