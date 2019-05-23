const path = require('path');
const {execSync} = require('child_process');
const {compare} = require('./lib/version-comparator');
const packageHandler = require('./lib/package-handler');
const versionCalculations = require('./lib/version-calculations');

function getRegistryPackageInfo(cwd) {
  try {
    return JSON.parse(execSync('npm view --cache-min=0 --json', {cwd, stdio: 'pipe'}));
  } catch (e) {
    if (e.message.indexOf('npm ERR! code E404') >= 0) {
      return undefined;
    } else {
      throw e;
    }
  }
}

function findPublishedVersions(cwd) {
  const result = getRegistryPackageInfo(cwd);
  return normalizeVersions(result && result.versions);
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

function isSameAsPublished(registryVersions, options) {
  const localPackageVersion = packageHandler.readPackageJson(path.join(options.cwd, 'package.json')).version;
  const currentPublishedVersion = versionCalculations.calculateCurrentPublished(localPackageVersion, registryVersions, options);

  if (currentPublishedVersion && compare(options.cwd, currentPublishedVersion)) {
    return currentPublishedVersion;
  } else {
    return false;
  }
}

function incrementVersionOfPackage(registryVersions, options) {
  const localPackageVersion = packageHandler.readPackageJson(path.join(options.cwd, 'package.json')).version;
  const nextVersion = versionCalculations.calculateNextVersionPackage(localPackageVersion, registryVersions, options);

  if (nextVersion !== localPackageVersion) {
    writePackageVersion(nextVersion, options.cwd);
  }
  return nextVersion;
}

function writePackageVersion(version, cwd) {
  execSync(`npm version --no-git-tag-version ${version}`, {cwd});
}

function prepareForRelease(options) {
  options = options || {};
  options.cwd = options.cwd || process.cwd();

  const pkg = packageHandler.readPackageJson(path.join(options.cwd, 'package.json'));

  if (pkg.private) {
    console.log('No release because package is private');
  } else {
    if (process.env.DANGEROUSLY_FORCE_PKG_VERSION && (!process.env.DANGEROUSLY_FORCE_PKG_NAME || process.env.DANGEROUSLY_FORCE_PKG_NAME === pkg.name)) {
      console.log(`Forcing package ${pkg.name} version ${process.env.DANGEROUSLY_FORCE_PKG_VERSION}`);
      writePackageVersion(process.env.DANGEROUSLY_FORCE_PKG_VERSION, options.cwd);
      return;
    }
    
    const registryVersions = findPublishedVersions(options.cwd);
    let currentPublishedVersion;

    try {
      currentPublishedVersion = isSameAsPublished(registryVersions, options);
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
      packageHandler.writePackageJson(path.join(options.cwd, 'package.json'), pkg);
      console.log('No release because similar tarball is already published');
    } else {
      incrementVersionOfPackage(registryVersions, options);
    }
  }
}

module.exports = {
  prepareForRelease
};
