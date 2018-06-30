#!/usr/bin/env node
const shouldBumpMinor = process.argv.indexOf("--bump-minor") >= 0;

require('../index').prepareForRelease({shouldBumpMinor: shouldBumpMinor});
