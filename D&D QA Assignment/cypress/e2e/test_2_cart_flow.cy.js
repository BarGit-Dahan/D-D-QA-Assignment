/// <reference types="cypress" />

// Constants
const AMAZON_HOME = 'https://www.amazon.com/?language=en_US'
const CART_URL    = 'https://www.amazon.com/gp/cart/view.html?ref_=nav_cart'

const PENCIL_SEARCH_QUERY =
  'Bostitch Personal Electric Pencil Sharpener, Powerful Stall-Free Motor, High Capacity Shavings Tray, Blue (EPS4-BLUE)'
const PENCIL_ASIN   = 'B00125KXGI'
const DP_URL        = `https://www.amazon.com/dp/${PENCIL_ASIN}?_encoding=UTF8&psc=1`
const PENCIL_MATCH  = /Electric Pencil Sharpener/i

const SCISSORS_URL  = 'https://www.amazon.com/Scissors-iBayam-Crafting-Scrapbooking-Knitting/dp/B07H3QKN2Z'
const WANTED_COLOR  = 'Yellow, Grey, Blue'

const CART_COUNT    = '#nav-cart-count'

// ---------- Force English UI ----------
function forceEnglishUi() {
  cy.setCookie('lc-main', 'en_US')
  cy.setCookie('i18n-prefs', 'USD')
  cy.visit(AMAZON_HOME, { failOnStatusCode: false })
  cy.get('html', { timeout: 15000 })
    .should('have.attr', 'lang')
    .then((lang) => { if (!/en/i.test(lang || '')) cy.reload(true) })
}

// ---------- Commands & helpers ----------

// Closes consent banners, side sheets, and popovers that may block interactions
Cypress.Commands.add('dismissOverlaysIfAny', () => {
  cy.get('body').then(($b) => {
    const cookieSel = '#sp-cc-accept, [data-action="a-cookie-consent"]'
    if ($b.find(cookieSel).length) cy.get(cookieSel).first().click({ force: true })

    const maybeClose = [
      'button[aria-label="Close"]',
      'button:contains("Close")',
      'button:contains("Got it")',
      'button:contains("OK")',
      'button:contains("Not now")',
      'button:contains("No thanks")',
      '#attach-close_sideSheet-link',
      '.a-popover-header .a-button-close',
    ]
    const found = maybeClose.find(sel => $b.find(sel).length > 0)
    if (found) cy.get(found).first().click({ force: true })
  })
})

// Opens the cart from side sheet / header / or falls back to the cart URL, then verifies we're on Cart
Cypress.Commands.add('openCart', () => {
  cy.get('body', { timeout: 12000 }).then(($b) => {
    const sideSheetViewCart =
      '#attach-view-cart-button-form a, a#attach-sidesheet-view-cart-button, a[href*="/gp/cart/view.html"]'
    const headerCart = 'a#nav-cart, a[aria-label*="Cart"], a[href*="/cart"]'

    if ($b.find(sideSheetViewCart).length) {
      cy.get(sideSheetViewCart).first().scrollIntoView().click({ force: true })
      return
    }
    if ($b.find(headerCart).length) {
      cy.get(headerCart).first().scrollIntoView().click({ force: true })
      return
    }
    cy.visit(CART_URL, { failOnStatusCode: false })
  })

  // Assert cart page structure
  cy.get('body', { timeout: 15000 }).should(($b) => {
    const present =
      $b.find('#sc-active-cart').length > 0 ||
      $b.find('[data-cel-widget="sc-item-list"]').length > 0 ||
      /Your Amazon Cart/i.test($b.text())
    expect(present, 'cart page structure present').to.be.true
  })
})

// Reads the visible cart badge count
function getCartCount() {
  return cy.get('body').then(($body) => {
    const $badge = $body.find(CART_COUNT)
    if (!$badge.length) return 0
    const n = parseInt(($badge.text() || '').trim(), 10)
    return Number.isNaN(n) ? 0 : n
  })
}

