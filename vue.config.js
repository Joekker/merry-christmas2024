const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true
})

module.exports = {
  publicPath: '/merry-christmas2024/'
}

const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
};