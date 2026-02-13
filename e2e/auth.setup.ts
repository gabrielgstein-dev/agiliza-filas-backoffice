import { test as setup, expect } from '@playwright/test'

const EMAIL = process.env.E2E_EMAIL || 'admin@datentest.com'
const PASSWORD = process.env.E2E_PASSWORD || 't%%K&iRELc57'
const AUTH_FILE = 'e2e/.auth/user.json'

setup('autenticar usuario', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('#email')).toBeVisible({ timeout: 10000 })

  await page.locator('#email').fill(EMAIL)
  await page.locator('#password').fill(PASSWORD)
  await page.getByRole('button', { name: /Acessar Backoffice/i }).click()

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

  await page.context().storageState({ path: AUTH_FILE })
})
