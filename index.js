const path = require('path');
const execa = require('execa');
const {compare} = require('./lib/version-comparator');
const packageHandler = require('./lib/package-handler');
const versionCalculations = require('./lib/version-calculations');
const writeGitHead = require('./lib/write-git-head');

async function maybeGetPackageInfo(pkgName, registryUrl) {
  try {
    const {stdout} = await execa(`npm view --registry=${registryUrl} --@wix:registry=${registryUrl} --cache-min=0 --json ${pkgName}`, {shell: true});
    return JSON.parse(stdout);
  } catch (e) {
    return null;
  }
}

async function findPublishedVersionsOnAllRegistries(cwd) {
  const pkg = await packageHandler.readPackageJson(path.join(cwd, 'package.json'));
  const unscopedPackageName = pkg.name.replace('@wix/', '');
  const scopedPackageName = `@wix/${unscopedPackageName}`;

  const packagesInfo = (await Promise.all([
    maybeGetPackageInfo(unscopedPackageName, 'https://npm.dev.wixpress.com/'),
    maybeGetPackageInfo(scopedPackageName, 'https://npm.dev.wixpress.com/'),
    maybeGetPackageInfo(scopedPackageName, 'https://registry.npmjs.org/'),
    // if package is unscoped and public on npmjs
    ...(pkg.publishConfig && pkg.publishConfig.registry === 'https://registry.npmjs.org/' && pkg.name === unscopedPackageName ? [maybeGetPackageInfo(unscopedPackageName, 'https://registry.npmjs.org/')] : [])
  ])).filter(pkgInfo => !!pkgInfo);
  
  const versions = packagesInfo.reduce((acc, pkgInfo) => {
    const pkgVersions = normalizeVersions(pkgInfo.versions);
    return acc.concat(pkgVersions);
  }, []);

  const uniqueVersions = [...new Set(versions)];

  // This is just to report stats from all registries
  const currentPublishedVersion = versionCalculations.calculateCurrentPublished(pkg.version, uniqueVersions);
  console.log(`currentPublishedVersion`, currentPublishedVersion);
  packagesInfo.forEach(pkgInfo => {
    const registry = pkgInfo.dist.tarball.split('/').slice(0,3).join('/');
    console.log(`registry: ${registry} pkgName: ${pkgInfo.name} dist-tags: ${JSON.stringify(pkgInfo['dist-tags'])}`);
  })

  return uniqueVersions;
}

function normalizeVersions(versions) {
  if (!versions) {
    return [];
  } else if (typeof versions === 'string') {
    return [versions];
  } else {
    return versions;
  }
}

async function isSameAsPublished(registryVersions, options) {
  const localPackageVersion = (await packageHandler.readPackageJson(path.join(options.cwd, 'package.json'))).version;
  const currentPublishedVersion = versionCalculations.calculateCurrentPublished(localPackageVersion, registryVersions, options);

  if (currentPublishedVersion && await compare(options.cwd, currentPublishedVersion)) {
    return currentPublishedVersion;
  } else {
    return false;
  }
}

async function incrementVersionOfPackage(registryVersions, options) {
  const localPackageVersion = (await packageHandler.readPackageJson(path.join(options.cwd, 'package.json'))).version;
  const nextVersion = versionCalculations.calculateNextVersionPackage(localPackageVersion, registryVersions, options);

  if (nextVersion !== localPackageVersion) {
    await writePackageVersion(nextVersion, options.cwd);
  }
  return nextVersion;
}

async function writePackageVersion(version, cwd) {
  await execa(`npm version --no-git-tag-version ${version}`, {shell: true, cwd});
}

async function prepareForRelease(options) {
  options = options || {};
  options.cwd = options.cwd || process.cwd();

  const pkg = await packageHandler.readPackageJson(path.join(options.cwd, 'package.json'));

  if (pkg.private) {
    console.log('No release because package is private');
  } else {
    writeGitHead(options.cwd);

    if (process.env.DANGEROUSLY_FORCE_PKG_VERSION && (!process.env.DANGEROUSLY_FORCE_PKG_NAME || process.env.DANGEROUSLY_FORCE_PKG_NAME === pkg.name)) {
      console.log(`Forcing package ${pkg.name} version ${process.env.DANGEROUSLY_FORCE_PKG_VERSION}`);
      await writePackageVersion(process.env.DANGEROUSLY_FORCE_PKG_VERSION, options.cwd);
      return;
    }

    const registryVersions = await findPublishedVersionsOnAllRegistries(options.cwd);
    let currentPublishedVersion;

    try {
      currentPublishedVersion = await isSameAsPublished(registryVersions, options);
    }
    catch (err) {
      console.log("An error has occurred while comparing current version to published version:");
      console.log(err.stack || err);
      console.log("Since comparing the versions has failed, a new version will still be released!");
      currentPublishedVersion = false;
    }

    if (currentPublishedVersion) {
      pkg.private = true;
      pkg.version = currentPublishedVersion;
      await packageHandler.writePackageJson(path.join(options.cwd, 'package.json'), pkg);
      console.log('No release because similar tarball is already published');
    } else {
      await incrementVersionOfPackage(registryVersions, options);
    }
  }
}

module.exports = {
  prepareForRelease,
};
