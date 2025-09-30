import { antfu } from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  ignores: [
    'build',
  ],
  rules: {
    'vue/no-multiple-template-root': 'off',
  },
})
