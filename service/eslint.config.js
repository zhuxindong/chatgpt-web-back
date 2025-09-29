const antfu = require('@antfu/eslint-config').default

module.exports = antfu({
  typescript: true,
  ignores: [
    'build',
  ],
  rules: {
    'vue/no-multiple-template-root': 'off',
  },
})
