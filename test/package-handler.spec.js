"use script";

const fs = require('fs');
const tmp = require('tmp');
const path = require('path');
const {expect} = require('chai');
const process = require('process');
const packageHandler = require('../lib/package-handler');

describe('package-handler', () => {
  let dirName, pwd;
  beforeEach(() => {
    dirName = tmp.dirSync({unsafeCleanup: true}).name;
    pwd = process.cwd();
  });
  afterEach(() => process.chdir(pwd));

  it('should read a package from path', async () => {
    const fileName = path.join(dirName, 'package.json');
    const obj = {version: 123};
    fs.writeFileSync(fileName, JSON.stringify(obj));
    expect(await packageHandler.readPackageJson(fileName)).to.eql(obj);
  });

  it('should write a package to path', async () => {
    const fileName = path.join(dirName, 'package.json');
    await packageHandler.writePackageJson(fileName, {});
    expect(fs.readFileSync(fileName).toString()).to.be.equal(JSON.stringify({}));
  });

  it('should read a package from relative path', async () => {
    const obj = {version: 123};
    fs.writeFileSync(path.join(dirName, 'package.json'), JSON.stringify(obj));
    process.chdir(dirName);
    expect(await packageHandler.readPackageJson('package.json')).to.eql(obj);
  });

  it('should write a package to relative path', async () => {
    await packageHandler.writePackageJson(path.join(dirName, 'package.json'), {});
    process.chdir(dirName);
    expect(fs.readFileSync('package.json').toString()).to.be.equal(JSON.stringify({}));
  });
});
