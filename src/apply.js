import fg from "fast-glob";
import { promises as fs } from "fs";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

import {
  isFormatMessageCall,
  insertDefaultMessageProperty,
  getDefaultMessageJSXAttribute,
  DEFAULT_DEFAULT_MESSAGE,
} from "./helpers";

export default async (options) => {
  const { source: sourceFilepath, target: targetGlob } = options;

  const targetFiles = await fg([targetGlob]);

  const sourceFileHandle = await fs.open(sourceFilepath);
  const sourceFileContent = await sourceFileHandle.readFile({
    encoding: "utf8",
  });
  const defaultMessages = JSON.parse(sourceFileContent);
  sourceFileHandle.close();

  for (const targetFile of targetFiles) {
    const code = await fs.readFile(targetFile, "utf8");
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
                if (
                  t.isJSXIdentifier(attributePath.node.name, { name: "id" })
                ) {
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

    const output = generate(ast, {
      retainLines: true,
      retainFunctionParens: true,
    });

    await fs.writeFile(targetFile, output.code, "utf8");

    console.log(targetFile, "done");
  }
};
