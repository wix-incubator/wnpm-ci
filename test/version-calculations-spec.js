"use strict";
var assert = require('assert');
var versionCalc = require('../lib/version-calculations');

var publishedVersionsToTest = ['1.1.1', '1.1.2', '5.1.3', '5.4.0', '5.3.2', '5.4.1', '5.4.3'];

describe('version-calculations', function () {
  describe('#calculateNextVersionPackage', function () {
    it("should return a patch version increment when it's part of the latest 'branch'", function () {
      assert.equal('5.4.4', versionCalc.calculateNextVersionPackage('5.4.1', publishedVersionsToTest));
    });

    it("should return a patch version increment when it's part of a previous 'branch'", function () {
      assert.equal('1.1.3', versionCalc.calculateNextVersionPackage('1.1.1', publishedVersionsToTest));
    });

    it("should return itself when it's the largest version of the latest 'branch'", function () {
      assert.equal('5.4.5', versionCalc.calculateNextVersionPackage('5.4.5', publishedVersionsToTest));
    });

    it("should return itself when it's the largest version of the previous 'branch'", function () {
      assert.equal('1.1.4', versionCalc.calculateNextVersionPackage('1.1.4', publishedVersionsToTest));
    });

    it("should return itself when it's the only version of a 'branch'", function () {
      assert.equal('2.0.4', versionCalc.calculateNextVersionPackage('2.0.4', publishedVersionsToTest));
    });

    it("should return itself when it's the only version of the previous 'branch'", function () {
      assert.equal('2.0.4', versionCalc.calculateNextVersionPackage('2.0.4', publishedVersionsToTest));
    });

    it("should return a patch version increment when it's the same as the latest version of the latest 'branch'", function () {
      assert.equal('5.4.4', versionCalc.calculateNextVersionPackage('5.4.3', publishedVersionsToTest));
    });

    it("should return a patch version increment when it's the same as the latest version of the previous 'branch'", function () {
      assert.equal('1.1.3', versionCalc.calculateNextVersionPackage('1.1.2', publishedVersionsToTest));
    });

    it("should return itself when no published versions", function () {
      assert.equal('1.1.3', versionCalc.calculateNextVersionPackage('1.1.3', []));
    });
  });

  describe('#calculateLatestPublishedVersion', () => {
    it('#calculateCurrentPublished ', () => {
      assert.equal('5.4.3', versionCalc.calculateCurrentPublished('5.4.1', publishedVersionsToTest));
      assert.equal('1.1.2', versionCalc.calculateCurrentPublished('1.1.1', publishedVersionsToTest));
      assert.equal('5.4.3', versionCalc.calculateCurrentPublished('5.4.3', publishedVersionsToTest));
      assert.equal('1.1.2', versionCalc.calculateCurrentPublished('1.1.2', publishedVersionsToTest));
    });

    it('should return false when current package version is not published', () => {
      assert.equal(false, versionCalc.calculateCurrentPublished('5.4.5', publishedVersionsToTest));
      assert.equal(false, versionCalc.calculateCurrentPublished('1.1.4', publishedVersionsToTest));
      assert.equal(false, versionCalc.calculateCurrentPublished('2.0.4', publishedVersionsToTest));
      assert.equal(false, versionCalc.calculateCurrentPublished('2.0.4', publishedVersionsToTest));
      assert.equal(false, versionCalc.calculateCurrentPublished('1.1.3', []));
    })
  });
});
