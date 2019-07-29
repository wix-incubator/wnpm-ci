const fs = require('fs');
const path = require('path');
const {expect} = require('chai');
const {execSync} = require('child_process');
const {prepareForRelease} = require('../index');
const versionFetcher = require('../lib/version-fetcher');
const packageHandler = require('../lib/package-handler');

describe('wnpm-release', () => {
  it('should not release a new version if same tarball is published', async () => {
    const latest = execSync('npm view . dist-tags.latest').toString().trim();
    const cwd = versionFetcher.fetch('wnpm-ci', latest);
    await prepareForRelease({cwd});

    const pkg = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(true);
    expect(pkg.version).to.equal(latest);
  });

  it('should bump patch by default', async () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    await prepareForRelease({cwd});

    const pkg = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.2.');
  });

  it('should bump minor', async () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    await prepareForRelease({cwd, shouldBumpMinor: true});

    const pkg = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.3.');
  });

  it('should not touch version if it was modifier manually', async () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    execSync(`npm version --no-git-tag-version 6.5.0`, {cwd});
    await prepareForRelease({cwd, shouldBumpMinor: true});

    const pkg = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.equal('6.5.0');
  });

  it('should support initial publish of new package', async () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    const json = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    packageHandler.writePackageJson(path.join(cwd, 'package.json'), {...json, name: 'wnpm-kukuriku'});
    await prepareForRelease({cwd, shouldBumpMinor: true});

    const pkg = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.equal('6.2.0');
  });

  it('should bump version if comparing to published version fails', async () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    const originalFetch = versionFetcher.fetch;
    versionFetcher.fetch = () => { throw new Error("Failed!")};
    await prepareForRelease({cwd});
    versionFetcher.fetch = originalFetch;

    const pkg = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.2.');
  });
});

describe('wnpm-release cli', () => {
  it('should bump patch by default', () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    execSync(path.resolve(__dirname, '../scripts/wnpm-release.js'), {cwd});

    const pkg = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.2.');
  });

  it('should bump minor', () => {
    const cwd = versionFetcher.fetch('wnpm-ci', '6.2.0');
    execSync(path.resolve(__dirname, '../scripts/wnpm-release.js --bump-minor'), {cwd});
    const pkg = packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.3.');
  });
});
