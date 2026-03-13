module.exports = {
  // specify entry points for the main process
  mainSrcDir: 'main',
  distDir: 'dist',
  webpack: (config, options) => {
    config.entry = {
      background: './main/background.ts',
      preload: './main/preload.ts',
    }
    return config
  },
}
