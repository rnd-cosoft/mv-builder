### 0.5.2 (2017-01-27)

* Replaced babel with typescript (update your configs!)
* Fixed building and coverage

### 0.5.1 (2017-01-19)

* Catched up with 0.4.x branch
* Removed npm-shrinkwrap.json as this should now be used with yarn

### 0.4.6 (2016-11-25)

* Fixed gulp-bless version
* Replaced karma-phantomjs2-launcher with karma-phantomjs-launcher

### 0.4.5 (2016-11-25)

* Added yarn.lock
* Updated karma-phantomjs2-launcher launcher
* Added phantomjs-prebuilt

### 0.4.4 (2016-09-09)

* Added gulp-stubs plugin
* Added gulp stubs task with defaults

### 0.4.3 (2016-08-31)

* Set imports option to false for gulp-bless plugin

### 0.5.0 (2016-04-18)

* Added Babel for ES6 support
#### Breaking changes:
* `config.tmpBabel` is used for defining temp directory for Babel compiles code. `config.main`, `config.scripts` should be changed accordingly (see readme.md)

### 0.4.2 (2016-04-12)

* Added plumber and autoprefixer for sass compilation

### 0.4.0 (2016-03-15)

* Added r.js bundling configuration generation

### 0.3.1 (2016-02-15)

* Added lib bundling support

### 0.3.0 (2016-02-08)

* Implemented requirejs bundling support, this will work only with modular architecture and proper r.js build config

#### Breaking changes

### 0.2.1 (2016-02-01)

* Added optional `config.allViewsDest` value for copying views to specific location;

### 0.2.0 (2016-01-26)

#### Breaking changes

* Updated Jasmine version to 2.4.1. See Jasmine [release notes](https://github.com/jasmine/jasmine/blob/master/release_notes/20.md) for migration path.

### 0.1.3 (2016-01-25)

* Version bump.

### 0.1.2 (2016-01-25)

* Updated gulp-usemin to original repo version.
