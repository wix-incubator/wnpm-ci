const fs = require('fs-extra')
const tmp = require('tmp')
const path = require('path')
const util = require('util')
const execa = require('execa')
const packageHandler = require('./package-handler')

const tmpDirAsync = util.promisify(tmp.dir)

async function copyNpmrc(dirName, cwd) {
  if (dirName) {
    const npmrc = path.join(dirName, '.npmrc')
    if (await fs.exists(npmrc)) {
      await fs.copyFile(npmrc, path.join(cwd, '.npmrc'))
    }
  }
}

module.exports = {
  fetch: async (name, version, dirName) => {
    const cwd = await tmpDirAsync({unsafeCleanup: true})

    await copyNpmrc(dirName, cwd)

    const archiveName = await execa(`npm pack ${name}@${version} --quiet`, { cwd, shell: true, env: {
      ...process.env,
      npm_config_registry: undefined // Make sure npm pack uses the registry from the package.json or the .npmtc
    }})
      .then(p => p.stdout)
      .then(stdout => stdout.trim())

    await execa(`tar -xf ${archiveName}`, {cwd, shell: true})
    return `${cwd}/package`
  },

  cloneAndPack: async (dirName) => {
    const cwd = await tmpDirAsync({unsafeCleanup: true})
    await execa(`npm pack ${dirName} --quiet`, {cwd, shell: true})
    await execa('tar -xf *.tgz', {cwd, shell: true})
    return `${cwd}/package`
  },

  copyVersion: async (remotePath, localPath, name, transformer) => {
    transformer = transformer || (x => x)
    try {
      const localFile = path.join(localPath, name)
      const remoteFile = path.join(remotePath, name)
      const currPackage = transformer(await packageHandler.readPackageJson(localFile))
      const remotePackage = transformer(await packageHandler.readPackageJson(remoteFile))
      currPackage.version = remotePackage.version
      currPackage.gitHead = remotePackage.gitHead //Does not exist in local version
      currPackage.publishConfig = remotePackage.publishConfig //Might be modified in remote to both public and private registry
      currPackage['build-time'] = remotePackage['build-time'] //Added by SLH to packages and can't be compared
      currPackage.sha = remotePackage.sha //Added by SLH to packages and can't be compared
      currPackage.checksum = remotePackage.checksum //Added by SLH to packages and can't be compared
      currPackage.uniqePublishIdentifier = remotePackage.uniqePublishIdentifier //Added by CI to packages and can't be compared
      fs.removeSync(path.join(remotePath, 'ver')) // this files is added by CI to builds
      fs.removeSync(path.join(localPath, 'ver')) // this files is added by CI to builds
      await packageHandler.writePackageJson(localFile, currPackage)
      await packageHandler.writePackageJson(remoteFile, remotePackage)
    } catch (e) {
      //
    }
  }
}
