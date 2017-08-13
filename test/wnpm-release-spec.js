"use strict";
var expect = require('chai').expect;
var versionCalc = require('../lib/version-calculations');
var _ = require('lodash');
var support = require('./support');
var shelljs = require('shelljs');
var intercept = require('intercept-stdout');
var semver = require('semver');

var index = require('..');

function updatePackageContent() {
  support.addLineToReadme();
}

describe("wnpm-release", function () {
  // This test will work only in CI given that it's a destructive test (it really publishes!)
  // If you want to test it locally, do `IS_BUILD_AGENT=1 npm test`
  if (!process.env.IS_BUILD_AGENT)
    return;

  this.timeout(100000);
  var tempDir, packageJson, unhook, output;

  beforeEach(function () {
    unhook = intercept(function (txt) {
      output += txt;
    });
  });

  afterEach(function () {
    unhook();
    packageJson = null;
    support.rmFolder(tempDir);
  });

  describe('for private package', function () {

    beforeEach(function () {
      tempDir = support.clone({private: true, name: 'npm-module-for-testing-publish'});
      updatePackageContent();
    });

    it("should do nothing if package is private", function (done) {
      shelljs.exec('node ' + __dirname + "/../scripts/wnpm-release", function (code) {
        expect(code).to.equal(0);
        expect(shelljs.test('-f', 'npm-shrinkwrap.json')).to.be.false;
        done();
      });
    });
  });

  describe.skip('for regular package', function () {
    beforeEach(function () {
      tempDir = support.clone({name: 'npm-module-for-testing-publish'});
      updatePackageContent();
      packageJson = support.readPackageJson();
    });

    it("should work with shrinkwrap", function (done) {
      var currentPackageVersion = packageJson.version;
      var packageName = packageJson.name;

      index.findPublishedVersions(packageName, function (err, publishedVersions) {
        if (err) {
          done(err);
        } else {
          var expectedNextVersion = versionCalc.calculateNextVersionPackage(currentPackageVersion,
            publishedVersions || []);

          shelljs.exec('node ' + __dirname + "/../scripts/wnpm-release", function (code) {
            expect(code).to.equal(0);
            expect(shelljs.test('-f', 'npm-shrinkwrap.json')).to.be.true;
            checkPublishing(packageName, expectedNextVersion, done);
          });
        }
      });
    });

    it("should work without shrinkwrap", function (done) {
      var currentPackageVersion = packageJson.version;
      var packageName = packageJson.name;

      index.findPublishedVersions(packageName, function (err, publishedVersions) {
        if (err) {
          done(err);
        } else {
          var expectedNextVersion = versionCalc.calculateNextVersionPackage(currentPackageVersion,
            publishedVersions || []);

          shelljs.exec('node ' + __dirname + "/../scripts/wnpm-release --no-shrinkwrap", function (code) {
            expect(code).to.equal(0);
            expect(shelljs.test('-f', 'npm-shrinkwrap.json')).to.be.false;

            checkPublishing_oldSignatureVersion(packageName, expectedNextVersion, done);
          });
        }
      });
    });

    it("should publish if --publish-to-wix-registry", function (done) {
      function packageJsonWithUnpublishableRepoButPublishableVersion(packageJson, version) {
        return _.assign({}, packageJson, {version: version, publishConfig: {registry: 'http://registry.npmjs.org'}});
      }

      function getVersionThatShouldntBeInTheRegistry(version) {
        var semverVersion = semver.parse(version);
        semverVersion.inc('minor');
        semverVersion.patch = Math.ceil(Math.random() * 10000);

        return semverVersion.format();
      }

      var currentPackageVersion = packageJson.version;
      var packageName = packageJson.name;

      index.findPublishedVersions(packageName, function (err, publishedVersions) {
        if (err) {
          done(err);
        } else {
          var expectedNextVersion = versionCalc.calculateNextVersionPackage(currentPackageVersion,
            publishedVersions || []);
          var newlyExpectedNextVersion = getVersionThatShouldntBeInTheRegistry(expectedNextVersion);
          var packageJson = support.readPackageJson();

          support.writePackageJson(packageJsonWithUnpublishableRepoButPublishableVersion(packageJson,
            newlyExpectedNextVersion));

          shelljs.exec('node ' + __dirname + "/../scripts/wnpm-release --publish-to-wix-registry", function (code) {
            expect(code).to.equal(0);

            support.writePackageJson(packageJson);
            ensurePublishedVersionIncludesVersion(packageName, newlyExpectedNextVersion, 10, function (err, ensured) {
              expect(err).to.be.undefined;
              expect(ensured).to.be.true;

              done(err);
            });
          });
        }
      });
    });

    it("should not publish if package wasn't updated", function (done) {
      const packageName = packageJson.name;
      const currentPackageVersion = packageJson.version;

      index.findPublishedVersions(packageName, function (err, publishedVersions) {
        if (err) {
          done(err);
        } else {
          var expectedNextVersion = versionCalc.calculateNextVersionPackage(currentPackageVersion,
            publishedVersions || []);

          shelljs.exec('node ' + __dirname + "/../scripts/wnpm-release --publish-to-wix-registry", function (code) {
            expect(code).to.equal(0);

            ensurePublishedVersionIncludesVersion(packageName, expectedNextVersion, 10, function (err, ensured) {
              expect(err).to.be.undefined;
              expect(ensured).to.be.true;

              resetPackageVersionTo(currentPackageVersion);

              shelljs.exec('node ' + __dirname + "/../scripts/wnpm-release --publish-to-wix-registry", function (code) {
                expect(code).to.equal(0);
                const packageJson = support.readPackageJson();

                expect(packageJson.private).to.be.true;
                expect(packageJson.version).to.equal(expectedNextVersion);
                expect(output).to.be.string("No release because it's already published");
                done();
              });
            });
          })
        }
      })
    });

    function resetPackageVersionTo(currentPackageVersion) {
      packageJson.version = currentPackageVersion;
      support.writePackageJson(packageJson);
    }
  });

  describe('for package with .nvmrc', function () {
    beforeEach(function () {
      tempDir = support.clone({name: 'npm-module-for-testing-publish'});
      updatePackageContent();
      packageJson = support.readPackageJson();
    });

    it("should run commands via nvm", function (done) {
      shelljs.exec('node ' + __dirname + "/../scripts/wnpm-release", function (code) {
        expect(code).to.equal(0);
        expect(shelljs.test('-f', '.nvmrc')).to.be.true;
        expect(output).to.be.string('Running \'nvm exec npm view');
        expect(output).to.be.string('Running \'nvm exec npm shrinkwrap');
        done();
      });
    });
  });

  describe('for package without .nvmrc', function () {

    beforeEach(function () {
      tempDir = support.clone({name: 'npm-module-for-testing-publish'});
      updatePackageContent();
      shelljs.rm('.nvmrc');
    });

    it("should run commands via nvm", function (done) {
      shelljs.exec('node ' + __dirname + "/../scripts/wnpm-release --no-shrinkwrap", function (code) {
        expect(code).to.equal(0);
        expect(shelljs.test('-f', '.nvmrc')).to.be.false;
        expect(output).to.be.string('Running \'npm view');
        done();
      });
    });

  })
});

