/**
 * Close CRM Client Utilities
 * Helper functions for sending data to Close CRM
 */

interface CreateLeadData {
  firstName: string
  lastName?: string
  email: string
  phone?: string
  source?: string
  userId?: string
}

/**
 * Create a lead in Close CRM
 */
export async function createCloseLead(data: CreateLeadData): Promise<{ success: boolean; closeLeadId?: string; error?: string }> {
  try {
    const response = await fetch('/api/close/create-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[Close CRM] Error creating lead:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[Close CRM] Lead created:', result.closeLeadId)
    return { success: true, closeLeadId: result.closeLeadId }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Close CRM] Failed to create lead:', message)
    return { success: false, error: message }
  }
}
