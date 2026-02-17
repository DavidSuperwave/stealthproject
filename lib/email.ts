/**
 * Email notification helpers.
 *
 * Uses Resend (https://resend.com) if RESEND_API_KEY is set.
 * Falls back to a no-op with a console log when no key is configured.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FROM_EMAIL = process.env.EMAIL_FROM || 'DobleLabs <noreply@doblelabs.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[Email] Would send to ${to}: ${subject}`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend API error ${res.status}: ${body}`)
  }
}

export async function sendCompletionEmail(params: {
  to: string
  projectName: string
  downloadUrl: string | null
  projectId: string
}): Promise<void> {
  const { to, projectName, downloadUrl, projectId } = params
  const projectLink = `${APP_URL}/app/upload?project=${projectId}`

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #fff; background: #0D0D0F; padding: 32px; border-radius: 12px;">
      <h1 style="color: #E040FB; margin-bottom: 8px;">¡Tu video está listo!</h1>
      <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6;">
        Tu video para el proyecto <strong style="color: #fff;">"${projectName}"</strong> se ha generado exitosamente con DobleLabs.
      </p>
      ${downloadUrl ? `
        <a href="${downloadUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #E040FB; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Descargar Video
        </a>
      ` : ''}
      <p style="margin-top: 16px;">
        <a href="${projectLink}" style="color: #E040FB; text-decoration: underline;">Ver proyecto en DobleLabs</a>
      </p>
      <hr style="border: none; border-top: 1px solid #2D2D35; margin: 24px 0;" />
      <p style="color: #6B7280; font-size: 12px;">
        Este email fue enviado por DobleLabs. Si no solicitaste este email, puedes ignorarlo.
      </p>
    </div>
  `

  await send(to, `¡Tu video "${projectName}" está listo! — DobleLabs`, html)
}

export async function sendFailureEmail(params: {
  to: string
  projectName: string
  projectId: string
}): Promise<void> {
  const { to, projectName, projectId } = params
  const projectLink = `${APP_URL}/app/upload?project=${projectId}`

  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #fff; background: #0D0D0F; padding: 32px; border-radius: 12px;">
      <h1 style="color: #EF4444; margin-bottom: 8px;">Error en la generación</h1>
      <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6;">
        Hubo un problema al generar el video para <strong style="color: #fff;">"${projectName}"</strong>.
        Por favor intenta de nuevo.
      </p>
      <a href="${projectLink}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #E040FB; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Reintentar
      </a>
      <hr style="border: none; border-top: 1px solid #2D2D35; margin: 24px 0;" />
      <p style="color: #6B7280; font-size: 12px;">
        Este email fue enviado por DobleLabs. Si no solicitaste este email, puedes ignorarlo.
      </p>
    </div>
  `

  await send(to, `Error en tu video "${projectName}" — DobleLabs`, html)
}
