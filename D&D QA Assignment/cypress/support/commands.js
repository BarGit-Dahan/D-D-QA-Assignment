Cypress.Commands.add('dismissOverlaysIfAny', () => {
  // Cookie consent
  cy.get('body').then($b => {
    const cookieSel = '#sp-cc-accept, [data-action="a-cookie-consent"]'
    if ($b.find(cookieSel).length) cy.get(cookieSel).first().click({ force: true })
  })
  // Region / language dialogs
  cy.get('body').then($b => {
    const label = /(Done|Continue|Save|Apply|Got it|OK|Close|Not now|Maybe later|X)/i
    const btns = $b.find('button, input[type="submit"]')
    const $btn = [...btns].find(el => label.test(el.innerText || el.getAttribute('aria-label') || ''))
    if ($btn) cy.wrap($btn).click({ force: true })
  })
})

Cypress.Commands.add('openCart', () => {
  cy.get('a[aria-label*="Cart"], a#nav-cart, a[href*="/cart"]').first().click({ force: true })
})

Cypress.Commands.add('clearCartIfAny', () => {
  cy.openCart()
  cy.get('body').then($b => {
    const delSel = '[data-action="delete"], input[value="Delete"], button:contains("Delete")'
    if ($b.find(delSel).length) cy.get(delSel).each($el => cy.wrap($el).click({ force: true }))
  })
})

// cypress/support/commands.js

Cypress.Commands.add('forceEnglish', () => {
  // Amazon language & currency cookies
  cy.setCookie('lc-main', 'en_US', { domain: '.amazon.com' })
  cy.setCookie('i18n-prefs', 'USD', { domain: '.amazon.com' })

  // Visit with onBeforeLoad to spoof navigator.language/languages
  cy.visit('/', {
    onBeforeLoad(win) {
      Object.defineProperty(win.navigator, 'language', { value: 'en-US', configurable: true })
      Object.defineProperty(win.navigator, 'languages', { value: ['en-US', 'en'], configurable: true })
    }
  })

  // As a fallback, force language via URL parameter
  cy.location('pathname').then(() => {
    cy.visit('/?language=en_US')
  })
})