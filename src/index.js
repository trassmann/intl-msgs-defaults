import { Command } from "commander/esm.mjs";
import fg from "fast-glob";
import * as fs from "fs/promises";
import * as parser from "@babel/parser";
import traverser from "@babel/traverse";
import generator from "@babel/generator";
import * as types from "@babel/types";

import {
  isFormatMessageCall,
  insertDefaultMessageProperty,
  getDefaultMessageJSXAttribute,
  DEFAULT_DEFAULT_MESSAGE,
} from "./helpers.js";

const traverse = traverser.default;
const generate = generator.default;
const t = types.default;

const program = new Command();
program.version("0.0.1");

program
  .option("-s, --source <file>", ".json file with the default messages")
  .option("-t, --target <glob>", "glob pattern for target files");

program.parse(process.argv);

const options = program.opts();

const { source: sourceFilepath, target: targetGlob } = options;

const targetFiles = await fg([targetGlob]);

const sourceFileHandle = await fs.open(sourceFilepath);
const sourceFileContent = await sourceFileHandle.readFile({ encoding: "utf8" });
const defaultMessages = JSON.parse(sourceFileContent);
sourceFileHandle.close();

for (const targetFile of targetFiles) {
  const targetFileHandle = await fs.open(targetFile, "r+");
  const code = await targetFileHandle.readFile({ encoding: "utf8" });
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  traverse(ast, {
    JSXOpeningElement: (path) => {
      if (t.isJSXIdentifier(path.node.name, { name: "FormattedMessage" })) {
        const defaultMessageAttribute = getDefaultMessageJSXAttribute(path);
        if (!defaultMessageAttribute) {
          path.traverse({
            JSXAttribute: (attributePath) => {
              if (t.isJSXIdentifier(attributePath.node.name, { name: "id" })) {
                const defaultMessage =
                  defaultMessages[attributePath.node.value.value] ||
                  DEFAULT_DEFAULT_MESSAGE;

                attributePath.insertAfter(
                  t.jsxAttribute(
                    t.jsxIdentifier("defaultMessage"),
                    t.stringLiteral(defaultMessage)
                  )
                );
              }
            },
          });
        }
      }
    },
    CallExpression: (path) => {
      if (isFormatMessageCall({ callee: path.node.callee })) {
        insertDefaultMessageProperty({ path, defaultMessages });
      }
    },
  });

  const output = generate(ast, {});

  await targetFileHandle.write(output.code, 0, "utf8");
  await targetFileHandle.close();

  console.log(targetFile, "done");
}
