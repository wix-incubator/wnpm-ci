"use strict";
var expect = require('chai').expect;
var _ = require('lodash');
var versionCalc = require('../lib/version-calculations');
var support = require('./support');
var shelljs = require('shelljs');
var commander = require('../lib/npm-commander');

var index = require('..');

describe('package', function () {
  this.timeout(60000);

  describe("#getRegistryPackageInfo", function () {

    it("should find package info of an existing package", function (done) {
      index.getRegistryPackageInfo('wnpm-ci', function (err, packageInfo) {
        expect(err).to.be.undefined;
        expect(packageInfo.repository.url).to.equal('git+https://github.com/wix/wnpm-ci.git', packageInfo.repository.url);
        done(err);
      });
    });

    it("should return undefined for a non-existing package", function (done) {
      index.getRegistryPackageInfo('i-really-hope-this-package-doesnt-exist', function (err, packageInfo) {
        expect(err).to.be.undefined;
        expect(packageInfo).to.be.undefined;
        done(err);
      });
    });
  });

  describe("#findPublishedVersions", function () {

    it("should find published versions of an existing package", function (done) {
      index.findPublishedVersions('wnpm-ci', function (err, publishedVersions) {
        expect(err).to.be.undefined;
        expect(_.take(publishedVersions, 7)).to.include.members(['6.2.0']);
        done(err);
      });
    });

    it("should return undefined for a non-existing package", function (done) {
      index.findPublishedVersions('i-really-hope-this-package-doesnt-exist', function (err, publishedVersions) {
        expect(err).to.be.undefined;
        expect(publishedVersions).to.be.undefined;
        done(err);
      });
    });
  });

  describe("#normalizeVersions", function () {

    it("should support version that is not an array (happens when there is only one version)", function () {
      expect(index.normalizeVersions("1.4")).to.deep.equal(["1.4"]);
    });

    it("should support no version", function () {
      expect(index.normalizeVersions(undefined)).to.deep.equal([]);
    });

    it("should support empty array", function () {
      expect(index.normalizeVersions([])).to.deep.equal([]);
    });

    it("should support empty string", function () {
      expect(index.normalizeVersions("")).to.deep.equal([]);
    });
  });

  describe("#incrementPatchVersionOfPackage", function () {
    var tempDir, packageJson;

    before(function () {
      tempDir = support.clone();
      packageJson = support.readPackageJson();
    });

    after(function () {
      support.rmFolder(tempDir);
    });

    it("should increment patch version of current package", function (done) {
      var currentPackageVersion = packageJson.version;

      index.findPublishedVersions(packageJson.name, function (err, publishedVersions) {
        if (err) {
          done(err);
          return;
        }

        var expectedNextVersion = versionCalc.calculateNextVersionPackage(currentPackageVersion,
          publishedVersions || []);

        index.incrementPatchVersionOfPackage(function (err, nextVersion) {
          expect(err).to.be.undefined;
          expect(nextVersion).to.equal(expectedNextVersion);
          expect(support.readPackageJson().version).to.equal(expectedNextVersion);
          if (err) {
            done(err);
            return;
          }
          // Ensure that if the increment is not needed, then it still won't fail
          index.incrementPatchVersionOfPackage(function (err, nextVersion) {
            expect(err).to.be.undefined;
            expect(nextVersion).to.equal(expectedNextVersion);
            expect(support.readPackageJson().version).to.equal(expectedNextVersion);
            done(err);
          });
        });
      });
    });
  });

  describe("#isSameAsPublished", function () {
    var tempDir, packageJson, packageName, packageVersion;

    const getPackage = (packegeName, cb) => {
      tempDir = support.cloneDir();
      commander.exec(`npm pack ${packegeName}`, function (err, output) {
        support.tarExtract(output, () => {
          shelljs.cd('./package');
          packageJson = support.readPackageJson();
          cb();
        });
      });
    };

    beforeEach(function (done) {
      var packageJson = support.readPackageJson();
      packageName = packageJson.name;
      packageVersion = packageJson.version;
      getPackage(packageName, done);
    });

    afterEach(function () {
      support.rmFolder(tempDir);
    });

    it("should not publish for already published version", function (done) {
      expect(index.isSameAsPublished(function (err, isSameAsPublished) {
        expect(isSameAsPublished).to.be.true;
        done();
      }))
    });

    it("should publish an updated version", function (done) {
      let aPackage = support.readPackageJson();
      aPackage.author = aPackage.author + ' bla bla ';
      support.writePackageJson(aPackage);

      expect(index.isSameAsPublished(function (err, isSameAsPublished) {
        expect(isSameAsPublished).to.be.false;
        done();
      }))
    });

    it('should load latest published version', (done) => {
      index.findPublishedVersions(packageName, (err, registryVersions) => {
        const expectedCurrentPublishedVersion = versionCalc.calculateCurrentPublished(packageVersion, registryVersions);
        expect(index.isSameAsPublished(function (err, isSameAsPublished, currentPublishedVersion) {
          expect(currentPublishedVersion).to.equal(expectedCurrentPublishedVersion);
          done();
        }))
      });
    });
  });
});
