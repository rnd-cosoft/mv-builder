MvBuilder
===================

Collection of configured gulp tasks in one place. Great when having many projects with same building process.

gulp.config.js
-------------------

```js
module.exports = function () {
  var root = __dirname + '/';

  var config = {
  
    /* Common direcotries */
    root: root, // Root
    app: root + 'app', // Application sources folder
    dist: root + 'dist', // Application distribution folder
    temp: root + '.tmp', // Temp folder location
    
    /* When using SASS preprocesor */
    sassSrc: 'app/sass/**/*.scss', // This is where sass files are located
    sassDest: 'app/styles', // This is where compiled sass goes
    compassMixins: 'app/libs/compass-mixins/lib', // Compass mixins location

    /* When using LESS preprocessor */
    
    lessSrc: ['app/less/**/*.less'], // This is where less files are located
    lessDest: 'app/styles/', // This is where compiled less goes
    bundledCss: 'main.css', // This is a bundled CSS file name

    /* Plugins config */
    
    autoprefixerRules: ['last 1 version', '> 1%', 'ie 10', 'ie 9', 'ie 8', 'ie 7'], // Autoprefixer rules
    // Documentation for autoprefixerRules: https://github.com/ai/browserslist

    indexHtml: root + 'app/index.html', // Location of index.html file (main file of application)
    mainJs: root + 'app/scripts/main.js', // Location of main.js file

    allJs: root + 'app/scripts/**/*.js', // Location of all JS files
    allViews: root + 'app/views/**/*.html', // Location of all views
    allViewsDest: this.temp + '/scripts', // Optional: Location for copying views files
    allImages: root + 'app/img/**/*', // Location of all images

    dependenciesFonts: root + 'app/libs/visma-nc3/dist/fonts/*', // Location of depending fonts
    dependenciesImages: root + 'app/libs/visma-nc3/dist/img/**/*', // Location of depending images

    sniffForTranslations: ['app/scripts/**/*.js', 'app/views/**/*.html', '!app/scripts/controllers/admin/**/*', '!app/views/admin/**/*'], // Files used to sniff missing translations
    translationFiles: 'app/translations/*.json', // Actual translation json files

    jshintrc: root + '.jshintrc', // JSHint rules file
    karmaConfig: root + 'karma.conf.js', // Karma config file
    
    scripts: root + 'app/scripts',
    rjsTemp: root + 'app/scripts/temp',
    tempScripts: root + '.tmp/scripts'
  };


  return config;
};
```

gulp.js
---------------

```js
'use strict';

var gulp = require('gulp'),
  config = require('./gulp.config')(),
  buildConfig = require('./build.config')(config),
  mvBuilder = require('mv-builder')(gulp, config, buildConfig);
```


build.config.js
----------------

```js
module.exports = function(config) {

  return {
    rjsOptions: getRjsOptions(),
    bundlesConfig: getMainJsBundlesConfig(),
    standaloneFiles: getStandaloneFiles()
  };

  /**
   * Options passed to r.js
   *
   * "modules" config is a skeleton configuration, which is configured on build, by scanning module directories
   * and parsing files
   */
  function getRjsOptions() {
    //NOTE: keys prefixed with '$' are not standard r.js options - these are used for config enhancement in gulp

    return {
      baseUrl: config.scripts,
      mainConfigFile: config.scripts + '/main.js',
      dir: config.rjsTemp,
      optimize: 'none', // minification will be done in next build steps

      // exclude from bundling
      paths: {
        'shared/globalHelpers': 'empty:',
        'config': 'empty:'
      },

      // main modules configuration
      modules: [
        // app bundle combines all .module and .config files
        {
          name: 'app'
        },
        {
          name: 'libs.all',
          $excludeLibs: false
        },
        {
          $path: 'core',
          $name: 'bootstrapper'
        },
        {
          $path: 'timeReporting/absenceOverview'
        },
        {
          $path: 'shared/components'
        },
        {
          $path: 'shared/filters'
        },
        {
          name: 'standardConfigExample',
          include: [],
          exclude: []
        }
      ]
    };
  }

  /**
   * Configuration inserted to main.js.
   *
   * Custom includes should be added here.
   *
   * This config is filled/extended in gulp with data from modules config (rjsOptions).
   */
  function getMainJsBundlesConfig() {
    return {
      'app.bundle': [
        'providerConfig',
        'routeConfig'
      ]
    };
  }

  /**
   * Files not included in any bundle/module
   */
  function getStandaloneFiles() {
    return [
      'main',
      'shared/globalHelpers',
      'shims/*'
    ];
  }
};

```

Available task
----------------
List of available tasks:
* `gulp` - list all available tasks
* `gulp build` - builds project
* `gulp jshint` - validates all js files with jshint
* `gulp jscs` - validates all js files with cs
* `gulp vet` - triggers jscs and jshint tasks
* `gulp karma` - triggers karma test runner
* `gulp translations` - checks for missing translations
* `gulp build` - handles all building related tasks and produces dist folder
* `gulp compile-less` - compiles LESS files
* `gulp watch-less` - watches for LESS files changes and triggers compile-less task on them
* `gulp compile-sass` - compiles SASS files
* `gulp watch-sass` - watches for SASS files changes and triggers compile-sass task on them
* `gulp allJs` - generates *.all.js files for shared modules