import { test, expect } from '@playwright/test'

test.describe('Nova Fila (/filas/nova)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/filas/nova')
    await expect(page.getByRole('heading', { name: 'Nova Fila', exact: true })).toBeVisible({ timeout: 15000 })
  })

  test('deve exibir o formulario completo', async ({ page }) => {
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#queueType')).toBeVisible()
    await expect(page.locator('#description')).toBeVisible()
    await expect(page.locator('#hasCapacityLimit')).toBeVisible()
    await expect(page.getByRole('button', { name: /Criar Fila/i })).toBeVisible()
  })

  test('deve mostrar erros de validacao com campos vazios', async ({ page }) => {
    await page.locator('#name').clear()
    await page.getByRole('button', { name: /Criar Fila/i }).click()
    await expect(page.getByText(/nome deve ter pelo menos/i)).toBeVisible({ timeout: 5000 })
  })

  test('deve criar fila geral e redirecionar para /filas', async ({ page }) => {
    const queueName = `Fila E2E ${Date.now()}`

    await page.locator('#name').fill(queueName)

    const [response] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/queues') && resp.request().method() === 'POST',
        { timeout: 30000 }
      ),
      page.getByRole('button', { name: /Criar Fila/i }).click(),
    ])

    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.name).toBe(queueName)
    expect(body.queueType).toBe('GENERAL')

    await expect(page.getByText('Fila criada com sucesso!')).toBeVisible({ timeout: 10000 })
    await expect(page).toHaveURL(/\/filas$/, { timeout: 10000 })
  })

  test('deve criar fila prioritaria com capacidade', async ({ page }) => {
    const queueName = `Fila Prioritaria ${Date.now()}`

    await page.locator('#name').fill(queueName)
    await page.locator('#queueType').selectOption('PRIORITY')
    await page.locator('#description').fill('Fila prioritaria criada via E2E')

    await page.locator('#hasCapacityLimit').check()
    await expect(page.locator('#capacity')).toBeVisible()
    await page.locator('#capacity').fill('50')

    const [response] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/queues') && resp.request().method() === 'POST',
        { timeout: 30000 }
      ),
      page.getByRole('button', { name: /Criar Fila/i }).click(),
    ])

    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.name).toBe(queueName)
    expect(body.queueType).toBe('PRIORITY')
    expect(body.capacity).toBe(50)

    await expect(page.getByText('Fila criada com sucesso!')).toBeVisible({ timeout: 10000 })
  })

  test('deve criar fila VIP', async ({ page }) => {
    const queueName = `Fila VIP ${Date.now()}`

    await page.locator('#name').fill(queueName)
    await page.locator('#queueType').selectOption('VIP')

    const [response] = await Promise.all([
      page.waitForResponse(
        resp => resp.url().includes('/queues') && resp.request().method() === 'POST',
        { timeout: 30000 }
      ),
      page.getByRole('button', { name: /Criar Fila/i }).click(),
    ])

    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.queueType).toBe('VIP')
  })

  test('deve voltar para /filas ao clicar em Cancelar', async ({ page }) => {
    await page.getByRole('button', { name: /Cancelar/i }).click()
    await expect(page).toHaveURL(/\/filas$/, { timeout: 10000 })
  })

  test('campo capacidade so aparece quando checkbox marcado', async ({ page }) => {
    await expect(page.locator('#capacity')).not.toBeVisible()
    await page.locator('#hasCapacityLimit').check()
    await expect(page.locator('#capacity')).toBeVisible()
    await page.locator('#hasCapacityLimit').uncheck()
    await expect(page.locator('#capacity')).not.toBeVisible()
  })
})
