var $ = require('gulp-load-plugins')({lazy: true});
var utils = require('../utils');
var del = require('del');
var Server = require('karma').Server;
var path = require('path');
var rjsConfigGenerator = require('../rjsConfigGenerator')();

module.exports = function(gulp, config) {
  subTasks();

  gulp.task('vet', ['jshint', 'jscs']);

  /**
   * Starts JSHint analysis
   */
  gulp.task('jshint', ['_copyRules'], function() {
    utils.log('Starting JSHint analysis');
    return gulp
      .src(config.allJs)
      .pipe($.jshint(config.jshintrc))
      .pipe($.jshint.reporter('jshint-stylish'))
      .pipe($.jshint.reporter('fail'));
  });

  /**
   * Starts jscs analysis
   */
  gulp.task('jscs', ['_copyRules'], function() {
    utils.log('Starting JSCS analysis');
    return gulp
      .src(config.allJs)
      .pipe($.jscs())
      .pipe($.jscs.reporter())
      .pipe($.jscs.reporter('fail'));
  });

  /**
   * Checks if there missing translation files
   */
  gulp.task('translations', function() {
    return gulp.src(config.sniffForTranslations)
      .pipe($.missingTranslations({ translationsSrc: config.translationFiles }));
  });

  /**
   * Watches for SASS files changes and triggers compilation
   */
  gulp.task('watch-sass', function(){
    gulp.watch([config.sassSrc], ['compile-sass']);
  });

  /**
   * Compiles SASS source files to css files
   */
  gulp.task('compile-sass', ['_cleanStylesSass'], function () {
    utils.log('Compiling SASS --> CSS');

    return gulp
      .src(config.sassSrc)
      .pipe($.plumber({
        errorHandler: function (err) {
          console.log(err);
          this.emit('end');
        }
      }))
      .pipe($.sass({
        includePaths: [config.compassMixins],
        outputStyle: 'expanded',
        errLogToConsole: true
      }))
      .pipe($.autoprefixer({ browsers: config.autoprefixerRules }))
      .pipe(gulp.dest(config.sassDest));
  });

  /**
   * Watches for LESS files changes and triggers compilation
   */
  gulp.task('watch-less', function(){
    gulp.watch([config.lessSrc], ['compile-less']);
  });

  /**
   * Compiles LESS source files to css files
   */
  gulp.task('compile-less', ['_cleanStylesLess'], function () {
    var filter = $.filter(utils.isNotPrivate);
    utils.log('Compiling LESS --> CSS');

    return gulp
      .src(config.lessSrc)
      .pipe($.plumber({
        errorHandler: function (err) {
          console.log(err);
          this.emit('end');
        }
      }))
      .pipe($.less())
      .pipe($.autoprefixer({ browsers: config.autoprefixerRules }))
      .pipe(filter)
      .pipe(gulp.dest(config.lessDest));
  });

  /* Karma task - starts unit tests */
  gulp.task('karma', function(done) {
    var server = new Server({
      configFile: config.root + 'karma.conf.js',
      singleRun: true
    });

    server.on('run_complete', function (browsers, results) {
      // NB If the argument of done() is not null or not undefined, e.g. a string, the next task in a series won't run.
      done(results.error ? 'There are test failures' : null);
    });

    server.start();
  });

  /**
   * Generates *.all.js files for shared folders.
   */
  gulp.task('allJs', function(cb) {
    rjsConfigGenerator.generateAllJsFiles(path.join(config.scripts, 'shared'));
    cb();
  });

  /**
   * Generates stubs using gulp-stubs plugin
   */
  gulp.task('stubs', function() {
    return gulp.src(config.specsForStubs)
      .pipe($.stubs({
        marker: config.stubsMarker || 'gulp-stubs',
        templateUrl: config.stubsTemplateUrl || __dirname + '/../templates/stubs.txt'
      }));
  });

  function subTasks() {

    /**
     * Updates project rules configuration files
     */
    gulp.task('_copyRules', function() {
      utils.log('Updating rules files');
      return gulp.src(__dirname + '/configs/.js*').pipe(gulp.dest(config.root));
    });

    /**
     * Cleans sass files
     **/
    gulp.task('_cleanStylesSass', function (done) {
      utils.log('Cleaning SASS styles');
      return del(config.sassDest + '/**/*', done);
    });

    /**
     * Cleans less files
     **/
    gulp.task('_cleanStylesLess', function (done) {
      utils.log('Cleaning LESS styles');
      return del([config.lessDest + '/**/*'], done);
    });

  }

};

