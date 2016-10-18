"use strict";
var expect = require('chai').expect;
var DirectoryDiff = require('../lib/DirectoryDiff');
var sinon = require('sinon');

describe('DirectoryDiff', () => {
  let shelljs, directoryDiff;

  beforeEach(() => {
    shelljs = {exec: sinon.stub()};

    directoryDiff = DirectoryDiff(shelljs);
  });

  function givenDiffReturns(code, output, stderr) {
    shelljs.exec.callsArgWith(1, code, output, stderr);
  }

  it('should call linux diff', () => {
    givenDiffReturns(0, 'output');

    directoryDiff.compareDirectories('v1', 'v2').then(_ => {
      sinon.assert.calledWith(shelljs.exec, 'diff -rq v1 v2');
      done();
    });
  });

  it("should return true when code is 0", (done) => {
    givenDiffReturns(0, 'output');

    directoryDiff.compareDirectories('v1', 'v2').then(areTheSame => {
      expect(areTheSame).to.be.true;
      done();
    });
  });

  it("should return false when diff returns code 1", (done) => {
    givenDiffReturns(1, "output", 'stderr');

    directoryDiff.compareDirectories('v1', 'v2').then(areTheSame => {
      expect(areTheSame).to.be.false;
      done();
    });
  });

  it('should return err when diff returns code 2', (done) => {
    const errorValue = 'error';
    givenDiffReturns(2, "123", errorValue);

    directoryDiff.compareDirectories('v1', 'v2').catch(err => {
      expect(err).to.be.equal(errorValue);
      done();
    });
  });
});
