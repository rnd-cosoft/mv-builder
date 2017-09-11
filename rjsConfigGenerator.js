var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var globby = require('globby');

/**
 * r.js conguration generator
 * ==========================
 *
 * Includes logic for r.js bundling configuration automation for modular applications.
 *
 * Generates configuration assets:
 * * modules config - part of standard r.js options, reads directories and js files to generate modules config
 * * bundle config - standard require.js bundle config inserted to main.js, generated from module config
 * * *.all.js files - one file per shared module including all module files, used to include all files in bundle and
 *                    esily reference module (implement module dependency)
 * * libs.all.js file - file including all libraries so they can be bundled together
 *
 * Used conventions:
 * - modules can depend only on shared modules and libs
 * - only inner module requires are implemented with relative paths (./, ../)
 * - each module placed in separate folder
 * - shared modules are put in one directory (e.g. 'scripts/shared/[module1, module2, ...]/')
 * - files are named fileName.type.js, where type is one of [module, ctrl, component, all, config, factory, etc..] (exceptions possible)
 * - all libraries are configured in main.js paths config (between special comments)
 * - base module and bundle configs are specified, most base options have precedence over auto generated ones, arrays are concatenated
 * - modules config have module folder ($path) specified per module (exceptions possible)
 *
 */
module.exports = function() {
  'use strict';

  return {
    // main generation api
    generateModulesConfig: generateModulesConfig,
    generateBundleConfig: generateBundleConfig,
    generateAllJsFiles: generateAllJsFiles,
    generateLibsAllFile: generateLibsAllFile,
    // helpers
    getBundleFilename: getBundleFilename
  };

  ////////////////

  /**
   * @desc Generates modules config for r.js by reading libs from main.js and parsing define() statements in scripts
   *
   * @param {string} mainJsPath
   * @param {string} scriptsFolderPath
   * @param {Object} buildConfig - base config to enhance (existing options will not be overriden)
   * @return {Object}
   */
  function generateModulesConfig(mainJsPath, scriptsFolderPath, buildConfig) {
    // read libs
    var allLibs = getLibPaths(mainJsPath);

    buildConfig.modules.forEach(function(module) {
      excludeLibs(module, allLibs);

      // can't generate includes, excludes and name if $path not specified
      if (!module.$path) {
        if (module.name !== 'app' && module.name !== 'libs.all') {
          console.log('WARNING: module $path not set! name:' + module.name + ', $name:' + module.$name);
        }
        return;
      }

      var moduleFolder = path.join(scriptsFolderPath, module.$path);
      setModuleNameAndIncludes(module, moduleFolder);
      setModuleExcludes(module, moduleFolder);
    });

    return buildConfig;

    function excludeLibs(module, allLibs) {
      if (module.$excludeLibs !== false) {
        module.exclude = module.exclude || [];
        module.exclude = module.exclude.concat(allLibs);
      }
    }

    function setModuleNameAndIncludes(module, moduleFolder) {
      var entryScripts = globby.sync(
        ['**/*.ctrl.js', '**/*.component.js', '**/*.all.js'],
        { cwd: moduleFolder }
      );
      entryScripts = _.map(entryScripts, function(script) {
        script = script.replace(/.js$/gi, '');
        return module.$path + '/' + script;
      });

      // set bundle name
      if (!module.name) {
        if (!module.$name && entryScripts.length) {
          // set first entry script as name
          module.name = entryScripts.splice(0, 1)[0];
        } else {
          module.name = module.$path + '/' + module.$name;
        }
      }

      // add module controllers and all.js files to includes
      if (entryScripts.length) {
        module.include = module.include || [];
        module.include = module.include.concat(entryScripts);
      }
    }

    function setModuleExcludes(module, moduleFolder) {
      var excludes = getModuleExcludes(module, moduleFolder);

      module.exclude = module.exclude || [];
      module.exclude = _.union(module.exclude, excludes);
    }
  }

  /**
   * @desc Generates bundle config inserted to main.js
   *
   * @param {string} mainJsPath
   * @param {Object} bundlesConfig - base config to enhance (existing options will not be overriden)
   * @param {Object[]} modulesConfig - full generated modules config used in r.js options
   * @returns {Object}
   */
  function generateBundleConfig(mainJsPath, bundlesConfig, modulesConfig) {
    // read libs and set libs bundle includes
    bundlesConfig['libs.all.bundle'] = getLibPaths(mainJsPath);

    // extend bundle includes based on build.config modules config
    var includesMap = getBundlesIncludeMap(modulesConfig);
    _.forEach(includesMap, function(includes, bundleName) {
      bundlesConfig[bundleName] = bundlesConfig[bundleName] || [];
      bundlesConfig[bundleName] = bundlesConfig[bundleName].concat(includes);
    });

    return bundlesConfig;
  }


  /**
   * @desc Generates *.all.js files in specified path subfolders, one per folder(module).
   *
   * *.all.js include all module files to be easily referenced in another module.
   * Should be used for shared modules only, as only shared module can be set as a dependency for another module.
   *
   * Creates new if needed, replaces whole content of existing file or part after placeholder comment.
   *
   * @param {string} baseFolderPath - its subfolders will be treated as module folders; commonly "scripts/shared" folder
   */
  function generateAllJsFiles(baseFolderPath) {
    var placeholder = '/* gulp:custom-includes-end */';
    var moduleFolders = getSubfolders(baseFolderPath);

    // generate all.js file for each folder
    moduleFolders.forEach(function(moduleFolder) {
      var folderPath = path.join(baseFolderPath, moduleFolder);
      var allJs = path.join(path.join(folderPath, moduleFolder + '.all.js'));
      var moduleScripts = globby.sync(
        ['**/*.js', '!**/*.spec.js', '!**/*.all.js', '!**/*.module.js', '!**/*.config.js'],
        { cwd: folderPath }
      );

      // generate all.js file content
      var header = "'use strict';\n" +
        "define([\n";
      var footer = "], function() {});";
      var scriptPathsContent = '';
      var newContent;
      var fileContent = fs.existsSync(allJs) ? fs.readFileSync(allJs, "utf8") : '';
      var placeholderIndex = fileContent.indexOf(placeholder);

      moduleScripts.forEach(function(script, i) {
        var end = i === moduleScripts.length - 1 ? "'\n" : "',\n"; //no comma for last
        scriptPathsContent += "  './" + script.replace('.js', '') + end;
      });

      if (placeholderIndex > -1) {
        //replace everything after comment if it exists
        header = fileContent.substring(0, placeholderIndex + placeholder.length) + '\n';
      }
      newContent = header + scriptPathsContent + footer;

      // write to file (if file didn't exist, write if there is something to write)
      if (fileContent || (!fileContent && scriptPathsContent)) {
        fs.writeFileSync(allJs, newContent);
      }
    });
  }

  /**
   * @desc Creates libs.all.js which requires all libraries defined in main.js.
   *
   * libs.all.js needed for r.js to create combined lib bundle
   *
   * @param {string} mainJsPath
   * @param {string} destFolderPath
   */
  function generateLibsAllFile(mainJsPath, destFolderPath) {
    var dest = path.join(destFolderPath, 'libs.all.js');
    var allLibs = getLibPaths(mainJsPath);
    var fileContents = [
      'define([\n',
      '',
      '], function() {});'
    ];

    allLibs.forEach(function(lib) {
      if (lib) {
        fileContents[1] += "'" + lib + "',\n";
      }
    });

    fs.writeFileSync(dest, fileContents.join(''));
  }

  /**
   * @desc Transforms bundle name from build.config to filename
   *
   * e.g.:
   * app -> app.bundle
   * shared/components/components.all  -> shared-components.bundle
   * profile/profile.ctrl -> profile.bundle
   * ...
   *
   * @param {string} bundleName
   * @returns {string}
   */
  function getBundleFilename(bundleName) {
    var parts = bundleName.split('/');
    var pathParts = parts.slice(0, parts.length - 1);
    var dirname = pathParts.join('-');

    if (!dirname || dirname.length < 2) {
      return bundleName + '.bundle';
    }

    return dirname + '.bundle';
  }

  /////////////////////////// PRIVATE

  /**
   * @desc Gets libs paths from main file.
   *
   * @param {string} mainJsPath
   * @returns {Array}
   */
  function getLibPaths(mainJsPath) {
    var content = fs.readFileSync(mainJsPath, "utf8"),
      start = /\/\* libs-paths:start \*\//gim,
      end = /\/\* libs-paths:end \*\//gim;

    var libPathsSegment = '';
    var split = content.split(start);
    var splitTwo;
    split.forEach(function(item) {
      if(item.match(end)) {
        splitTwo = item.split(end);
        libPathsSegment += splitTwo[0];
      }
    });

    var libKeys = [];
    var objectKeyMatcher = /('|").*('|") *:/gi;
    var matches = libPathsSegment.match(objectKeyMatcher);
    matches.forEach(function(key) {
      libKeys.push(key.replace(/'/g, '').replace(':', ''));
    });

    return libKeys;
  }

  /**
   * @desc Returns array of direct subfolders names in directory
   *
   * @param {string} dir
   * @returns {Array}
   */
  function getSubfolders(dir) {
    return fs.readdirSync(dir)
      .filter(function(file) {
        return fs.statSync(path.join(dir, file)).isDirectory();
      });
  }


  /**
   * @desc Gets all bundle includes needed for main.js bundle config
   * @param {Array} modulesConfig - modules key from build.config.js
   * @returns {Object}
   */
  function getBundlesIncludeMap(modulesConfig) {
    var bundlesMap = {};

    modulesConfig.forEach(function(moduleConfig) {
      var bundleName = getBundleFilename(moduleConfig.name);
      var include = [moduleConfig.name];

      if (moduleConfig.include && moduleConfig.include.length) {
        include = include.concat(moduleConfig.include);
      }

      bundlesMap[bundleName] = include;
    });

    return bundlesMap;
  }

  /**
   * @desc Reads module js files and parses define[] arrays to get all external dependencies.
   *
   * Treats all requires not starting with ./ or ../ as external dependencies
   *
   * @param {Object} module
   * @param {string} moduleFolder - full filesystem path
   * @returns {string[]}
   */
  function getModuleExcludes(module, moduleFolder) {
    var dependencies = [];

    var scriptFiles = globby.sync(
      [path.join(moduleFolder, '**/*.js'), '!**/*.module.js', '!**/*.config.js', '!**/*.spec.js']
    );
    scriptFiles.forEach(function(script) {
      var fileContent = fs.readFileSync(script, 'utf8');
      var defineRegex = /define\((\[(.|\n)*?])/gi;
      var matches = defineRegex.exec(fileContent);

      if (matches) {
        var content = matches[1].replace(/'/g, '"');
        content = removeComments(content);
        var requires = JSON.parse(content);
        var externalRequires = requires.filter(function(path) {
          return path && path.indexOf('./') !== 0 && path.indexOf('../') !== 0;
        });
        dependencies = _.union(dependencies, externalRequires);
      }
    });

    // add .module files to excludes
    var moduleFiles = globby.sync(
      ['**/*.module.js'],
      { cwd: moduleFolder }
    );
    moduleFiles = getRequirePaths(moduleFiles, module.$path);
    dependencies = dependencies.concat(moduleFiles);

    return dependencies;

    function removeComments(code) {
      return code
        .replace(/\/\/.*/g, '') // line
        .replace(/\/\*(.|\n|\r)*?\*\//g, ''); /* multiline */
    }
  }

  /**
   * @desc Transforms relative module file paths to require paths
   * e.g.: list/list.ctrl.js -> timeReporting/absence/list/list.ctrl
   *
   * @param {Array} relativeFilePaths
   * @param {string} basePath
   * @returns {Array}
   */
  function getRequirePaths(relativeFilePaths, basePath) {
    return _.map(relativeFilePaths, function(path) {
      path = path.replace(/.js$/gi, '');
      return basePath + '/' + path;
    });
  }

};