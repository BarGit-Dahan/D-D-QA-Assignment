# Amazon Cart E2E (Cypress)

This project contains end-to-end Cypress tests that automate key Amazon cart workflows.

## Overview

The test suite includes two primary tasks:

- **Task 1** – Flow to "Track Your Package" page.  
- **Task 2** – Complete cart flow:
  1. Add the Bostitch Electric Pencil Sharpener.  
  2. Add the iBayam Scissors with the specified color (“Yellow, Grey, Blue”).  
  3. Increase the sharpener quantity to four.  
  4. Log in through the cart header (same tab).  
  5. Clear the entire cart using the provided delete buttons.

Each test dismisses overlays, validates UI states, and performs assertions to verify correct cart functionality.

Also added the test case .docx file.

---

## How to Run

First extract the files from the .zip

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Open the Cypress Test Runner from the project directory:
   ```bash
   npm run cy:open
   ```

3. From the Cypress interface, select one of the following spec files to run:
   - `cypress/e2e/test_1_customer_service.cy.js`
   - `cypress/e2e/test_2_cart_flow.cy.js`

> **Tip:** Running in headed mode (default for `cy:open`) is recommended for Amazon login stability.

---

## Project Structure

```
cypress/
  e2e/
    test_1_customer_service.cy.js     # Task 1: Flow to "Track Your Package" page 
    test_2_cart_flow.cy.js          # Task 2: Full login and cart management flow
  support/
    e2e.js
    commands.js
  fixtures/
  	example.json
cypress.config.js
cypress.env.json
node_modules
package-lock.json
package.json
README.md
```

---

## Notes

- The tests are designed for Amazon’s live environment; minor selector adjustments may be required if the UI changes.  
- No configuration or environment variable changes are required beyond the existing setup.  
- Task 2 includes an `afterEach()` cleanup to ensure an empty cart after every test run.  
- Cypress version 13+ is recommended.

---

**Author:** Bar Avraham Dahan  
**Framework:** Cypress  
**Language:** JavaScript (ES6)  
**Purpose:** Automated validation of Amazon cart operations and login flow.
