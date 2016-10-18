"use script";
var assert = require('chai').assert;
var expect = require('chai').expect;
var _ = require('lodash');
var PackageHandler = require('../lib/PackageHandler');

describe('PackageHandler', () => {
  it('should read a package from path', () => {
    const fs = {};
    const obj = {version: 123};
    const shelljs = {
      cat: (path) => {
        if (path == `/1/2/3/kaki.json`) {
          return JSON.stringify(obj)
        }
        throw 'up';
      }
    };
    const packageHandler = PackageHandler(fs, shelljs);
    assert.deepEqual(packageHandler.readPackageJson('/1/2/3/kaki.json'), obj);
  });

  it('should write a package to path', () => {
    const fs = {
      writeFileSync: (path, aPackage) => {
        expect(path).to.equal('/1/2/3/kaki.json');
        expect(aPackage).to.be.equal(JSON.stringify({}));
      }
    };
    const shelljs = {};
    const packageHandler = PackageHandler(fs, shelljs);
    packageHandler.writePackageJson('/1/2/3/kaki.json', {});
  });
});
