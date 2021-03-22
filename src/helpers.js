import * as types from "@babel/types";

const t = types.default;

export const DEFAULT_DEFAULT_MESSAGE = "@TODO";

export const isFormatMessageCall = ({ callee }) => {
  return (
    callee.name === "formatMessage" ||
    (t.isMemberExpression(callee) &&
      t.isIdentifier(callee.property, { name: "formatMessage" }))
  );
};

export const getDefaultMessageJSXAttribute = (path) => {
  return path
    .get("attributes")
    .find((attribute) =>
      t.isJSXIdentifier(attribute.node.name, { name: "defaultMessage" })
    );
};

export const insertDefaultMessageProperty = ({ path, defaultMessages }) => {
  const [firstArg] = path.get("arguments");

  const defaultMessageProperty = firstArg.node.properties.find(
    (property) => property.key.name === "defaultMessage"
  );

  if (!defaultMessageProperty) {
    const idProperty = firstArg.node.properties.find(
      (property) => property.key.name === "id"
    );

    const defaultMessage =
      defaultMessages[idProperty.value.value] || DEFAULT_DEFAULT_MESSAGE;

    firstArg.pushContainer(
      "properties",
      t.objectProperty(
        t.identifier("defaultMessage"),
        t.stringLiteral(defaultMessage)
      )
    );
  }
};
