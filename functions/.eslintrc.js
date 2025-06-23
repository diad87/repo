module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "linebreak-style": 0,
    "max-len": 0, // <-- AÑADE ESTA LÍNEA PARA DESACTIVAR EL LÍMITE DE LARGO
  },
  overrides: [
    {
      files: ["**/.spec."],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
