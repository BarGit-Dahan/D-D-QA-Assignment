// cypress.config.js
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://www.amazon.com',
    viewportWidth: 1366,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    chromeWebSecurity: false,
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          // Force UI language and disable translation & geolocation
          launchOptions.args.push('--lang=en-US')
          launchOptions.args.push('--disable-features=Translate,TranslateUI')
          launchOptions.args.push('--disable-geolocation')
          launchOptions.args.push('--accept-lang=en-US,en')
        }
        if (browser.family === 'firefox') {
          // Force Accept-Language for Firefox
          launchOptions.preferences = {
            ...(launchOptions.preferences || {}),
            'intl.accept_languages': 'en-US, en',
            'geo.enabled': false
          }
        }
        return launchOptions
      })

      return config
    },
  },
})