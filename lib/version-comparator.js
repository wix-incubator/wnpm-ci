const path = require('path');
const versionFetcher = require('./version-fetcher');
const packageHandler = require('./package-handler');
const {compareDirectories} = require('./directory-diff');
const execa = require('execa');

const getChecksum = async (registryUrl, pkgName, version) => {
  const {stdout} = await execa(`npm view --registry=${registryUrl} --@wix:registry=${registryUrl} --cache-min=0 ${pkgName}@${version} checksum`, {shell: true});
  return stdout;
};

async function compareHash(pkgName, currVersionPath, currentPublishedVersion, registryUrl) {
  const [checksum1, checksum2] = await Promise.all([
    calculateHash(currVersionPath),
    getChecksum(registryUrl, pkgName, currentPublishedVersion)
  ]);
  return checksum1 === checksum2 ? currentPublishedVersion : false;
}

async function compareVersionsHash(pkgName, localVersion, currentPublishedVersion, registryUrl) {
  const versions = [localVersion, currentPublishedVersion];
  const [checksum1, checksum2] = await Promise.all(versions.map(v => getChecksum(registryUrl, pkgName, v)));
  return checksum1 === checksum2 ? currentPublishedVersion : false;
}

async function calculateHash(cwd) {
  const { hashElement } = require('folder-hash');
  const options = {
    folders: { exclude: ['.*', 'node_modules', 'test_coverage'] },
    files: { include: ['*.js', '*.json'] }
  };
  const {hash} = await hashElement(cwd, options);
  return hash;
}

module.exports = {
  calculateHash,
  compareHash,
  compareVersionsHash,
  compare: async (cwd, version, {checkHashInPackageJson, registries} = {}) => {
    const currVersionPath = await versionFetcher.cloneAndPack(cwd);
    const {name} = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));

    if (checkHashInPackageJson) {
      return compareHash(name, currVersionPath, version, registries[0]);
    }

    const remoteVersionPath = await versionFetcher.fetch(name, version, cwd);
    return await compareDirectories(remoteVersionPath, currVersionPath);
  },
  compareVersions: async (cwd, a, b, {checkHashInPackageJson, registries} = {}) => {
    const {name} = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    if (checkHashInPackageJson) {
      return await compareVersionsHash(name, a, b, registries[0]);
    }
    const aVersionPath = await versionFetcher.fetch(name, a, cwd);
    const bVersionPath = await versionFetcher.fetch(name, b, cwd);
    return await compareDirectories(aVersionPath, bVersionPath);
  }
};
