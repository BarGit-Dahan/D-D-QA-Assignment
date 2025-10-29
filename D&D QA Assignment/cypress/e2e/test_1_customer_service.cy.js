/// <reference types="cypress" />

/**
 * Task 1 — Customer Service → Track your package
 * Goal: Open Amazon (English), navigate to Customer Service/Help,
 *       click "Where's My Stuff" → "Track your package" (or Orders fallback),
 *       and validate destination content.
 */

/* ---------------------------- Utilities ---------------------------- */

/** Step 0: Force English UI and land on the English homepage */
function forceEnglishUi() {
  cy.setCookie('lc-main', 'en_US')
  cy.setCookie('i18n-prefs', 'USD')
  cy.visit('https://www.amazon.com/?language=en_US', { failOnStatusCode: false })
  cy.get('html', { timeout: 15000 })
    .should('have.attr', 'lang')
    .then((lang) => {
      if (!/en/i.test(lang || '')) cy.reload(true)
    })
}

/** Step 0 (cont.): Dismiss common overlays (cookies, popovers) */
function dismissOverlaysIfAny() {
  cy.get('body').then(($b) => {
    const closers = [
      '#sp-cc-accept',
      '[data-action="a-cookie-consent"]',
      'button[aria-label="Close"]',
      'button:contains("Close")',
      'button:contains("Got it")',
      'button:contains("OK")',
      'button:contains("Not now")',
      'button:contains("No thanks")',
      '#attach-close_sideSheet-link',
      '.a-popover-header .a-button-close',
    ]
    const found = closers.find((sel) => $b.find(sel).length > 0)
    if (found) cy.get(found).first().click({ force: true })
  })
}

/** Step 1: Ensure the header is rendered (top nav/xshop present) */
function headerReady() {
  cy.get('body', { timeout: 15000 }).should(($b) => {
    const ok =
      $b.find('#nav-xshop a').length > 0 ||
      $b.find('#navbar, #nav-belt, #nav-main a').length > 0
    expect(ok, 'header/xshop links present').to.be.true
  })
}

/** Step 2: Navigate to Customer Service/Help (header → hamburger → footer fallbacks) */
function goToCustomerService() {
  const RX_CS = /Customer Service|Help/i

  cy.get('body').then(($body) => {
    // Header link
    const headerLink = $body.find('a').filter((i, el) => RX_CS.test(el.innerText || ''))
    if (headerLink.length) {
      cy.wrap(headerLink.first()).click({ force: true })
      return
    }

    // Hamburger menu
    const hamburger = $body.find('#nav-hamburger-menu')
    if (hamburger.length) {
      cy.wrap(hamburger).click({ force: true })
      cy.get('#hmenu-content', { timeout: 10000 })
      cy.get('body').then(($b2) => {
        const menuItem = $b2
          .find('#hmenu-content a.hmenu-item, #hmenu-content *')
          .filter((i, el) => RX_CS.test(el.innerText || ''))
        if (menuItem.length) {
          cy.wrap(menuItem.first()).click({ force: true })
        } else {
          cy.contains(RX_CS, { timeout: 8000 }).first().click({ force: true })
        }
      })
      return
    }

    // Footer fallback
    cy.get('footer').scrollIntoView()
    cy.contains('footer a, footer *', RX_CS, { timeout: 8000 }).first().click({ force: true })
  })

  cy.url({ timeout: 15000 }).should('include', '/help')
}

/** Click a visible element by text (cards/buttons/links/spans). Returns cy-wrapped boolean. */
function clickVisibleByText(rx, timeout = 12000) {
  return cy.get('body', { timeout }).then(($b) => {
    const $candidates = $b
      .find(
        [
          '.fs-match-card:visible',
          '.fs-hub-card:visible',
          'div[role="button"]:visible',
          'button:visible',
          'a:visible',
          'label:visible',
          'span:visible',
        ].join(', ')
      )
      .filter((i, el) => rx.test((el.innerText || '').trim()))
    if ($candidates.length) {
      cy.wrap($candidates.first()).scrollIntoView().click({ force: true })
      return cy.wrap(true)
    }
    return cy.wrap(false)
  })
}

