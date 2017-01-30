var $ = require('gulp-load-plugins')({lazy: true});

function MvBuilder(gulp, config, buildConfig) {

  var common = require('./tasks/common')(gulp, config);
  var build = require('./tasks/build')(gulp, config, buildConfig);
  var watch = require('./tasks/watch')(gulp, config);

  /**
   * List the available gulp tasks
   */
  gulp.task('help', $.taskListing);
  gulp.task('default', ['help']);

}

module.exports = MvBuilder;
