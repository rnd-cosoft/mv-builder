var del = require('del');
var args = require('yargs').argv;
var combine = require('stream-combiner');
var requirejs = require('requirejs');
var $ = require('gulp-load-plugins')({lazy: true});
var utils = require('./utils');

function MvBuilder(gulp, config) {

  /**
   * List the available gulp tasks
   */
  gulp.task('help', $.taskListing);
  gulp.task('default', ['help']);

  /**
   * Updates project rules configuration files
   */
  gulp.task('copy-rules', function() {
    utils.log('Updating rules files');
    return gulp.src(__dirname + '/configs/.js*').pipe(gulp.dest(config.root));
  });

  /**
   * Starts JSHint analysis
   */
  gulp.task('jshint', ['copy-rules'], function() {
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
  gulp.task('jscs', ['copy-rules'], function() {
    utils.log('Starting JSCS analysis');
    return gulp
      .src(config.allJs)
      .pipe($.jscs())
      .pipe($.jscs.reporter())
      .pipe($.jscs.reporter('fail'));
  });

  gulp.task('vet', ['jshint', 'jscs']);

  /**
   *  Karma task - starts unit tests
   */
  gulp.task('karma', function() {
    return gulp.src(['no need to supply files because everything is in config file'])
      .pipe($.karma({
        configFile: config.karmaConfig,
        singleRun: true
      }));
  });

  /* BUILDING RELATED TASKS */

  /**
   *  Usemin task - concats and minifies js and css which are in index.html
   */
  gulp.task('useref', ['copy', 'requirejs'], function() {
    log('Optimizing the js, css, and html');

    // Filters are named for the gulp-useref path
    var cssFilter = $.filter('**/*.css', {restore: true});
    var jsFilter = $.filter('**/*.js', {restore: true});

    return gulp
      .src(config.indexHtml)
      .pipe($.plumber())
      .pipe($.useref()) // Gather all assets from the html with useref
      // Get the css
      .pipe(cssFilter)
      .pipe($.csso())
      .pipe($.autoprefixer(config.autoprefixerRules))
      .pipe($.bless())
      .pipe(cssFilter.restore)
      // Get the custom javascript
      .pipe(jsFilter)
      .pipe($.uglify())
      .pipe(jsFilter.restore)
      // Take inventory of the file names for future rev numbers
      .pipe(gulp.dest(config.temp));
  });

  /**
   * Copy task - copies all files which does not need any processing
   */
  gulp.task('copy', ['copyDependencies'], function() {
    var mainJs;

    /* Copy main */
    if(!args.concat) {
      mainJs = gulp.src(config.mainJs)
        .pipe(gulp.dest(config.temp + '/scripts'));
    }

    /* Copy views */
    var views = gulp.src(config.allViews)
      .pipe($.htmlmin({ empty: true, spare: true }))
      .pipe(gulp.dest(config.temp + '/views'));

    /* Copy favicon */
    var favicon = gulp.src(config.app + '/favicon.ico')
      .pipe(gulp.dest(config.temp));

    /* Copy htaccess */
    var htaccess = gulp.src(config.app + '/.htaccess')
      .pipe(gulp.dest(config.dist));

    /* Copy translations */
    var translations = gulp.src(config.app + 'translations/*')
      .pipe(gulp.dest(config.temp + '/translations'));

    /* Copy fonts */
    var fonts = gulp.src(config.app + 'fonts/*')
      .pipe(gulp.dest(config.temp + '/fonts'));

    /* Copy images */
    var images = gulp.src(config.allImages)
      .pipe(gulp.dest(config.temp + '/img'));

    return combine(mainJs, views, favicon, htaccess, translations, fonts, images);
  });

  /**
   * Copies fonts and images from dependencies to temp folder
   */
  gulp.task('copyDependencies', function() {
    var fonts = gulp.src(config.dependenciesFonts)
      .pipe(gulp.dest(config.temp + '/fonts'));

    var images = gulp.src(config.dependenciesImages)
      .pipe(gulp.dest(config.temp + '/img'));

    return combine(fonts, images);
  });

  /**
   * Clean tasks - deletes dist, temp and config template folders
   */
  gulp.task('clean', function() {
    return del([config.dist, config.temp, './configs/dist_template/*.js'], { read: false });
  });

  /**
   * Clean temp tasks - deletes temp folder
   */
  gulp.task('cleanTemp', ['clean', 'requirejs', 'revision'], function() {
    return del(config.temp, { read: false });
  });

  /**
   * Copies config file if needed (when using template)
   */
  gulp.task('setConfigFile', ['useref', 'replaceMain'], function() {
    var configUrl;

    if(args.template) {
      configUrl = config.root + 'configs/dist_template/config';
      return gulp.src([configUrl + '*.js'])
        .pipe(rename('config.js'))
        .pipe(gulp.dest(config.temp + '/scripts'));
    }
  });

  /**
   * Requirejs task - reads main.js file and adds all libs to scrips folder
   */
  gulp.task('requirejs', ['copy'], function() {
    var configUrl, returnValue;
    var revAll = new $.revAll();

    /* available params: --dev, --prod, --staging */
    if(args.development) {
      configUrl = config.root + 'configs/development/config';
    } else if(args.template) {
      configUrl = config.root + 'configs/template/config';
    } else {
      configUrl = config.root + 'app/scripts/config';
    }

    returnValue = combine(
      gulp.src(config.mainJs),
      utils.getRequireJsConfigPaths()
    )
      .on('end', function() {
        var baseUrl = config.app + '/scripts/',
          destDir = config.temp + '/scripts/',
          libsPaths = utils.requireJsPaths,
          lib;

        if(args.concat) {

          return requirejs.optimize({
            baseUrl: baseUrl,
            paths: {
              'config': '../../' + configUrl
            },
            dir: destDir,
            uglify2: {
              mangle: false
            },
            almond: true,
            replaceRequireScript: [{
              files: [config.indexHtml],
              module: 'scripts/main'
            }],

            modules: [{name: 'main'}],

            mainConfigFile: config.mainJs,
            useStrict: true,
            optimize: 'uglify2'
          }, function() {
            return gulp.src(destDir + 'scripts/main.js')
              .pipe(gulp.dest(destDir));
          });

        } else {
          for(lib in libsPaths) {
            if( libsPaths.hasOwnProperty(lib )) {
              gulp.src(baseUrl + libsPaths[lib] + '.js')
                .pipe($.rename(lib + '.js'))
                .pipe($.uglify({ mangle: false }))
                .pipe(gulp.dest(destDir));
            }
          }
        }
      });

    /* Copy JS */
    if(!args.concat) {
      var configDest;

      if(args.template) {
        configDest = config.root + '/configs/dist_template/';
      } else {
        configDest = config.temp + 'scripts/';
      }

      gulp.src([configUrl + '.js'])
        .pipe($.uglify())
        .pipe(utils.addTimestampComment())
        .pipe(revAll.revision())
        .pipe(gulp.dest(configDest));

      return gulp.src([config.allJs, '!' + config.mainJs, '!' + config.app + '/scripts/config.js'])
        .pipe($.uglify())
        .pipe(gulp.dest(config.temp + '.tmp/'));

    } else {
      return returnValue;
    }
  });

  /**
   * Revisions everything
   */
  gulp.task('revision', ['useref', 'replaceMain', 'setConfigFile'], function() {
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
   * Replaces lib paths in main.js file
   */
  gulp.task('replaceMain', ['useref'], function() {
    return gulp.src([config.temp + '/scripts/main.js'])
      .pipe(utils.replaceRequireJsConfigPaths())
      .pipe($.uglify())
      .pipe(gulp.dest(config.temp + '/scripts'));
  });

  /**
   * Fixes paths for resources from dependencies
   */
  gulp.task('fix-paths', ['useref'], function() {
    return gulp.src(config.temp + '/styles/**/*')
      .pipe($.replace('../../img', '../img'))
      .pipe($.replace('../../fonts', '../fonts'))
      .pipe(gulp.dest(config.temp + '/styles'));
  });

  /**
   * Checks if there missing translation files
   */
  gulp.task('translations', function() {
    return gulp.src(config.sniffForTranslations)
      .pipe($.missingTranslations({ translationsSrc: config.translationFiles }));
  });

  gulp.task('build', ['requirejs', 'revision', 'cleanTemp']);
}

module.exports = MvBuilder;