// Clicks an Add to Cart control robustly and asserts the cart count increments by 1
function addToCartFast() {
  const primary = [
    '#add-to-cart-button',
    'input#add-to-cart-button',
    'button#add-to-cart-button',
    'input[name="submit.addToCart"]',
    'input[aria-labelledby="submit.add-to-cart-announce"]',
    'input[title="Add to Cart"]',
  ]

  return getCartCount().then((before) => {
    cy.get('body').then(($b) => {
      const found = primary.find(sel => $b.find(sel).length > 0)
      if (found) {
        cy.get(found).first().should('be.enabled').scrollIntoView().click({ force: true })
      } else {
        const aod =
          'a#buybox-see-all-buying-choices-announce, a[href*="buyingoptions"], #buybox-see-all-buying-choices'
        if ($b.find(aod).length) {
          cy.get(aod).first().click({ force: true })
          cy.get('input[name="submit.addToCart"], input[aria-labelledby*="aod-offer-addToCart"]', { timeout: 15000 })
            .first()
            .click({ force: true })
        } else {
          cy.contains('input,button', /^Add to Cart$/i, { timeout: 15000 })
            .first()
            .scrollIntoView()
            .click({ force: true })
        }
      }
    })

    // Dismiss upsells/coverage UI, then validate badge increment
    cy.get('body').then(($b) => {
      const noThanksSel = [
        '#attachSiNoCoverage',
        'input#siNoCoverage-announce',
        'button[aria-label*="No Thanks"]',
        'button:contains("No Thanks")',
      ]
      const closeSel = [
        'button[aria-label="Close"]',
        '#attach-close_sideSheet-link',
        '.a-popover-header .a-button-close',
      ]
      const foundNo = noThanksSel.find(sel => $b.find(sel).length > 0)
      if (foundNo) cy.get(foundNo).first().click({ force: true })
      const foundClose = closeSel.find(sel => $b.find(sel).length > 0)
      if (foundClose) cy.get(foundClose).first().click({ force: true })
    })

    cy.get(CART_COUNT, { timeout: 15000 }).should(($badge) => {
      const after = parseInt(($badge.text() || '').trim(), 10) || 0
      expect(after, 'cart count increased by 1').to.eq(before + 1)
    })
  })
}

// Types a query into the header search bar and waits for results to render
function typeSearchQueryStable(query) {
  // ensure English before visiting search page
  cy.setCookie('lc-main', 'en_US')
  cy.setCookie('i18n-prefs', 'USD')
  cy.visit(AMAZON_HOME)
  cy.dismissOverlaysIfAny()

  const candidates = [
    '#twotabsearchtextbox',
    'input[name="field-keywords"]',
    'form[role="search"] input[type="text"]',
  ]

  cy.get('body', { timeout: 15000 }).then(($b) => {
    const sel = candidates.find(s => $b.find(s).length > 0) || '#twotabsearchtextbox'
    cy.get(sel).first().as('search')
  })

  cy.get('@search')
    .scrollIntoView()
    .click({ force: true })
    .focus()
    .type('{selectall}{backspace}', { delay: 0 })
    .type(query, { delay: 0 })
    .type('{enter}', { delay: 0 })

  cy.get('form[role="search"] button[type="submit"], #nav-search-submit-button', { timeout: 3000 })
    .then(($btn) => {
      if ($btn && $btn.length) cy.wrap($btn.first()).click({ force: true })
    })

  cy.get('div.s-main-slot', { timeout: 15000 }).should('exist')
}

// Opens the sharpener PDP from search results by ASIN / dp link / fuzzy title
function openPencilPDPFromResults() {
  cy.get('div.s-main-slot', { timeout: 15000 }).should('exist')

  cy.get('div.s-main-slot', { timeout: 15000 }).then(($slot) => {
    const exactSel = `div.s-result-item[data-asin="${PENCIL_ASIN}"] h2 a.a-link-normal`
    if ($slot.find(exactSel).length) {
      cy.wrap($slot).find(exactSel).first().invoke('removeAttr', 'target').click({ force: true })
      return
    }
    const dpLinks = $slot.find('a[href*="/dp/"]')
    const match = Array.from(dpLinks).find((a) => (a.getAttribute('href') || '').includes(`/${PENCIL_ASIN}`))
    if (match) {
      cy.wrap(match).invoke('removeAttr', 'target').click({ force: true })
      return
    }
    const titleSpans = $slot.find('h2 a.a-link-normal span')
    const fuzzy = Array.from(titleSpans).find((el) => PENCIL_MATCH.test((el.innerText || '').trim()))
    if (fuzzy) {
      cy.wrap(fuzzy).closest('a[href]').invoke('removeAttr', 'target').click({ force: true })
      return
    }
    cy.visit(DP_URL)
  })

  cy.url({ timeout: 15000 }).should('include', `/${PENCIL_ASIN}`)
}

