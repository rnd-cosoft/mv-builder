var del = require('del');
var args = require('yargs').argv;
var merge = require('merge-stream');
var requirejs = require('requirejs');
var $ = require('gulp-load-plugins')({lazy: true});
var utils = require('../utils');
var rjsConfigGenerator = require('../rjsConfigGenerator')();

module.exports = function(gulp, config, buildConfigFactory) {
  var buildConfig, bundlesConfig; // set by task

  rjsCompilationAndConfigurationRelatedTasks();
  copyEverythingToTempRelatedTasks();

  gulp.task('build', ['copyEverythingToTemp', 'revision', 'copyConfigToTemplates'], function(done) {
    // Just clean up temp folder after everything is done
    return del(config.temp, done);
  });

  /**
   *  combineResourcesInIndex task - concats and minifies js and css which are in index.html
   */
  gulp.task('combineResourcesInIndex', ['copyEverythingToTemp'], function() {
    return gulp.src(config.indexHtml)
      .pipe($.usemin({
        css: [csso, autoprefixer, bless],
        js: [uglify]
      }))
      .pipe(gulp.dest(config.temp));

    function csso() {
      return $.csso();
    }

    function autoprefixer() {
      return $.autoprefixer(config.autoprefixerRules);
    }

    function bless() {
      return $.bless();
    }

    function uglify() {
      return $.uglify();
    }
  });

  /**
   * Clean tasks - deletes dist, temp and config template folders
   */
  gulp.task('clean', function(done) {
    return del([config.dist, config.temp, './configs/dist_template/*.js'], done);
  });

  gulp.task('copyEverythingToTemp', ['copyResourcesToTemp', 'copyConfigToTemp', 'removeRjsTemp']);

  /**
   * Copies config file to templates folder for --template builds (it will be populated with data from CI and copied to dist)
   */
  gulp.task('copyConfigToTemplates', ['revision'], function() {
    if (!args.template) {
      return;
    }

    var configUrl = config.dist + '/scripts/config.*.js';
    var templatesUrl = config.root + 'configs/dist_template/';

    return gulp.src([configUrl])
      .pipe(gulp.dest(templatesUrl));
  });

  /**
   * Revisions everything
   */
  gulp.task('revision', ['combineResourcesInIndex', 'fixResourcePaths', 'configureBundlingInMainJs', 'uglifyScriptsInTemp'], function() {
    var replacer = function(fragment, replaceRegExp, newReference, referencedFile){
      var regex = /^\/\('\|"\)\([a-zA-Z0-9-_\\]+\)\(\)\('\|"\|\$\)\/g$/g;
      if (!replaceRegExp.toString().match(regex)) {
        fragment.contents = fragment.contents.replace(replaceRegExp, '$1' + newReference + '$3$4');
      }
    };

    var revAll = new $.revAll({ dontRenameFile: ['index.html', 'favicon.ico'], replacer: replacer });
    return gulp.src([config.temp + '/**/*'])
      .pipe(revAll.revision())
      .pipe(gulp.dest(config.dist));
  });

  /**
   * Fixes paths for resources from dependencies
   */
  gulp.task('fixResourcePaths', ['combineResourcesInIndex'], function() {
    return gulp.src(config.temp + '/styles/**/*')
      .pipe($.replace('../../img', '../img'))
      .pipe($.replace('../../fonts', '../fonts'))
      .pipe(gulp.dest(config.temp + '/styles'));
  });

  /**
   * Bundles js files using standard r.js configuration, outputs to buildConfig.dir
   */
  gulp.task('rjs-compile', ['createLibsAllFile', 'createBuildConfig'], function(cb) {
    requirejs.optimize(buildConfig, function(buildResponse) {
      console.log(buildResponse);
      cb();
    }, function(err) {
      cb(err);
    });
  });

  gulp.task('uglifyScriptsInTemp', ['copyStandaloneFilesToTemp', 'copyBundlesToTemp'], function() {
    var omitFiles = [
      '!' + config.tempScripts + '/main.js',
      '!' + config.tempScripts + '/config.js'
    ];

    return gulp.src([config.tempScripts + '/**/*.js'].concat(omitFiles))
      .pipe($.uglify())
      .pipe(gulp.dest(config.tempScripts));
  });

  function rjsCompilationAndConfigurationRelatedTasks() {

    /**
     * Enables bundle config in main.js, updates bundle config
     */
    gulp.task('configureBundlingInMainJs', ['copyStandaloneFilesToTemp', 'createMainJsBundleConfig'], function() {
      var mainjs = config.tempScripts + '/main.js';

      return gulp.src(mainjs)
        .pipe(utils.insertObjectKey('bundles', bundlesConfig, /\/\* build:insert-bundles-config-here \*\//gi))
        .pipe(gulp.dest(config.tempScripts));
    });

    /**
     * Creates build config variable and enhances it before passing to r.js
     */
    gulp.task('createBuildConfig', ['babel'], function(cb) {
      buildConfig = buildConfigFactory.rjsOptions;
      buildConfig = rjsConfigGenerator.generateModulesConfig(config.mainJs, config.scripts, buildConfig);
      cb();
    });

    /**
     * Reads bundle config and enhances it before inserting into main.js
     */
    gulp.task('createMainJsBundleConfig', ['createBuildConfig'], function(cb) {
      bundlesConfig = buildConfigFactory.bundlesConfig;
      bundlesConfig = rjsConfigGenerator.generateBundleConfig(config.mainJs, bundlesConfig, buildConfig.modules);
      cb();
    });

    /**
     * Creates libs.all.js needed for creating libs bundle
     */
    gulp.task('createLibsAllFile', ['babel'], function(cb) {
      rjsConfigGenerator.generateLibsAllFile(config.mainJs, config.scripts);
      cb();
    });

    gulp.task('babel-copy-libs', function() {
      return gulp.src(config.app + '/libs/**/*')
        .pipe(gulp.dest(config.tmpBabel + '/libs'));
    });

    gulp.task('babel', ['babel-copy-libs'], function() {
      return gulp.src(config.allJs)
        .pipe($.babel())
        .pipe(gulp.dest(config.scripts));
    });
  }

  function copyEverythingToTempRelatedTasks() {

    /**
     * Copy task - copies all files which does not need any processing
     */
    gulp.task('copyResourcesToTemp', ['clean', 'copyDependencies'], function() {
      var viewsLocation = config.allViewsDest || config.tempScripts;
      var stream = merge();

      /* Copy views */
      stream.add(gulp.src(config.allViews)
        .pipe($.htmlmin({ empty: true, spare: true }))
        .pipe(gulp.dest(viewsLocation)));

      /* Copy favicon */
      stream.add(gulp.src(config.app + '/favicon.ico')
        .pipe(gulp.dest(config.temp)));

      /* Copy htaccess */
      stream.add(gulp.src(config.app + '/.htaccess')
        .pipe(gulp.dest(config.dist)));

      /* Copy translations */
      stream.add(gulp.src(config.app + '/translations/*')
        .pipe(gulp.dest(config.temp + '/translations')));

      /* Copy fonts */
      stream.add(gulp.src(config.app + '/fonts/*')
        .pipe(gulp.dest(config.temp + '/fonts')));

      /* Copy images */
      stream.add(gulp.src(config.allImages)
        .pipe(gulp.dest(config.temp + '/img')));

      return stream;
    });

    /**
     * Copies fonts and images from dependencies to temp folder
     */
    gulp.task('copyDependencies', ['clean'], function() {
      var stream = merge();
      stream.add(gulp.src(config.dependenciesFonts)
        .pipe(gulp.dest(config.temp + '/fonts')));

      stream.add(gulp.src(config.dependenciesImages)
        .pipe(gulp.dest(config.temp + '/img')));

      return stream;
    });

    /**
     * Copies config file or its template to temp dir
     */
    gulp.task('copyConfigToTemp', ['copyStandaloneFilesToTemp'], function() {
      var configUrl;

      if (args.template) {
        configUrl = config.root + 'configs/template/config';
      } else {
        configUrl = config.root + 'app/scripts/config';
      }

      return gulp.src([configUrl + '.js'])
        .pipe($.uglify())
        .pipe(utils.addTimestampComment())
        .pipe(gulp.dest(config.tempScripts));
    });

    gulp.task('copyStandaloneFilesToTemp', ['rjs-compile', 'clean', 'createBuildConfig'], function() {
      var standaloneFiles = [];

      buildConfigFactory.standaloneFiles.forEach(function(file) {
        standaloneFiles.push(config.rjsTemp + '/**/' + file + '.js');
      });

      return gulp.src(standaloneFiles)
        .pipe(gulp.dest(config.tempScripts));
    });

    gulp.task('copyBundlesToTemp', ['rjs-compile', 'clean', 'createBuildConfig'], function() {
      var bundleFiles = [];

      // parse bundle files from modules config
      buildConfig.modules.forEach(function(module) {
        var filePath = config.rjsTemp + '/**/' + module.name + '.js';
        bundleFiles.push(filePath);
      });

      return gulp.src(bundleFiles)
        .pipe($.rename(function(path) {
          var name = path.dirname ? path.dirname + '/' + path.basename : path.basename;
          path.basename = rjsConfigGenerator.getBundleFilename(name);
          path.dirname = '';
        }))
        .pipe(gulp.dest(config.tempScripts));
    });

    /**
     * Removes temp files used for r.js compilation
     */
    gulp.task('removeRjsTemp', ['copyStandaloneFilesToTemp', 'copyBundlesToTemp'], function(done) {
      return del([config.rjsTemp, config.scripts + '/libs.all.js', config.tmpBabel], done);
    });

  }

};