"use strict";
var path = require('path');
var thenify = require('thenify');

module.exports = (commander, shell, randomDirGenerator, packageHandler) => {
  function generateRandomDir() {
    return path.resolve(shell.tempdir(), randomDirGenerator.generate());
  }

  function shellExec(cmd, cb) {
    shell.exec(cmd, (code, stdout, stderr) => {
      if (code != 0) {
        cb(stderr)
      } else {
        cb(undefined, stdout)
      }
    })
  }

  function rm(path) {
    shell.rm('-rf', path);
  }

  function generateDirectory() {
    const randomDir = generateRandomDir();
    shell.mkdir(randomDir);
    createdDirs.push(randomDir);
    return randomDir
  }

  commander.exec = thenify(commander.exec);

  shellExec = thenify(shellExec);

  let createdDirs = [];

  return {
    fetch: (name, version) => {
      const randomDir = generateDirectory();
      shell.pushd(randomDir);
      return commander.exec(`npm pack ${name}@${version}`)
        .then((output) => shellExec(`tar -xf ${output.trim()}`))
        .then(() => `${randomDir}/package`)
    },

    cloneAndPack: (cwd) => {
      let randomDir = generateDirectory();
      shell.pushd(randomDir);
      return commander.exec(`npm pack ${cwd}`)
        .then(() => shellExec(`tar -xf *.tgz`))
        .then(()=>`${randomDir}/package`)
    },

    copyVersion: (remotePath, localPath, name, transformer) => {
      transformer = transformer || function (x) {
        return x;
      };
      try {
        const localFile = path.join(localPath, name);
        const remoteFile = path.join(remotePath, name);
        let currPackage = transformer(packageHandler.readPackageJson(localFile));
        let remotePackage = transformer(packageHandler.readPackageJson(remoteFile));
        currPackage.version = remotePackage.version;
        packageHandler.writePackageJson(localFile, currPackage);
        packageHandler.writePackageJson(remoteFile, remotePackage);
      } catch (e) {}
    },

    cleanup: () => {
      createdDirs.forEach(dir => {
        shell.popd();
        rm(dir)
      });
      createdDirs = [];
    }
  };
};
