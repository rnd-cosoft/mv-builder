var del = require('del');
var args = require('yargs').argv;
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

  gulp.task('jshint', ['copy-rules'], function() {
    utils.log('Starting JSHint analysis');
    return gulp
      .src(config.allJs)
      .pipe($.jshint(config.jshintrc))
      .pipe($.jshint.reporter('jshint-stylish'))
      .pipe($.jshint.reporter('fail'));
  });

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

  /* Usemin task - concats and minifies js and css which are in index.html */
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
      .pipe($.autoprefixer(['last 1 version', '> 1%', 'ie 10', 'ie 9', 'ie 8', 'ie 7']))
      .pipe($.bless())
      .pipe(cssFilter.restore)
      // Get the custom javascript
      .pipe(jsFilter)
      .pipe($.uglify())
      .pipe(jsFilter.restore)
      // Take inventory of the file names for future rev numbers
      .pipe(gulp.dest(config.temp));
  });

  /* Copy task - copies all files which does not need any processing */
  gulp.task('copy', ['copyDependencies'], function() {
    /* Copy main */
    if(!args.concat) {
      gulp.src('./app/scripts/main.js')
        .pipe(gulp.dest('./.tmp/scripts'));
    }

    /* Copy views */
    gulp.src('./app/views/**/*.html')
      .pipe(minifyHTML({ empty: true, spare: true }))
      .pipe(gulp.dest('.tmp/views/'));

    /* Copy favicon */
    gulp.src('./app/favicon.ico')
      .pipe(gulp.dest('.tmp/'));

    gulp.src('./app/.htaccess')
      .pipe(gulp.dest('./dist/'));

    /* Copy translations */
    copyFiles('./app/translations/*', '.tmp/translations');

    /* Copy images */
    return copyFiles(['./app/img/**/*'], '.tmp/img');
  });

  gulp.task('copyDependencies', function() {
    /* Copy fonts */
    copyFiles('./app/libs/visma-nc2/dist/fonts/*', '.tmp/fonts');

    return copyFiles(['./app/libs/visma-nc2/dist/img/**/*'], '.tmp/img');
  });

  /* Clean tasks - deletes dist, temp and config template folders */
  gulp.task('clean', function() {
    return del([config.dist, config.temp, './configs/dist_template/*.js']);
  });

  /* Clean temp tasks - deletes temp folder */
  gulp.task('cleanTemp', ['requirejs', 'revision'], function() {
    return del(config.temp);
  });

  gulp.task('setConfigFile', ['useref', 'replaceMain'], function() {
    var configUrl;

    if(args.template) {
      configUrl = './configs/dist_template/config';
      return gulp.src([configUrl + '*.js'])
        .pipe(rename('config.js'))
        .pipe(gulp.dest('./.tmp/scripts'));
    }
  });

  /* Requirejs task - reads main.js file and adds all libs to scrips folder */
  gulp.task('requirejs', ['copy'], function() {
    var configUrl, returnValue;
    var revAll = new RevAll();

    /* available params: --dev, --prod, --staging */
    if(args.development) {
      configUrl = './configs/development/config';
    } else if(args.template) {
      configUrl = './configs/template/config';
    } else {
      configUrl = './app/scripts/config';
    }

    returnValue = combine(
      gulp.src('./app/scripts/main.js'),
      utils.getRequireJsConfigPaths()
    )
      .on('end', function() {
        var baseUrl = './app/scripts/',
          destDir = './.tmp/scripts/',
          libsPaths = requireJsPaths,
          lib;

        if(args.concat) {

          return requirejs.optimize({
            baseUrl: './app/scripts',
            paths: {
              'config': '../../' + configUrl
            },
            dir: '.tmp/dist/scripts',
            uglify2: {
              mangle: false
            },
            almond: true,
            replaceRequireScript: [{
              files: ['<%= yeoman.dist %>/index.html'],
              module: 'scripts/main'
            }],

            modules: [{name: 'main'}],

            mainConfigFile: './app/scripts/main.js',
            useStrict: true,
            optimize: 'uglify2'
          }, function() {
            return gulp.src('.tmp/dist/scripts/main.js')
              .pipe(gulp.dest(destDir));
          });

        } else {
          for(lib in libsPaths) {
            if( libsPaths.hasOwnProperty(lib )) {
              gulp.src(baseUrl + libsPaths[lib] + '.js')
                .pipe(rename(lib + '.js'))
                .pipe(uglify({ mangle: false }))
                .pipe(gulp.dest(destDir));
            }
          }
        }
      });

    /* Copy JS */
    if(!args.concat) {
      var configDest;

      if(args.template) {
        configDest = 'configs/dist_template/';
      } else {
        configDest = '.tmp/scripts/';
      }

      gulp.src([configUrl + '.js'])
        .pipe(uglify())
        .pipe(utils.addTimestampComment())
        .pipe(revAll.revision())
        .pipe(gulp.dest(configDest));

      return gulp.src(['./app/scripts/**/*.js', '!./app/scripts/main.js', '!./app/scripts/config.js'])
        .pipe(uglify())
        .pipe(gulp.dest('.tmp/scripts/'));

    } else {
      return returnValue;
    }
  });

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

  gulp.task('replaceMain', ['useref'], function() {
    return gulp.src(['./.tmp/scripts/main.js'])
      .pipe(utils.replaceRequireJsConfigPaths(requireJsPaths))
      .pipe(uglify())
      .pipe(gulp.dest('./.tmp/scripts'));
  });

  gulp.task('build', ['requirejs', 'revision', 'cleanTemp']);
}

module.exports = MvBuilder;