#!/usr/bin/env node
"use strict";

var shouldShrinkWrap = process.argv.indexOf("--no-shrinkwrap") < 0;
var shouldPublishToWixRegistry = process.argv.indexOf("--publish-to-wix-registry") >= 0;
var shouldPackQuietly = process.argv.indexOf("--pack-quietly") >= 0;

require('../index').prepareForRelease({
  shouldShrinkWrap: shouldShrinkWrap,
  shouldPublishToWixRegistry: shouldPublishToWixRegistry,
  shouldPackQuietly: shouldPackQuietly
}, function(err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
});
