# wnpm-ci

# What is this module
This module contains all you need to have the ci build an npm package in the CI servers.

This module exports a bin (`wnpm-release`) that knows how to build and release a module the wix standard way.
It also exports functions that can help write an alternative release logic if somebody wants to.
  
# How to create an NPM module that works in CI
* Create a package with the following mandatory things in the package.json
  * `name`
  * `version`
  * One of two: 
    * `publishConfig.registry` pointing to `http://repo.dev.wix/artifactory/api/npm/npm-local/` or...
    * `publishConfig.registry` pointing to `https://registry.npmjs.org/` if you want to publish it to the public repository (for an open source npm module), or...
    * `private: true` if you don't want to publish the module     
* Run `npm install --save-dev wnpm-ci` to install this package
* Ensure that you have a "build" script in your package.json. If you have nothing to do in this step, make it `":"`
* Ensure that you have a "test" script in your package.json. If you have nothing to do in this step, make it `":"`
* Ensure that you have a "release" script in your package.json, and make 
this `"wnpm-release"` (the wnpm-release will be coming from this package, which you installed earlier)
  * If you publish the module to a registry that is not Wix's, you can choose to cross-publish it to the Wix registry
    using `wnpmrelease --publish-to-wix-registry`.
* Add a pom.xml, because currently CI does not work without a pom.xml. 
This requirement will be removed in the near future. See below for a minimal pom.xml
* If your package is using dependencies from the Wix NPM repo, it should contain an `.npmrc` file at its root directory with the line `registry=http://repo.dev.wix/artifactory/api/npm/npm-repos`.
    
## A minimal package.json with all the above
```json
{
  "name": "my-package",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "http://repo.dev.wix/artifactory/api/npm/npm-local/"
  },
  "scripts": {
    "build": ":", 
    "test": ":",
    "release": "wnpm-release # This will ensure that ci publishes the module"
  },
  "devDependencies": {
    "wnpm-ci": "*"
  }
}
```

## A more typical package.json with all the above
```json
{
  "name": "my-package",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "http://repo.dev.wix/artifactory/api/npm/npm-local/"
  },
  "scripts": {
    "build": "babel src --out-dir lib", 
    "test": "mocha",
    "release": "wnpm-release # This will ensure that ci publishes the module"
  },
  "devDependencies": {
    "wnpm-ci": "*"
  }
}
```

## A minimal pom.xml for an npm module
Replace the text between the *****
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">

    <groupId>****GROUPID****</groupId>
    <artifactId>****ARTIFACT ID****</artifactId>
    <name>***NAME OF MODULE***</name>
    <description> </description>

    <parent>
        <groupId>com.wixpress.common</groupId>
        <artifactId>wix-master-parent</artifactId>
        <version>100.0.0-SNAPSHOT</version>
        <relativePath />
    </parent>

    <modelVersion>4.0.0</modelVersion>
    <version>1.1.0-SNAPSHOT</version>
    <packaging>pom</packaging>
</project>
```

# How does CI build and release an NPM module?
* CI will look for a file named `build.js` in the root of the module. If it exists, it will `node build.js`-it.
* If not, it will use its own `build.js` which does the following:
  * `npm install` - no need to do anything
  * `npm run build`
  * `npm test`
  * If package is not private (https://docs.npmjs.com/files/package.json#private): `npm run release` 
* Once done, it will publish the package, assuming it is not private

## What does `wnpm-release` do?
* Nothing if the package is private. Leave it there still for future use.
* Increments the version in package.json so that publishing will succeed 
  (see below to understand the algorithm of version incrementing)
  * Note that since CI is running `wnpm-release` during the build, the version change in `package.json` will not be committed to git
* shrinkwraps the package so that the published package will always use the dependent versions 
  that are the same as the ones at the time of the build
  * Note that since CI does this, it will not be committed to git
  * If you don't like this behavior, you can use `wnpm-release --no-shrinkwrap` instead
* If the registry in the `publishConfig` is not Wix's internal registry, 
  you can also do `wnpm-release --publish-to-wix-registry` to make `wnpm-release` publish it to the Wix registry
* If you want to silent the logs from `npm pack`, pass `--pack-quietly`  


## How `wnpm-release` increments the version
* TL;DR - it increments by one the patch version of the latest patch version in the npm registry
* It increments only the patch version (i.e. the '5' in 3.4.5)
* It reads the registry to retrieve the published versions of this package.
* It ignores all versions who's major.minor versions are not the same as the major.minor version in the package.
* It takes the latest patch number of the biggest versions in the list of unignored version from previous bullet
* If the version found in the previous bullet is bigger than the version in the package.json, it uses it (and increments it by one) otherwise it uses the version in the package.json

**What it means**: Think of each list of 'major.minor' versions as a branch. The algorithm finds the branch of the version in the package json, and ignores all other branches. If the branch is empty, it will just use the version in package.json, otherwise it will use the Max of (the latest version in the branch, the package.json version) + 1.

# What if I don't like what `wnpm-release` does?
Write your own! We even give you all the logic that we use in our own `wnpm-release`, as an api:

* `require('wnpm-ci')` exposes various apis that you can use to build your own release logic.
* `require('wnpm-ci/lib/version-calculations')` exposes more apis that can also be used
