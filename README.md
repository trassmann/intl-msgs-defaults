# intl-msgs-defaults

Automatically applies `defaultMessage` prop and property for `formatMessage({ id: "...", })` and `<FormattedMessage id="..." />` calls from a source file.

# Install

```js
npm install --save-dev intl-msgs-defaults
```

# Introduction

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

# Usage Options

```
Usage: intl-msgs-defaults [options]

Options:
  -V, --version                 output the version number
  -s, --source <file>           .json file with the default messages
  -t, --target <glob>           glob pattern for target files
  -np, --no-prettify            do not prettify output
  -pc, --prettify-cfg <config>  custom prettier config file (defaults to auto-resolve near target files)
  -h, --help                    display help for command
```

# Behaviour

- When there already is a `defaultMessage`, it will not be overwritten
- When no data for the key is found in the source file, no `defaultMessage` is added