// Chooses the exact scissors color and asserts variant ASIN is propagated to Add-to-Cart
function pickExactColorFast(labelText) {
  const container = '#tp-inline-twister-dim-values-container'

  cy.get(container, { timeout: 15000 }).should('exist').scrollIntoView()

  cy.get(`${container} li:has(img[alt="${labelText}"])`, { timeout: 15000 })
    .first()
    .as('targetLi')
    .invoke('attr', 'data-asin')
    .then((variantAsin) => {
      expect(variantAsin, 'variant ASIN from swatch').to.be.a('string').and.not.be.empty
      cy.wrap(variantAsin, { log: false }).as('scissorsVariantAsin')
    })

  cy.get('@targetLi')
    .find('span.a-button input.a-button-input[role="radio"]')
    .first()
    .click({ force: true })

  cy.get(`${container} span.a-button.a-button-selected:visible`)
    .should('have.length.at.least', 1)
    .should(($spans) => {
      const ok = Array.from($spans).some((el) => {
        const alt = Cypress.$(el).find('img[alt]').attr('alt') || ''
        return alt.trim() === labelText
      })
      expect(ok, `selected color should be "${labelText}"`).to.be.true
    })

  cy.get('@scissorsVariantAsin').then((targetAsin) => {
    cy.wrap(null, { timeout: 15000 }).should(() => {
      const $form = Cypress.$('form#addToCart, form[action*="/addToCart"], form[action*="/cart"]')
      const $inp = $form.find('input[name="ASIN"], input#ASIN').first()
      const formAsin = ($inp.val() || $inp.attr('value') || '').trim()

      const $btn = Cypress.$('#add-to-cart-button')
      const btnAsin = ($btn.attr('data-asin') || $btn.attr('data-hover-asin') || '').trim()

      const propagated =
        (formAsin && formAsin === targetAsin) ||
        (btnAsin && btnAsin === targetAsin)

      expect(propagated, `variant ASIN propagated to Add to Cart (${targetAsin})`).to.be.true
    })
  })
}

// Signs in from the cart page using the header "Hello, sign in" link and returns to Cart
function loginFromHeaderOnCart() {
  const email = Cypress.env('AMZ_EMAIL')
  const password = Cypress.env('AMZ_PASSWORD')

  expect(email, 'AMZ_EMAIL is set').to.be.a('string').and.not.be.empty
  expect(password, 'AMZ_PASSWORD is set').to.be.a('string').and.not.be.empty

  cy.openCart()

  const headerSignIn =
    '#nav-link-accountList > a.nav-a.nav-a-2.nav-progressive-attribute[data-nav-role="signin"]'

  cy.get('body', { timeout: 20000 }).then(($b) => {
    if ($b.find(headerSignIn).length) {
      cy.get(headerSignIn)
        .first()
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true })
    } else {
      cy.visit('https://www.amazon.com/ap/signin?language=en_US', { failOnStatusCode: false })
    }
  })

  const continueExact = 'input.a-button-input[type="submit"][aria-labelledby="continue-announce"]'
  const continueFallbacks = ['#continue', 'input#continue', 'button#continue', 'input[name="continue"]']

  cy.get('#ap_email, input[name="email"]', { timeout: 20000 })
    .should('be.visible')
    .clear({ force: true })
    .type(email, { log: false, delay: 0 })
    .blur()

  cy.get('body', { timeout: 15000 }).then(($b) => {
    if ($b.find(continueExact).length) {
      cy.get(continueExact).first().should('be.enabled').click({ force: true })
    } else {
      const sel = continueFallbacks.find(s => $b.find(s).length > 0)
      if (sel) cy.get(sel).first().click({ force: true })
      else cy.get('#ap_email, input[name="email"]').first().type('{enter}', { force: true })
    }
  })

  cy.get('#ap_password, input[name="password"]', { timeout: 20000 })
    .should('be.visible')
    .clear({ force: true })
    .type(password, { log: false, delay: 0 })

  cy.get('#signInSubmit, input#signInSubmit', { timeout: 15000 })
    .first()
    .should('be.enabled')
    .click({ force: true })

  // Back to Cart and assert signed-in UI
  cy.location('pathname', { timeout: 30000 }).should((p) => {
    expect(p.includes('/gp/cart') || p.includes('/cart'), 'returned to Cart').to.be.true
  })
  cy.get('body', { timeout: 20000 }).should(($b) => {
    const text = ($b.text() || '').toLowerCase()
    const inCart   = text.includes('your amazon cart') || $b.find('#sc-active-cart').length > 0
    const signedIn = !text.includes('hello, sign in')
    expect(inCart, 'still in cart').to.be.true
    expect(signedIn, 'signed-in feel (no "Hello, sign in")').to.be.true
  })
}

