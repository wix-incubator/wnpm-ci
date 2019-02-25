const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const {execSync} = require('child_process');
const packageHandler = require('./package-handler');

function copyNpmrc(dirName, cwd) {
  if (dirName) {
    const npmrc = path.join(dirName, '.npmrc');
    if (fs.existsSync(npmrc)) {
      fs.copyFileSync(npmrc, path.join(cwd, '.npmrc'));
    }
  }
}

module.exports = {
  fetch: (name, version, dirName) => {
    const cwd = tmp.dirSync({unsafeCleanup: true}).name;
    copyNpmrc(dirName, cwd);
    const archiveName = execSync(`npm pack ${name}@${version} --quiet`, {cwd}).toString().trim();
    execSync(`tar -xf ${archiveName}`, {cwd});
    return `${cwd}/package`;
  },

  cloneAndPack: (dirName) => {
    const cwd = tmp.dirSync({unsafeCleanup: true}).name;
    const archiveName = execSync(`npm pack ${dirName} --quiet`, {cwd}).toString();
    execSync(`tar -xf *.tgz`, {cwd});
    return `${cwd}/package`;
  },

  copyVersion: (remotePath, localPath, name, transformer) => {
    transformer = transformer || (x => x);
    try {
      const localFile = path.join(localPath, name);
      const remoteFile = path.join(remotePath, name);
      let currPackage = transformer(packageHandler.readPackageJson(localFile));
      let remotePackage = transformer(packageHandler.readPackageJson(remoteFile));
      currPackage.version = remotePackage.version;
      packageHandler.writePackageJson(localFile, currPackage);
      packageHandler.writePackageJson(remoteFile, remotePackage);
    } catch (e) {
      //
    }
  }
};
