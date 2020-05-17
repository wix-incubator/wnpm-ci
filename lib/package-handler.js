const fs = require('fs-extra')
const path = require('path')

module.exports = {
  writePackageJson: async (pathToPackage, packageJson) => {
    await fs.outputJson(path.resolve(pathToPackage), packageJson, {spaces: 2})
  },
  readPackageJson: async (pathToPackage) => {
    return await fs.readJson(path.resolve(pathToPackage))
  }
}
