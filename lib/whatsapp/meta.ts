import { getInsforgeEnv } from '@/lib/insforge/env'

type SendAlertInput = {
  to: string
  propertyTitle: string
  propertyPrice: string
  propertyUrl: string
  locationName: string
}

type SendAlertResult = {
  ok: boolean
  providerMessageId: string | null
  error: string | null
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '')
}

export async function sendMetaWhatsappPropertyAlert(input: SendAlertInput): Promise<SendAlertResult> {
  const env = getInsforgeEnv()
  if (!env.metaWaToken || !env.metaWaPhoneNumberId) {
    return {
      ok: false,
      providerMessageId: null,
      error: 'WhatsApp provider is not configured',
    }
  }

  const to = normalizePhone(input.to)
  const endpoint = `https://graph.facebook.com/${env.metaWaApiVersion}/${env.metaWaPhoneNumberId}/messages`
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: env.metaWaTemplateName,
      language: {
        code: 'es',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: input.propertyTitle.slice(0, 60) },
            { type: 'text', text: input.propertyPrice.slice(0, 40) },
            { type: 'text', text: input.locationName.slice(0, 50) },
            { type: 'text', text: input.propertyUrl.slice(0, 200) },
          ],
        },
      ],
    },
  }

  let lastError: string | null = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.metaWaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)
    if (response.ok) {
      const providerMessageId = payload?.messages?.[0]?.id
      return {
        ok: true,
        providerMessageId: typeof providerMessageId === 'string' ? providerMessageId : null,
        error: null,
      }
    }

    const providerError =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : `Meta API returned ${response.status}`
    lastError = providerError
    if (response.status >= 400 && response.status < 500) break
    await sleep(350 * (attempt + 1))
  }

  return {
    ok: false,
    providerMessageId: null,
    error: lastError || 'Unknown WhatsApp provider error',
  }
}
