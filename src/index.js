#!/usr/bin/env node

const { Command } = require("commander");
const apply = require("./apply");
const { version } = require("../package.json");

const program = new Command();
program.version(version);

program
  .option("-s, --source <file>", ".json file with the default messages")
  .option("-t, --target <glob>", "glob pattern for target files")
  .option("-np, --no-prettify", "do not prettify output", false)
  .option(
    "-pc, --prettify-cfg <config>",
    "custom prettier config file (defaults to auto-resolve near target files)"
  );

program.parse(process.argv);

const options = program.opts();

apply.default(options);
