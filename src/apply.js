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
  DEFAULT_DEFAULT_MESSAGE,
} from "./helpers";

export default async (options) => {
  const { source: sourceFilepath, target: targetGlob, prettify } = options;

  const targetFiles = await fg([targetGlob]);

  const sourceFileHandle = await fs.open(sourceFilepath);
  const sourceFileContent = await sourceFileHandle.readFile({
    encoding: "utf8",
  });
  const defaultMessages = JSON.parse(sourceFileContent);
  sourceFileHandle.close();

  let prettierConfig;
  if (prettify !== false) {
    prettierConfig = await prettier.resolveConfig(
      prettify === true ? targetFiles[0] : prettify
    );
  }

  for (const targetFile of targetFiles) {
    const code = await fs.readFile(targetFile, "utf8");
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "classProperties"],
    });

    let writeChanges = false;

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

    if (writeChanges) {
      let { code: output } = generate(ast, {
        retainLines: true,
        retainFunctionParens: true,
      });

      if (prettify) {
        output = prettier.format(output, {
          parser: "babel",
          ...prettierConfig,
        });
      }

      await fs.writeFile(targetFile, output, "utf8");

      console.log(targetFile, "done");
    }
  }
};