/** Click by text even if nested element is hidden: choose closest visible ancestor. Returns boolean. */
function clickAnyMatchEvenIfHidden(rx, scope = 'body') {
  return cy.get(scope).then(($root) => {
    const any = $root.find('*').filter((i, el) => rx.test((el.innerText || '').trim()))
    if (any.length) {
      const $first = Cypress.$(any.get(0))
      const $visibleAncestor = $first.closest(':visible')
      if ($visibleAncestor && $visibleAncestor.length) {
        cy.wrap($visibleAncestor).scrollIntoView().click({ force: true })
        return cy.wrap(true)
      }
    }
    return cy.wrap(false)
  })
}

/** Step 3: Inside Help — open “Where’s My Stuff” (if present), then proceed to “Track your package” */
function openTrackYourPackageRobust() {
  const RX_WIMS = /Where('?s| i)s My Stuff/i

  // Detect that a known help root exists
  cy.wrap(null, { timeout: 15000 }).should(() => {
    const roots = [
      '#help-gateway',
      '[data-cel-widget="cs-topics"]',
      '[data-cel-widget="cs-hub"]',
      '#hub-gateway-app-unauth',
      'main',
    ]
    const exists = roots.some((sel) => Cypress.$(sel).length > 0)
    expect(exists, 'help hub root exists (any known selector)').to.be.true
  })

  // Click WIMS if available; otherwise jump straight to Track/Orders
  clickVisibleByText(RX_WIMS, 8000).then((clickedWims) => {
    if (!clickedWims) {
      clickAnyMatchEvenIfHidden(RX_WIMS).then(() => {
        proceedToTrackOrOrders()
      })
      return
    }
    proceedToTrackOrOrders()
  })
}

/** Step 4: Click “Track your package” (or “Your Orders/Returns & Orders/Help with an order” fallback) */
function proceedToTrackOrOrders() {
  const RX_TRACK = /Track your package/i
  const RX_ORDERS = /Your Orders|Order History|Orders|Returns & Orders|Help with an order/i

  clickVisibleByText(RX_TRACK, 12000).then((clickedTrack) => {
    if (clickedTrack) return finalizeDestination()
    clickAnyMatchEvenIfHidden(RX_TRACK).then((clickedHiddenTrack) => {
      if (clickedHiddenTrack) return finalizeDestination()
      clickVisibleByText(RX_ORDERS, 12000).then((clickedOrders) => {
        if (clickedOrders) return finalizeDestination()
        clickAnyMatchEvenIfHidden(RX_ORDERS).then(() => finalizeDestination())
      })
    })
  })
}

/** Step 5: Handle sign-in redirect (if any) and validate destination */
function finalizeDestination() {
  cy.url().then((u) => {
    if (u.includes('signin')) {
      cy.visit('https://www.amazon.com/gp/css/order-history', { failOnStatusCode: false })
    }
  })
  cy.contains(/Your Orders|Order History|Track Package/i, { timeout: 15000 }).should('be.visible')
}

/* ---------------------------- Test Spec ---------------------------- */

describe('Task 1 - Customer Service > Track your package', () => {
  it('opens Help and reaches Track your package (with robust fallbacks)', () => {
    // Step 0: English homepage + overlays cleanup
    forceEnglishUi()
    cy.reload()
    dismissOverlaysIfAny()

    // Step 1: Header ready
    headerReady()
    dismissOverlaysIfAny()

    // Step 2: Go to Customer Service / Help
    goToCustomerService()

    // Step 3–5: Within Help → WIMS (optional) → Track your package/Orders → Validate
    openTrackYourPackageRobust()
  })
})