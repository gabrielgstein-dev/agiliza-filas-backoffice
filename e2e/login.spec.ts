import { test, expect } from '@playwright/test'

const EMAIL = process.env.E2E_EMAIL || 'admin@datentest.com'
const PASSWORD = process.env.E2E_PASSWORD || 't%%K&iRELc57'

test.describe('Login (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 })
  })

  test('deve exibir a pagina de login corretamente', async ({ page }) => {
    await expect(page.getByText('Acesso ao Backoffice')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /Acessar Backoffice/i })).toBeVisible()
  })

  test('deve mostrar erro de validacao com campos vazios', async ({ page }) => {
    await page.locator('#email').focus()
    await page.locator('#password').focus()
    await page.getByRole('button', { name: /Acessar Backoffice/i }).click()
    await expect(page.getByText('Email é obrigatório')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Senha é obrigatória')).toBeVisible({ timeout: 5000 })
  })

  test('deve mostrar erro com credenciais incorretas', async ({ page }) => {
    await page.locator('#email').fill('usuario@inexistente.com')
    await page.locator('#password').fill('senha-errada')
    await page.getByRole('button', { name: /Acessar Backoffice/i }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15000 })
  })

  test('deve alternar visibilidade da senha', async ({ page }) => {
    const passwordInput = page.locator('#password')
    await passwordInput.fill('minha-senha')
    await expect(passwordInput).toHaveAttribute('type', 'password')

    await page.getByRole('button', { name: /Mostrar senha/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')

    await page.getByRole('button', { name: /Ocultar senha/i }).click()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('deve fazer login com sucesso e redirecionar para /dashboard', async ({ page }) => {
    await page.locator('#email').fill(EMAIL)
    await page.locator('#password').fill(PASSWORD)
    await page.getByRole('button', { name: /Acessar Backoffice/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })
})
