import './commands'
Cypress.on('uncaught:exception', () => false) 

require('cypress-xpath')