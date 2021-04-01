import * as t from "@babel/types";

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

  if (!firstArg?.node?.properties) {
    return false;
  }

  const defaultMessageProperty = firstArg.node.properties.find(
    (property) => property.key.name === "defaultMessage"
  );

  if (!defaultMessageProperty) {
    const idProperty = firstArg.node.properties.find(
      (property) => property.key.name === "id"
    );

    if (!idProperty?.value?.value) {
      return false;
    }

    const defaultMessage = defaultMessages[idProperty.value.value];

    if (!defaultMessage) {
      return false;
    }

    firstArg.pushContainer(
      "properties",
      t.objectProperty(
        t.identifier("defaultMessage"),
        t.stringLiteral(defaultMessage)
      )
    );

    return true;
  }

  return false;
};
