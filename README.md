# intl-msgs-defaults

Automatically applies `defaultMessage` prop and property for `formatMessage({ id: "...", })` and `<FormattedMessage id="..." />` calls from a source file.

Consider this source code:

```js
// someModule.js
import { FormattedMessage, intl } from "react-intl";

export const TestComponent = () => {
  return <FormattedMessage id="test.string" />;
};

export const TestFunc = () => {
  return intl.formatMessage({
    id: "test.string",
  });
};
```

```js
// source.json
{
  "test.string": "I like being inserted!"
}

```

Running `intl-msgs-defaults -s "./source.json" -t "someModule.js"` will update `someModule.js` to the following:

```js
// someModule.js
import { FormattedMessage, intl } from "react-intl";

export const TestComponent = () => {
  return (
    <FormattedMessage
      id="test.string"
      defaultMessage="I like being inserted!"
    />
  );
};

export const TestFunc = () => {
  return intl.formatMessage({
    id: "test.string",
    defaultMessage: "I like being inserted!",
  });
};
```

# Installation

```js
npm install --save-dev intl-msgs-defaults
```

# Usage

```
Usage: intl-msgs-defaults [options]

Options:
  -V, --version        output the version number
  -s, --source <file>  .json file with the default messages
  -t, --target <glob>  glob pattern for target files
  -h, --help           display help for command
```

# Behaviour

- When there already is a `defaultMessage` the message will not be overwritten
- When no string for the ID is found in the source strings file, the string `@TODO` will be added
