"use strict";
var child_process = require('child_process');
var versionCalc = require('./lib/version-calculations');
var commander = require('./lib/npm-commander');
var DirectoryDiff = require('./lib/DirectoryDiff');
var VersionFetcher = require('./lib/VersionFetcher');
var PackageHandler = require('./lib/PackageHandler');
var VersionComparator = require('./lib/VersionComparator');
var shelljs = require('shelljs');
var fs = require('fs');
var randomDirGenerator = {generate: () => Math.ceil(Math.random() * 100000).toString()};

exports.getRegistryPackageInfo = function getRegistryPackageInfo(packageName, cb) {
  commander.readPackage(function (err, packageJson) {
    if (err)
      cb(err);

    var registry = packageJson.publishConfig && packageJson.publishConfig.registry;
    var registryOption = registry ? "--registry " + registry : "";

    commander.execSilent("npm view --cache-min=0 " + registryOption + " --json " + packageName, function (err, output) {
      if (err) {
        if (err.message.indexOf("npm ERR! code E404") >= 0) {
          cb(undefined, undefined);
        } else {
          console.error(err.message);
          cb(err);
        }
      } else {
        const result = JSON.parse(output);
        console.log('Version resolved from registry:', result['dist-tags'].latest);
        cb(undefined, result);
      }
    });
  });
};

exports.findPublishedVersions = function findPublishedVersions(packageName, cb) {
  exports.getRegistryPackageInfo(packageName, function (err, registryPackageinfo) {
    if (err)
      cb(err);
    else if (registryPackageinfo === undefined)
      cb(undefined, undefined);
    else
      cb(undefined, exports.normalizeVersions(registryPackageinfo.versions));
  });
};

exports.normalizeVersions = function normalizeVersions(versions) {
  if (!versions)
    return [];

  if (typeof versions === 'string')
    return [versions];
  else
    return versions;
};

exports.isSameAsPublished = function isAlreadyPublished(cb) {
  commander.readPackage(function (err, packageJson) {
    var packageName = packageJson.name;

    exports.findPublishedVersions(packageName, function (err, registryVersions) {
      if (err) {
        cb(err);
        return;
      }

      var localPackageVersion = packageJson.version;
      var currentPublishedVersion = versionCalc.calculateCurrentPublished(localPackageVersion, registryVersions || []);

      if (currentPublishedVersion) {
        var packageHandler = PackageHandler(fs, shelljs);
        var versionFetcher = VersionFetcher(commander, shelljs, randomDirGenerator, packageHandler);
        var directoryDiff = DirectoryDiff(shelljs);
        var versionComparator = VersionComparator(directoryDiff, versionFetcher, shelljs);

        versionComparator.compare(packageName, currentPublishedVersion)
          .then(isPublishedVersionSimilar => cb(undefined, isPublishedVersionSimilar, currentPublishedVersion))
          .catch(err => cb(err));
      } else {
        cb(undefined, false);
      }
    });
  });
};

exports.incrementPatchVersionOfPackage = function incrementPatchVersionOfPackage(cb) {
  // We can't just require('package.json') because this code may be called from other packages
  // as part of the build process (see README.md)
  commander.readPackage(function (err, packageJson) {
    var packageName = packageJson.name;

    exports.findPublishedVersions(packageName, function (err, registryVersions) {
      if (err) {
        cb(err);
        return;
      }

      var localPackageVersion = packageJson.version;

      var nextVersion = versionCalc.calculateNextVersionPackage(localPackageVersion, registryVersions || []);

      if (nextVersion === localPackageVersion) {
        process.nextTick(function () {
          cb(undefined, nextVersion);
        });
        return;
      }

      commander.exec("npm version --no-git-tag-version " + nextVersion, function (err) {
        err ? cb(err, undefined) : cb(undefined, nextVersion);
      });

    });
  });
};

exports.publishPackage = function publishPackage(options, cb) {
  // backwards compatibility: there was no options parameter.
  if (typeof options !== 'object' && !cb) {
    cb = options;
    options = {};
  }
  if (!process.env['IS_BUILD_AGENT']) {
    console.warn('not publishing package because we\'re not running in a CI build agent');
    cb();
    return;
  }

  function publishTheDamnThing(cb) {
    commander.exec("npm publish .", cb);
  }

  if (!options.registry)
    return publishTheDamnThing(cb);

  // We can't use --registry because https://github.com/npm/npm/issues/5522.
  // So we have to change the package.json, and then change it back again!
  commander.readPackage(function (err, packageJson) {
    if (err)
      return cb(err);

    var overridenPackageJson = Object.assign({}, packageJson, {publishConfig: {registry: options.registry}});

    commander.writePackage(overridenPackageJson, function (err) {
      if (err)
        return cb(err);

      publishTheDamnThing(function (err) {
        if (err)
          return cb(err);

        // change it back again
        commander.writePackage(packageJson, cb);
      });
    });
  });
};

exports.shrinkwrapPackage = function (cb) {
  commander.exec("npm shrinkwrap", function (err) {
    cb(err);
  });
};

exports.prepareForRelease = function (options, cb) {
  // backwards compatibility: there was no options parameter. Instead shouldShrinkwrap was sent as first parameter
  if (typeof options !== 'object')
    options = {shouldShrinkWrap: options};

  commander.setup();

  commander.readPackage(function (err, packageJson) {
    if (err) {
      cb(err);
      return;
    }

    if (packageJson.private) {
      console.log("No release because package is private");
      cb();
      return;
    }
    exports.isSameAsPublished((err, isPublishedVersionSimilar, currentPublishedVersion) => {
      if (err) {
        cb(err);
        return;
      }

      if (isPublishedVersionSimilar) {
        packageJson.private = true;
        packageJson.version = currentPublishedVersion;
        commander.writePackage(packageJson, (err)=> {
          console.log("No release because it's already published");
          cb(err);
          return;
        }); // don't publish
      } else {
        exports.incrementPatchVersionOfPackage(function (err) {
          if (err) {
            cb(err);
            return;
          }

          function continue1(cb) {
            if (options.shouldPublishToWixRegistry)
              exports.publishPackage({registry: "http://repo.dev.wix/artifactory/api/npm/npm-local/"}, cb);
            else
              cb();
          }

          if (options.shouldShrinkWrap) {
            exports.shrinkwrapPackage(function (err) {
              if (err) {
                cb(err);
              }
              else
                continue1(cb);
            });
          }
          else
            continue1(cb);
        });
      }
    });
  });
};
