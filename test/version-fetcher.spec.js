const tmp = require('tmp');
const path = require('path');
const {expect, use} = require('chai');
const chaiAsPromised = require('chai-as-promised');
const versionFetcher = require('../lib/version-fetcher');
const packageHandler = require('../lib/package-handler');

use(chaiAsPromised);

describe('version-fetcher', () => {
  it('should retrieve the version from npm and pack it', async () => {
    const dirName = versionFetcher.fetch('wnpm-ci', '6.2.0');
    const pkg = await packageHandler.readPackageJson(path.join(dirName, 'package.json'));
    expect(pkg.name).to.equal('wnpm-ci');
    expect(pkg.version).to.equal('6.2.0');
  });

  it('should pack current package', async () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    const dirName = versionFetcher.cloneAndPack(cwd);
    const pkg = await packageHandler.readPackageJson(path.join(dirName, 'package.json'));
    expect(pkg.name).to.equal('wnpm-ci');
    expect(pkg.version).to.equal('6.2.0');
    expect(dirName).to.not.equal(cwd);
  });

  it('should copy the version from one package to another', async () => {
    const remotePath = tmp.dirSync({unsafeCleanup: true}).name;
    const localPath = tmp.dirSync({unsafeCleanup: true}).name;
    const remoteFile = path.join(remotePath, 'kaki.json');
    const localFile = path.join(localPath, 'kaki.json');
    const remoteVersion = 'remote version';
    const localVersion = 'local version';

    await packageHandler.writePackageJson(remoteFile, {version: remoteVersion});
    await packageHandler.writePackageJson(localFile, {version: localVersion});

    await versionFetcher.copyVersion(remotePath, localPath, 'kaki.json', x => Object.assign(x, {abc: 123}));

    const localPkg = await packageHandler.readPackageJson(localFile);
    const remotePkg = await packageHandler.readPackageJson(remoteFile);

    expect(remotePkg).to.eql(localPkg);
    expect(localPkg.version).to.eql(remoteVersion);
    expect(localPkg.abc).to.eql(123);
  });

  it('should ignore exceptions when copying versions', async () => {
    await versionFetcher.copyVersion('/a', '/b', 'kaki.json');
  });

  it('should propagate errors in fetch', () => {
    expect(() => versionFetcher.fetch('wnpm-ci', '0.0.1')).to.throw();
  });

  it('should propagate errors in cloneAndPack', () => {
    expect(() => versionFetcher.cloneAndPack('/no-such-dir')).to.throw();
  });
});
