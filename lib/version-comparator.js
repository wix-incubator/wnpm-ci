const path = require('path');
const versionFetcher = require('./version-fetcher');
const packageHandler = require('./package-handler');
const {compareDirectories} = require('./directory-diff');

module.exports = {
  compare: async (cwd, version) => {
    const currVersionPath = await versionFetcher.cloneAndPack(cwd);
    const {name} = await packageHandler.readPackageJson(path.join(cwd, 'package.json'))
    const remoteVersionPath = await versionFetcher.fetch(name, version, cwd);
    return await compareDirectories(remoteVersionPath, currVersionPath);
  },
  compareVersions: async (cwd, a, b) => {
    const {name} = await packageHandler.readPackageJson(path.join(cwd, 'package.json'))
    const aVersionPath = await versionFetcher.fetch(name, a, cwd);
    const bVersionPath = await versionFetcher.fetch(name, b, cwd);
    return await compareDirectories(aVersionPath, bVersionPath);
  }
};
