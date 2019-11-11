const path = require('path');
const {expect} = require('chai');
const {execSync} = require('child_process');
const {prepareForRelease} = require('../index');
const versionFetcher = require('../lib/version-fetcher');
const packageHandler = require('../lib/package-handler');
const {aRegistryDriver} = require('./drivers/registry');

describe('wnpm-release', () => {

  it('should not release a new version if same tarball is published', async () => {
    const latest = execSync('npm view . dist-tags.latest').toString().trim();
    const cwd = await versionFetcher.fetch('wnpm-ci', latest);
    await prepareForRelease({cwd});

    const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(true);
    expect(pkg.version).to.equal(latest);
  });

  it('should bump patch by default', async () => {
    const cwd = await versionFetcher.fetch('wnpm-ci', '6.2.0');
    await prepareForRelease({cwd});

    const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.2.');
  });

  it('should bump minor', async () => {
    const cwd = await versionFetcher.fetch('wnpm-ci', '6.2.0');
    await prepareForRelease({cwd, shouldBumpMinor: true});

    const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.3.');
  });

  it('should not touch version if it was modifier manually', async () => {
    const cwd = await versionFetcher.fetch('wnpm-ci', '6.2.0');
    execSync(`npm version --no-git-tag-version 6.5.0`, {cwd});
    await prepareForRelease({cwd, shouldBumpMinor: true});

    const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.equal('6.5.0');
  });

  it('should support initial publish of new package', async () => {
    const cwd = await versionFetcher.fetch('wnpm-ci', '6.2.0');
    const json = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    await packageHandler.writePackageJson(path.join(cwd, 'package.json'), {...json, name: 'wnpm-kukuriku'});
    await prepareForRelease({cwd, shouldBumpMinor: true});

    const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.equal('6.2.0');
  });

  it('should bump version if comparing to published version fails', async () => {
    const cwd = await versionFetcher.fetch('wnpm-ci', '6.2.0');
    const originalFetch = versionFetcher.fetch;
    versionFetcher.fetch = () => Promise.reject(new Error("Failed!"));
    await prepareForRelease({cwd});
    versionFetcher.fetch = originalFetch;

    const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.2.');
  });

  describe('with custom registry', () => {
    let registry = aRegistryDriver();

    before(() =>
      registry.start());

    after(() =>
      registry.stop());

    it('should use a different set of registries if passed, when fetching version for bump', async () => {
      const packageName = `cool-npm-package`;
      const [olderVersion, mostRecentVersion, nextVersion] = ['4.5.23', '4.5.24', '4.5.25'];
      await registry.putPackageInRegistry({ packageName, version: olderVersion });
      await registry.putPackageInRegistry({ packageName, version: mostRecentVersion });

      const cwd = await registry.fetchPackage({ packageName, version: olderVersion });
      await prepareForRelease({ cwd, registries: [registry.getRegistryUrl()] });
  
      const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
      expect(pkg.version).to.equal(nextVersion);
    });
  })
});

describe('wnpm-release cli', () => {
  it('should bump patch by default', async () => {
    const cwd = await versionFetcher.fetch('wnpm-ci', '6.2.0');
    execSync(path.resolve(__dirname, '../scripts/wnpm-release.js'), {cwd});

    const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.2.');
  });

  it('should bump minor', async () => {
    const cwd = await versionFetcher.fetch('wnpm-ci', '6.2.0');
    execSync(path.resolve(__dirname, '../scripts/wnpm-release.js --bump-minor'), {cwd});
    const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
    expect(pkg.private).to.equal(undefined);
    expect(pkg.version).to.not.equal('6.2.0');
    expect(pkg.version).to.contain('6.3.');
  });
});
