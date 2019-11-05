const fs = require('fs-extra');
const path = require('path');

module.exports = {
  writePackageJson: async (pathToPackage, packageJson) => {
    await fs.writeFile(path.resolve(pathToPackage), JSON.stringify(packageJson, null, 2), {encoding: 'utf-8'});
  },
  readPackageJson: async (pathToPackage) => {
    return JSON.parse(await fs.readFile(path.resolve(pathToPackage)));
  }
};
