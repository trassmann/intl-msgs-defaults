import fg from "fast-glob";
import { promises as fs } from "fs";
import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import prettier from "prettier";

import {
  isFormatMessageCall,
  insertDefaultMessageProperty,
  getDefaultMessageJSXAttribute,
} from "./helpers";

export default async (options) => {
  const {
    source: sourceFilepath,
    target: targetGlob,
    prettifyCfg,
    noPrettify,
  } = options;

  const targetFiles = await fg([targetGlob]);

  const sourceFileHandle = await fs.open(sourceFilepath);
  const sourceFileContent = await sourceFileHandle.readFile({
    encoding: "utf8",
  });
  const defaultMessages = JSON.parse(sourceFileContent);
  sourceFileHandle.close();

  let prettierConfig;
  if (!noPrettify) {
    prettierConfig = await prettier.resolveConfig(
      prettifyCfg || targetFiles[0]
    );
  }

  for (const targetFile of targetFiles) {
    let ast;
    try {
      const code = await fs.readFile(targetFile, "utf8");
      ast = parser.parse(code, {
        sourceType: "module",
        plugins: ["jsx", "classProperties"],
      });
    } catch (err) {
      console.error(`Failed to parse or read file: ${targetFile}`, err);
    }

    let writeChanges = false;

    if (ast) {
      try {
        traverse(ast, {
          JSXOpeningElement: (path) => {
            if (
              t.isJSXIdentifier(path.node.name, { name: "FormattedMessage" })
            ) {
              const defaultMessageAttribute = getDefaultMessageJSXAttribute(
                path
              );

              if (!defaultMessageAttribute) {
                path.traverse({
                  JSXAttribute: (attributePath) => {
                    if (attributePath.parentPath !== path) {
                      return;
                    }

                    if (
                      t.isJSXIdentifier(attributePath.node.name, {
                        name: "id",
                      })
                    ) {
                      const defaultMessage =
                        defaultMessages[attributePath.node.value.value];

                      if (!defaultMessage) {
                        return;
                      }

                      attributePath.insertAfter(
                        t.jsxAttribute(
                          t.jsxIdentifier("defaultMessage"),
                          t.stringLiteral(defaultMessage)
                        )
                      );

                      writeChanges = true;
                    }
                  },
                });
              }
            }
          },
          CallExpression: (path) => {
            if (isFormatMessageCall({ callee: path.node.callee })) {
              writeChanges = insertDefaultMessageProperty({
                path,
                defaultMessages,
              });
            }
          },
        });
      } catch (err) {
        console.error(
          `Something went wrong traversing the AST of ${targetFile}!`,
          err
        );
      }
    }

    if (ast && writeChanges) {
      try {
        let { code: output } = generate(ast, {
          retainLines: true,
          retainFunctionParens: true,
        });

        if (!noPrettify) {
          output = prettier.format(output, {
            parser: "babel",
            ...prettierConfig,
          });
        }

        await fs.writeFile(targetFile, output, "utf8");

        console.log(targetFile, "done");
      } catch (err) {
        console.error(
          `Something went wrong writing the output for ${targetFile}!`,
          err
        );
      }
    }
  }
};
