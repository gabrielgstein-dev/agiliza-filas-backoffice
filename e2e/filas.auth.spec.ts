import { test, expect } from '@playwright/test'

test.describe('Filas (/filas)', () => {
  test('deve carregar a pagina de filas com header e stats', async ({ page }) => {
    await page.goto('/filas')
    await expect(page.getByText('Filas de Atendimento')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Total de Filas')).toBeVisible()
    await expect(page.getByText('Filas Ativas')).toBeVisible()
    await expect(page.getByText('Tempo Médio')).toBeVisible()
    await expect(page.getByText('Capacidade Total')).toBeVisible()
  })

  test('deve exibir botao Nova Fila', async ({ page }) => {
    await page.goto('/filas')
    await expect(page.getByText('Filas de Atendimento')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /Nova Fila/i })).toBeVisible()
  })

  test('deve interceptar request GET /queues e validar resposta 200', async ({ page }) => {
    const apiRequests: { url: string; status: number; method: string }[] = []

    page.on('response', response => {
      const url = response.url()
      if (url.includes('/tenants/') && url.includes('/queues')) {
        apiRequests.push({
          url,
          status: response.status(),
          method: response.request().method(),
        })
      }
    })

    await page.goto('/filas')
    await expect(page.getByText('Filas de Atendimento')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(5000)

    console.log('API requests capturadas:', JSON.stringify(apiRequests, null, 2))

    const getQueues = apiRequests.find(r => r.method === 'GET')
    expect(getQueues, 'Request GET /queues deveria ter sido feita').toBeTruthy()
    expect(getQueues!.status).toBe(200)
  })

  test('deve exibir filas ou estado vazio sem erros', async ({ page }) => {
    await page.goto('/filas')
    await expect(page.getByText('Filas de Atendimento')).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(5000)

    const hasError = await page.getByText(/erro ao carregar filas/i).isVisible().catch(() => false)
    expect(hasError, 'Nao deveria exibir mensagem de erro').toBe(false)

    const emptyState = page.getByText(/nenhuma fila cadastrada/i)
    const isEmpty = await emptyState.isVisible().catch(() => false)

    if (!isEmpty) {
      const queueCards = page.locator('[class*="grid"]').locator('> div')
      const cardCount = await queueCards.count()
      expect(cardCount).toBeGreaterThan(0)
    }
  })

  test('deve navegar para Nova Fila ao clicar no botao', async ({ page }) => {
    await page.goto('/filas')
    await expect(page.getByText('Filas de Atendimento')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: /Nova Fila/i }).click()
    await expect(page).toHaveURL(/\/filas\/nova/, { timeout: 10000 })
  })
})
