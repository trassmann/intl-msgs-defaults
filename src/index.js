import { Command } from "commander/esm.mjs";
import fg from "fast-glob";
import * as fs from "fs/promises";
import * as parser from "@babel/parser";
import traverser from "@babel/traverse";
import generator from "@babel/generator";
import * as types from "@babel/types";

const traverse = traverser.default;
const generate = generator.default;
const t = types.default;

const program = new Command();
program.version("0.0.1");

program
  .option("-s, --source <file>", "the .json file with the default messages")
  .option("-t, --target <glob>", "glob pattern for target files");

program.parse(process.argv);

const options = program.opts();

const { source: sourceFilepath, target: targetGlob } = options;

const targetFiles = await fg([targetGlob]);

const sourceFileHandle = await fs.open(sourceFilepath);
const sourceFileContent = await sourceFileHandle.readFile({ encoding: "utf8" });
const jsonSource = JSON.parse(sourceFileContent);
sourceFileHandle.close();

for (const targetFile of targetFiles) {
  const sourceFileHandle = await fs.open(targetFile);
  const code = await sourceFileHandle.readFile({ encoding: "utf8" });
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  traverse(ast, {
    JSXOpeningElement: (path) => {
      if (t.isJSXIdentifier(path.node.name, { name: "FormattedMessage" })) {
        path.traverse({
          JSXAttribute: (path) => {
            if (t.isJSXIdentifier(path.node.name, { name: "id" })) {
              const defaultMessage =
                jsonSource[path.node.value.value] || "@TODO";
              path.insertAfter(
                t.jsxAttribute(
                  t.jsxIdentifier("defaultMessage"),
                  t.stringLiteral(defaultMessage)
                )
              );
            }
          },
        });
      }
    },
    CallExpression: (path) => {
      if (path.node.callee.name === "formatMessage") {
        const [firstArg] = path.get("arguments");
        const idProperty = firstArg.node.properties.find(
          (property) => property.key.name === "id"
        );
        const defaultMessage = jsonSource[idProperty.value.value] || "@TODO";
        firstArg.pushContainer(
          "properties",
          t.objectProperty(
            t.identifier("defaultMessage"),
            t.stringLiteral(defaultMessage)
          )
        );
      }
    },
  });

  const output = generate(ast, {});

  console.log(output);
}