// remove backwards compatibility in Jun/2016
function checkPublishing_oldSignatureVersion(packageName, expectedNextVersion, done) {
  // While we don't publish as part of the release process, I *do* publish here to
  // check that what we created is publishable.
  index.publishPackage(function (err) {
    if (err) {
      done(err);
    } else {
      // artifactory takes time until the published version is in the list of versions
      ensurePublishedVersionIncludesVersion(packageName, expectedNextVersion, 10, function (err, ensured) {
        expect(err).to.be.undefined;
        expect(ensured).to.be.true;

        done(err);
      });
    }
  });
}


function checkPublishing(packageName, expectedNextVersion, done) {
  // While we don't publish as part of the release process, I *do* publish here to
  // check that what we created is publishable.
  index.publishPackage({}, function (err) {
    if (err) {
      done(err);
    } else {
      ensurePublishedVersionIncludesVersion(packageName, expectedNextVersion, 10, function (err, ensured) {
        expect(err).to.be.undefined;
        expect(ensured).to.be.true;

        done(err);
      });
    }
  });
}

function ensurePublishedVersionIncludesVersion(packageName, expectedVersion, countDown, cb) {
  // artifactory takes time until the published version is in the list of versions, hence the countdown
  index.findPublishedVersions(packageName, function (err, publishedVersions) {
    if (err) {
      cb(err);
    } else if (_.find(publishedVersions, function (v) {
        return v === expectedVersion
      })) {
      cb(undefined, true);
    } else if (countDown > 0)
      setTimeout(function () {
        console.log("retrying version checking #" + countDown);
        ensurePublishedVersionIncludesVersion(packageName, expectedVersion, countDown - 1, cb)
      }, 1000);
    else {
      cb(undefined, false);
    }
  });
}

