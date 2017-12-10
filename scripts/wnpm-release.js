#!/usr/bin/env node
"use strict";

var shouldShrinkWrap = process.argv.indexOf("--no-shrinkwrap") < 0;
var shouldPublishToWixRegistry = process.argv.indexOf("--publish-to-wix-registry") >= 0;
var shouldPackQuietly = process.argv.indexOf("--pack-quietly") >= 0;
var shouldOnlyKeepProductionDependencies = process.argv.indexOf("--only-production") >= 0;

if(!shouldShrinkWrap && shouldOnlyKeepProductionDependencies) {
  console.log("--only-production is only supported with a shrinkwrap file.");
  process.exit(1);
}

require('../index').prepareForRelease({
  shouldShrinkWrap: shouldShrinkWrap,
  shouldPublishToWixRegistry: shouldPublishToWixRegistry,
  shouldPackQuietly: shouldPackQuietly
  shouldOnlyKeepProductionDependencies: shouldOnlyKeepProductionDependencies
}, function(err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
});
