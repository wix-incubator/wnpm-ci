"use strict";
var sinon = require('sinon');
var expect = require('chai').expect;
var VersionComparator = require('../lib/VersionComparator');

describe('VersionComparator', () => {
  const aVersion = "v1";
  const aPackageName = 'aPackageName';
  const pathToPackedVersion = 'pathToPackedVersion';
  const pathToRemoteVersion = 'pathToRemoteVersion';
  const cwd = 'cwd';

  let shell;
  let versionFetcher;
  let directoryComparePaths;
  let versionComparator;

  beforeEach(() => {
    shell = {
      pwd: sinon.stub().returns(cwd),
      cd: sinon.stub().returns(),
      popd: sinon.stub().returns()
    };

    versionFetcher = {
      copyVersion: sinon.stub().returns(),
      fetch: sinon.stub().returns(Promise.resolve(pathToRemoteVersion)),
      cloneAndPack: sinon.stub().returns(Promise.resolve(pathToPackedVersion)),
      cleanup: sinon.stub().returns(),
    };

    directoryComparePaths = {
      compareDirectories: sinon.stub().returns(Promise.resolve(''))
    };

    versionComparator = VersionComparator(directoryComparePaths, versionFetcher, shell);
  });

  it("should fetch each version and pass it into the directory Diff", (done) => {
    versionComparator.compare(aPackageName, aVersion).then(() => {
      expect(directoryComparePaths.compareDirectories.calledWith(pathToPackedVersion, pathToRemoteVersion));
      done();
    });
  });

  it("should overwrite current version with pathToRemoteVersion", (done) => {
    versionComparator.compare(aPackageName, aVersion).then(() => {
      expect(versionFetcher.copyVersion.calledWith(pathToPackedVersion, pathToRemoteVersion, 'package.json'));
      expect(versionFetcher.copyVersion.calledWith(pathToPackedVersion, pathToRemoteVersion, 'npm-shrinkwrap.json'));
      expect(versionFetcher.copyVersion.secondCall.args[3]({version: '1', x: '1', o: {version: '2', x: '2'}}))
        .to.eql({version: '1', o: {version: '2'}});
      done();
    });
  });

  it('should cleanup after done', (done) => {
    versionComparator.compare(aPackageName, aVersion).then(() => {
      expect(versionFetcher.cleanup.called).to.be.true;
      done();
    });
  });

//   describe("should propagate errors", () => {
//     const errorValue = 'fail';

//     it('compare dir error', (done) => {
//       directoryComparePaths.compareDirectories.returns(Promise.reject(errorValue));

//       const versionComparator = VersionComparator(directoryComparePaths, versionFetcher, shell);
//       versionComparator.compare(aPackageName, aVersion).catch((err) => {
//         expect(err).to.be.equal(errorValue);
//         done();
//       })
//     });

//     it('version fetcher fetch fails', (done) => {
//       versionFetcher.fetch.returns(Promise.reject(errorValue));

//       const versionComparator = VersionComparator(directoryComparePaths, versionFetcher, shell);
//       versionComparator.compare(aPackageName, aVersion).catch((err) => {
//         expect(err).to.be.equal(errorValue);
//         done();
//       })
//     });

//     it('version fetcher cloneAndPack fails', (done) => {
//       versionFetcher.cloneAndPack.returns(Promise.reject(errorValue));

//       const versionComparator = VersionComparator(directoryComparePaths, versionFetcher, shell);
//       versionComparator.compare(aPackageName, aVersion).catch((err) => {
//         expect(err).to.be.equal(errorValue);
//         done();
//       })
//     });
//   });

  it("should return to starting cwd", (done) => {
    const versionComparator = VersionComparator(directoryComparePaths, versionFetcher, shell);

    versionComparator.compare(aPackageName, aVersion).then(() => {
      shell.cd.calledWith(cwd);
      shell.cd.calledAfter(versionFetcher.fetch);
      shell.cd.calledAfter(versionFetcher.cloneAndPack);
      done()
    });
  });
});
