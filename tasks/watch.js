var $ = require('gulp-load-plugins')({lazy: true});
var utils = require('../utils');
var del = require('del');
var path = require('path');
var _ = require('lodash');

/**
 * This is all made for making development easier - copying all files to serveTmp folder and watching for changes to update that folder
 * @param gulp
 * @param config
 */
module.exports = function(gulp, config) {

  // We need to use relative paths to make watching work for added files
  var relativeConfig = _.mapValues(config, function(value) {
    if (_.isArray(value)) {
      return value.map(function(item) {
        return fixRelativePath(item);
      });
    }

    return fixRelativePath(value);
  });

  /**
   * Watch for changes
   */
  gulp.task('watch', ['_watch-js', '_watch-html', '_watch-fonts', '_watch-images', '_watch-css', '_watch-translations', '_watch-libs'], function() {
    log('Watching JS files...');
    gulp.watch(relativeConfig.allJs, { cwd: __dirname }, function(obj) {
      gulp.src(obj.path, { base: 'app/' })
        .pipe($.sourcemaps.init())
        .pipe($.typescript({
          allowJs: true
        }))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest(relativeConfig.serveTmp, { cwd: __dirname }));
      log('File changed: ' + obj.path);
    });

    log('Watching HTML files...');
    gulp.watch(relativeConfig.root + '/app/**/*.html', { cwd: __dirname }, function(obj) {
      gulp.src(obj.path, { base: 'app/' })
        .pipe(gulp.dest(relativeConfig.serveTmp, { cwd: __dirname }));
      log('File changed: ' + obj.path);
    });

    log('Watching FONT files...');
    gulp.watch(relativeConfig.root + '/app/fonts/**/*', { cwd: __dirname }, function(obj) {
      gulp.src(obj.path, { base: 'app/' })
        .pipe(gulp.dest(relativeConfig.serveTmp, { cwd: __dirname }));
      log('File changed: ' + obj.path);
    });

    log('Watching IMAGE files...');
    gulp.watch(relativeConfig.allImages, { cwd: __dirname }, function(obj) {
      gulp.src(obj.path, { base: 'app/' })
        .pipe(gulp.dest(relativeConfig.serveTmp, { cwd: __dirname }));
      log('File changed: ' + obj.path);
    });

    log('Watching CSS files...');
    if (relativeConfig.sassSrc) {
      gulp.watch(relativeConfig.sassSrc, { cwd: __dirname }, ['compile-sass']);
    }
    if (relativeConfig.lessSrc) {
      gulp.watch(relativeConfig.lessSrc, { cwd: __dirname }, ['compile-less']);
    }
    gulp.watch([relativeConfig.sassDest + '/**/*', relativeConfig.lessDest + '/**/*'], { cwd: __dirname }, function(obj) {
      gulp.src(obj.path, { base: 'app/' })
        .pipe(gulp.dest(relativeConfig.serveTmp, { cwd: __dirname }));
    });

    log('Watching TRANSLATION files...');
    gulp.watch(relativeConfig.translationFiles, { cwd: __dirname }, function(obj) {
      gulp.src(obj.path, { base: 'app/' })
        .pipe(gulp.dest(relativeConfig.serveTmp, { cwd: __dirname }));
      log('File changed: ' + obj.path);
    });
  });

  /**
   * Copy initial files
   */
  gulp.task('_watch-js', ['clean-serve'], function() {
    log('Loading initial JS files...');
    return gulp.src(relativeConfig.allJs, { cwd: __dirname })
      .pipe($.sourcemaps.init())
      .pipe($.typescript({
        allowJs: true
      }))
      .pipe($.sourcemaps.write())
      .pipe(gulp.dest(relativeConfig.serveTmp + '/scripts', { cwd: __dirname }));
  });

  gulp.task('_watch-html', ['clean-serve'], function() {
    log('Loading initial HTML files...');
    return gulp.src(relativeConfig.root + '/app/**/*.html', { cwd: __dirname })
      .pipe(gulp.dest(relativeConfig.serveTmp, { cwd: __dirname }));
  });

  gulp.task('_watch-fonts', ['clean-serve'], function() {
    log('Loading initial FONT files...');
    return gulp.src(relativeConfig.root + '/app/fonts/**/*', { cwd: __dirname })
      .pipe(gulp.dest(relativeConfig.serveTmp + '/fonts', { cwd: __dirname }));
  });

  gulp.task('_watch-images', ['clean-serve'], function() {
    log('Loading initial IMAGE files...');
    return gulp.src(relativeConfig.allImages, { cwd: __dirname })
      .pipe(gulp.dest(relativeConfig.serveTmp + '/img', { cwd: __dirname }));
  });

  gulp.task('_watch-css', ['clean-serve'], function() {
    var files = [];
    if (relativeConfig.sassDest) {
      files.push(relativeConfig.sassDest + '/**/*');
    }
    if (relativeConfig.lessDest) {
      files.push(relativeConfig.lessDest + '/**/*');
    }
    log('Loading initial CSS files...');
    return gulp.src(files, { cwd: __dirname })
      .pipe(gulp.dest(relativeConfig.serveTmp + '/styles', { cwd: __dirname }));
  });

  gulp.task('_watch-translations', ['clean-serve'], function() {
    log('Loading initial TRANSLATION files...');
    return gulp.src(relativeConfig.translationFiles, { cwd: __dirname })
      .pipe(gulp.dest(relativeConfig.serveTmp + '/translations', { cwd: __dirname }));
  });

  gulp.task('_watch-libs', ['clean-serve'], function() {
    log('Loading initial TRANSLATION files...');
    return gulp.src(relativeConfig.root + '/app/libs/**/*', { cwd: __dirname })
      .pipe(gulp.dest(relativeConfig.serveTmp + '/libs', { cwd: __dirname }));
  });

  gulp.task('clean-serve', function(done) {
    log('Cleaning serve directory...');
    return del(config.serveTmp + '/**/*', done);
  });

  function log(msg){
    $.util.log($.util.colors.yellow('[WATCH] ') + msg);
  }

  function fixRelativePath(value) {
    if (value.indexOf('!') === 0) {
      value = value.substr(1);
      return '!' + path.relative(__dirname, value);
    }

    return path.relative(__dirname, value)
  }

};
