#!/usr/bin/env node

const { Command } = require("commander");
const apply = require("./apply");
const { version } = require("../package.json");

const program = new Command();
program.version(version);

program
  .option("-s, --source <file>", ".json file with the default messages")
  .option("-t, --target <glob>", "glob pattern for target files");

program.parse(process.argv);

const options = program.opts();

apply.default(options);