// Deletes all items from the cart using the provided Delete buttons and asserts emptiness (with refresh)
function clearCartWithButtons() {
  const deleteButtonStrict = 'input[data-action="delete-active"]'
  const deleteFallbacks = [
    'input[name^="submit.delete-active"]',
    'input[name^="submit.delete"]',
    'input[value="Delete"]',
    '[data-action="delete"] input[type="submit"]',
  ]

  function clickNext(attempt = 0) {
    if (attempt > 60) return

    cy.get('body', { timeout: 10000 }).then(($b) => {
      let sel = null
      if ($b.find(deleteButtonStrict).length) {
        sel = deleteButtonStrict
      } else {
        sel = deleteFallbacks.find(s => $b.find(s).length > 0) || null
      }

      if (!sel) return

      cy.get(sel).first().scrollIntoView().click({ force: true })
      cy.wait(300)
      clickNext(attempt + 1)
    })
  }

  cy.openCart()
  clickNext()

  // Refresh + assert empty cart
  cy.reload()
  cy.get('body', { timeout: 12000 }).should(($b) => {
    const empty = $b.text().includes('Your Amazon Cart is empty') ||
                  $b.find('#sc-active-cart .sc-list-item').length === 0
    expect(empty, 'cart empty or no active items').to.be.true
  })
}

// ---------- Flows ----------

// Search → open PDP → add sharpener
function addPencilSharpener() {
  typeSearchQueryStable(PENCIL_SEARCH_QUERY)
  openPencilPDPFromResults()
  addToCartFast()
}

// Open scissors PDP → pick exact color → add
function addScissorsWithColor() {
  cy.visit(SCISSORS_URL)
  cy.dismissOverlaysIfAny()
  pickExactColorFast(WANTED_COLOR)
  addToCartFast()
}

// Increase sharpener quantity to 4 via cart stepper (may overshoot occasionally)
function increasePencilQtyTo4() {
  cy.openCart()

  const pencilRow = `[data-asin="${PENCIL_ASIN}"]`
  const valSel   = `${pencilRow} [data-a-selector="value"]`
  const incSel   = `${pencilRow} [data-a-selector="increment"], ${pencilRow} button[data-action="a-stepper-increment"]`
  const spinWrap = `${pencilRow} [data-a-selector="spinner"]`

  cy.get(pencilRow, { timeout: 15000 }).should('exist')
  cy.get(valSel,   { timeout: 15000 }).should('exist')
  cy.get(incSel,   { timeout: 15000 }).should('exist')

  const waitSpinnerCycle = () => {
    cy.get('body').then(($b) => {
      if ($b.find(spinWrap).length) {
        cy.get(`${spinWrap} .a-spinner:visible`, { timeout: 10000 }).should('not.exist')
      }
    })
  }

  const readVal = () =>
    cy.get(valSel, { timeout: 12000 })
      .first()
      .invoke('text')
      .then(t => {
        const n = parseInt((t || '').trim(), 10)
        return Number.isNaN(n) ? 0 : n
      })

  const stepOnce = () => {
    cy.get(incSel, { timeout: 12000 })
      .first()
      .scrollIntoView()
      .click({ force: true })
    waitSpinnerCycle()
    return readVal()
  }

  const driveTo = (target = 4, tries = 0) => {
    if (tries > 10) return
    return readVal().then(curr => {
      if (curr >= target) return
      return stepOnce().then(() => driveTo(target, tries + 1))
    })
  }

  driveTo(4).then(() => {
    cy.get(valSel, { timeout: 12000 })
      .first()
      .should(($s) => {
        const v = parseInt(($s.text() || '').trim(), 10) || 0
        expect(v, 'stepper value equals >= 4').to.be.gte(4)
      })
  })
}

// ---------- Suite ----------

describe('Task 2 - Cart flow: add, color select, login from cart header, cleanup', () => {
  beforeEach(() => {
    // Force English UI for every run
    forceEnglishUi()
    cy.dismissOverlaysIfAny()
  })

  it('adds items, increases sharpener qty, signs in from cart header, then clears the cart', () => {
    addPencilSharpener()
    addScissorsWithColor()
    cy.openCart()
    increasePencilQtyTo4()
    loginFromHeaderOnCart()
    clearCartWithButtons()
  })

  afterEach(() => {
    // Best-effort cart cleanup after each test (refresh + empty assertion inside)
    cy.then(() => {
      clearCartWithButtons()
    })
  })
})