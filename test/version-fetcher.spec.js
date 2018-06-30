const tmp = require('tmp');
const path = require('path');
const {expect} = require('chai');
const versionFetcher = require('../lib/version-fetcher');
const packageHandler = require('../lib/package-handler');

describe('version-fetcher', () => {
  it('should retrieve the version from npm and pack it', () => {
    const dirName = versionFetcher.fetch('wnpm-ci', '6.2.0');
    const pkg = packageHandler.readPackageJson(path.join(dirName, 'package.json'));
    expect(pkg.name).to.equal('wnpm-ci');
    expect(pkg.version).to.equal('6.2.0');
  });

  it('should pack current package', () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    const dirName = versionFetcher.cloneAndPack(cwd);
    const pkg = packageHandler.readPackageJson(path.join(dirName, 'package.json'));
    expect(pkg.name).to.equal('wnpm-ci');
    expect(pkg.version).to.equal('6.2.0');
    expect(dirName).to.not.equal(cwd);
  });

  it('should copy the version from one package to another', () => {
    const remotePath = tmp.dirSync({unsafeCleanup: true}).name;
    const localPath = tmp.dirSync({unsafeCleanup: true}).name;
    const remoteFile = path.join(remotePath, 'kaki.json');
    const localFile = path.join(localPath, 'kaki.json');
    const remoteVersion = 'remote version';
    const localVersion = 'local version';

    packageHandler.writePackageJson(remoteFile, {version: remoteVersion});
    packageHandler.writePackageJson(localFile, {version: localVersion});

    versionFetcher.copyVersion(remotePath, localPath, 'kaki.json', x => Object.assign(x, {abc: 123}));
    expect(packageHandler.readPackageJson(remoteFile)).to.eql(packageHandler.readPackageJson(localFile));
    expect(packageHandler.readPackageJson(localFile).version).to.eql(remoteVersion);
    expect(packageHandler.readPackageJson(localFile).abc).to.eql(123);
  });

  it('should ignore exceptions when copying versions', () => {
    versionFetcher.copyVersion('/a', '/b', 'kaki.json');
  });

  it('should propagate errors in fetch', () => {
    expect(() => versionFetcher.fetch('wnpm-ci', '0.0.1')).to.throw();
  });

  it('should propagate errors in cloneAndPack', () => {
    expect(() => versionFetcher.cloneAndPack('/no-such-dir')).to.throw();
  });
});
