/**
 * Close CRM Integration API Route
 * Sends new signups to Close CRM as leads
 */

import { NextRequest, NextResponse } from 'next/server'

const CLOSE_API_KEY = process.env.CLOSE_API_KEY || ''
const CLOSE_API_URL = 'https://api.close.com/api/v1'

interface CloseLeadData {
  name: string
  contacts: Array<{
    name: string
    emails: Array<{ email: string; type: string }>
    phones?: Array<{ phone: string; type: string }>
  }>
  custom?: Record<string, unknown>
}

/**
 * Create or update a lead in Close CRM
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
 * POST /api/close/create-lead
 * Creates a new lead in Close CRM from signup data
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

    // Build lead data for Close CRM
    const leadData: CloseLeadData = {
      name: fullName,
      contacts: [
        {
          name: fullName,
          emails: [{ email, type: 'office' }],
        },
      ],
      custom: {
        'Source': source,
        'Signup Date': new Date().toISOString(),
        'User ID': userId || 'N/A',
      },
    }

    // Add phone if provided
    if (phone) {
      leadData.contacts[0].phones = [{ phone, type: 'mobile' }]
    }

    // Send to Close CRM
    const closeResponse = await createCloseLead(leadData)

    console.log('[Close CRM] Lead created successfully:', closeResponse.id)

    return NextResponse.json({
      success: true,
      closeLeadId: closeResponse.id,
      message: 'Lead created in Close CRM',
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
