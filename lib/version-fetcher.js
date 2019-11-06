const fs = require('fs-extra');
const tmp = require('tmp');
const path = require('path');
const util = require('util');
const execa = require('execa');
const packageHandler = require('./package-handler');

const tmpDirAsync = util.promisify(tmp.dir)

async function copyNpmrc(dirName, cwd) {
  if (dirName) {
    const npmrc = path.join(dirName, '.npmrc');
    if (await fs.exists(npmrc)) {
      await fs.copyFile(npmrc, path.join(cwd, '.npmrc'));
    }
  }
}

module.exports = {
  fetch: async (name, version, dirName) => {
    const cwd = await tmpDirAsync({unsafeCleanup: true});

    await copyNpmrc(dirName, cwd);

    const archiveName = await execa(`npm pack ${name}@${version} --quiet`, {cwd, shell: true})
      .then(p => p.stdout)
      .then(stdout => stdout.trim())

    await execa(`tar -xf ${archiveName}`, {cwd, shell: true});
    return `${cwd}/package`;
  },

  cloneAndPack: async (dirName) => {
    const cwd = await tmpDirAsync({unsafeCleanup: true});
    await execa(`npm pack ${dirName} --quiet`, {cwd, shell: true});
    await execa(`tar -xf *.tgz`, {cwd, shell: true});
    return `${cwd}/package`;
  },

  copyVersion: async (remotePath, localPath, name, transformer) => {
    transformer = transformer || (x => x);
    try {
      const localFile = path.join(localPath, name);
      const remoteFile = path.join(remotePath, name);
      let currPackage = transformer(await packageHandler.readPackageJson(localFile));
      let remotePackage = transformer(await packageHandler.readPackageJson(remoteFile));
      currPackage.version = remotePackage.version;
      await packageHandler.writePackageJson(localFile, currPackage);
      await packageHandler.writePackageJson(remoteFile, remotePackage);
    } catch (e) {
      //
    }
  }
};
