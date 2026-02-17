/**
 * Close CRM Integration API Route
 * Sends new signups to Close CRM as leads with opportunities
 */

import { NextRequest, NextResponse } from 'next/server'

const CLOSE_API_KEY = process.env.CLOSE_API_KEY || ''
const CLOSE_API_URL = 'https://api.close.com/api/v1'

// Close CRM Configuration
const CLOSE_CONFIG = {
  // Custom Field IDs
  CUSTOM_FIELDS: {
    FUENTE: 'cf_l0z2KbeLbKTEKnJAyYk7pXQOGkUd5VkWUZHooO6N05V', // Source
    SIGNUP_DATE: 'signup_date', // We'll use note for this since it's not a custom field
    USER_ID: 'user_id', // We'll use note for this
  },
  // Lead Status
  LEAD_STATUS: 'stat_akk8EK1dRWnxVJQ6o970bMIGKTU2MZVouQoDTGKgfmx', // Potential
  // Opportunity Pipeline
  PIPELINE_ID: 'pipe_6p1Uhj3YxEKHMqAKsEQFKX',
  OPPORTUNITY_STATUS: 'stat_nz5nAqr6UmQmIZhnP7cRkkbcPydIYkK5e8vqhdHsjQL', // Estableció Interés
}

interface CloseLeadData {
  name: string
  status_id?: string
  contacts: Array<{
    name: string
    emails: Array<{ email: string; type: string }>
    phones?: Array<{ phone: string; type: string }>
  }>
  custom?: Record<string, unknown>
  description?: string
}

interface CloseOpportunityData {
  lead_id: string
  status_id: string
  pipeline_id: string
  value: number
  value_period: string
  note: string
}

/**
 * Create a lead in Close CRM
 */
async function createCloseLead(leadData: CloseLeadData) {
  if (!CLOSE_API_KEY) {
    console.error('[Close CRM] API key not configured')
    throw new Error('Close API key not configured')
  }

  const response = await fetch(`${CLOSE_API_URL}/lead/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify(leadData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Close CRM] API Error:', response.status, errorText)
    throw new Error(`Close API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Create an opportunity for a lead
 */
async function createOpportunity(oppData: CloseOpportunityData) {
  const response = await fetch(`${CLOSE_API_URL}/opportunity/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify(oppData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Close CRM] Opportunity API Error:', response.status, errorText)
    // Don't throw - lead is already created, just log the error
    return null
  }

  return response.json()
}

/**
 * POST /api/close/create-lead
 * Creates a new lead in Close CRM from signup data with opportunity
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      firstName, 
      lastName, 
      email, 
      phone,
      source = 'DobleLabs Website',
      userId 
    } = body

    if (!email || !firstName) {
      return NextResponse.json(
        { error: 'Email and first name are required' },
        { status: 400 }
      )
    }

    const fullName = `${firstName} ${lastName || ''}`.trim()
    const signupDate = new Date().toISOString()

    // Build lead data for Close CRM
    const leadData: CloseLeadData = {
      name: fullName,
      status_id: CLOSE_CONFIG.LEAD_STATUS, // Set to "Potential"
      contacts: [
        {
          name: fullName,
          emails: [{ email, type: 'office' }],
        },
      ],
      // Use custom fields with IDs
      custom: {
        [CLOSE_CONFIG.CUSTOM_FIELDS.FUENTE]: source,
      },
      // Add signup info to description
      description: `Signup Date: ${signupDate}\nUser ID: ${userId || 'N/A'}\nSource: ${source}`,
    }

    // Add phone if provided
    if (phone) {
      leadData.contacts[0].phones = [{ phone, type: 'mobile' }]
    }

    // Create lead in Close CRM
    const closeResponse = await createCloseLead(leadData)
    console.log('[Close CRM] Lead created:', closeResponse.id)

    // Create opportunity for the lead
    const opportunityData: CloseOpportunityData = {
      lead_id: closeResponse.id,
      status_id: CLOSE_CONFIG.OPPORTUNITY_STATUS, // "Estableció Interés"
      pipeline_id: CLOSE_CONFIG.PIPELINE_ID,
      value: 0, // Initial value - update when they purchase
      value_period: 'one_time',
      note: `New signup from ${source} on ${signupDate}`,
    }

    const opportunity = await createOpportunity(opportunityData)
    if (opportunity) {
      console.log('[Close CRM] Opportunity created:', opportunity.id)
    }

    return NextResponse.json({
      success: true,
      closeLeadId: closeResponse.id,
      closeOpportunityId: opportunity?.id || null,
      message: 'Lead and opportunity created in Close CRM',
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Close CRM] Failed to create lead:', message)
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
