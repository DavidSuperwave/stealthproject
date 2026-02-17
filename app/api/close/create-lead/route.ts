/**
 * Close CRM Integration API Route
 * Sends new signups to Close CRM as leads with opportunities, notes, tags, tasks, and email sequences
 */

import { NextRequest, NextResponse } from 'next/server'

const CLOSE_API_KEY = process.env.CLOSE_API_KEY || ''
const CLOSE_API_URL = 'https://api.close.com/api/v1'

// Close CRM Configuration
const CLOSE_CONFIG = {
  // Custom Field IDs
  CUSTOM_FIELDS: {
    FUENTE: 'cf_l0z2KbeLbKTEKnJAyYk7pXQOGkUd5VkWUZHooO6N05V', // Source
  },
  // Lead Status
  LEAD_STATUS: 'stat_akk8EK1dRWnxVJQ6o970bMIGKTU2MZVouQoDTGKgfmx', // Potential
  // Opportunity Pipeline
  PIPELINE_ID: 'pipe_6p1Uhj3YxEKHMqAKsEQFKX',
  OPPORTUNITY_STATUS: 'stat_nz5nAqr6UmQmIZhnP7cRkkbcPydIYkK5e8vqhdHsjQL', // Estableció Interés
  // Tag name
  TAG_NAME: 'doblelabs',
  // Opportunity value in MXN
  OPPORTUNITY_VALUE: 2000,
  // Email sequence template ID (you'll need to create this in Close)
  // EMAIL_SEQUENCE_ID: 'seq_xxx', // Uncomment and set after creating in Close
  // Task due date offset (days)
  FOLLOW_UP_DAYS: 1,
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

interface CloseNoteData {
  lead_id: string
  note: string
}

interface CloseTaskData {
  lead_id: string
  assigned_to?: string
  text: string
  due_date: string
  is_complete: boolean
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
    return null
  }

  return response.json()
}

/**
 * Add a note/activity to a lead
 */
async function addNoteToLead(noteData: CloseNoteData) {
  const response = await fetch(`${CLOSE_API_URL}/activity/note/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify(noteData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Close CRM] Note API Error:', response.status, errorText)
    return null
  }

  return response.json()
}

/**
 * Add a tag to a lead
 */
async function addTagToLead(leadId: string, tag: string) {
  // First, check if tag exists or create it
  const tagResponse = await fetch(`${CLOSE_API_URL}/tag/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      name: tag,
      color: '#E040FB', // Purple to match your brand
    }),
  })

  let tagId
  if (tagResponse.ok) {
    const tagData = await tagResponse.json()
    tagId = tagData.id
  } else {
    // Tag might already exist, try to find it
    const existingTags = await fetch(`${CLOSE_API_URL}/tag/`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
      },
    })
    if (existingTags.ok) {
      const tags = await existingTags.json()
      const existingTag = tags.data?.find((t: { name: string }) => t.name.toLowerCase() === tag.toLowerCase())
      if (existingTag) {
        tagId = existingTag.id
      }
    }
  }

  if (!tagId) {
    console.error('[Close CRM] Could not create or find tag')
    return null
  }

  // Add tag to lead
  const response = await fetch(`${CLOSE_API_URL}/lead/${leadId}/tags/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      tag_id: tagId,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Close CRM] Tag API Error:', response.status, errorText)
    return null
  }

  return response.json()
}

/**
 * Create a follow-up task for a lead
 */
async function createFollowUpTask(taskData: CloseTaskData) {
  const response = await fetch(`${CLOSE_API_URL}/task/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify(taskData),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Close CRM] Task API Error:', response.status, errorText)
    return null
  }

  return response.json()
}

/**
 * Subscribe lead to email sequence (if sequence ID is configured)
 */
async function subscribeToEmailSequence(leadId: string, contactId: string, sequenceId: string) {
  const response = await fetch(`${CLOSE_API_URL}/sequence_subscription/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(CLOSE_API_KEY + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      sequence_id: sequenceId,
      contact_id: contactId,
      sender_account_id: null, // Will use default
      sender_name: null,
      sender_email: null,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Close CRM] Sequence API Error:', response.status, errorText)
    return null
  }

  return response.json()
}

/**
 * POST /api/close/create-lead
 * Creates a new lead in Close CRM from signup data with opportunity, note, tag, task, and email sequence
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
    const formattedDate = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Calculate follow-up date (1 day from now)
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + CLOSE_CONFIG.FOLLOW_UP_DAYS)
    const followUpDateString = followUpDate.toISOString()

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
      description: `Signup Date: ${formattedDate}\nUser ID: ${userId || 'N/A'}\nSource: ${source}`,
    }

    // Add phone if provided
    if (phone) {
      leadData.contacts[0].phones = [{ phone, type: 'mobile' }]
    }

    // Create lead in Close CRM
    const closeResponse = await createCloseLead(leadData)
    console.log('[Close CRM] Lead created:', closeResponse.id)

    // Get the contact ID from the created lead
    const contactId = closeResponse.contacts?.[0]?.id

    // Create opportunity for the lead with $2000 MXN value
    const opportunityData: CloseOpportunityData = {
      lead_id: closeResponse.id,
      status_id: CLOSE_CONFIG.OPPORTUNITY_STATUS, // "Estableció Interés"
      pipeline_id: CLOSE_CONFIG.PIPELINE_ID,
      value: CLOSE_CONFIG.OPPORTUNITY_VALUE, // 2000 MXN
      value_period: 'one_time',
      note: `Nuevo registro de ${source} el ${formattedDate}. Valor estimado: $2,000 MXN`,
    }

    const opportunity = await createOpportunity(opportunityData)
    if (opportunity) {
      console.log('[Close CRM] Opportunity created:', opportunity.id, 'Value: $2000 MXN')
    }

    // Add note/activity to the lead
    const noteData: CloseNoteData = {
      lead_id: closeResponse.id,
      note: `🎉 Nuevo registro en DobleLabs\n\n` +
            `Fecha: ${formattedDate}\n` +
            `Email: ${email}\n` +
            `Teléfono: ${phone || 'No proporcionado'}\n` +
            `User ID: ${userId || 'N/A'}\n` +
            `Fuente: ${source}\n` +
            `Valor Oportunidad: $2,000 MXN`,
    }

    const note = await addNoteToLead(noteData)
    if (note) {
      console.log('[Close CRM] Note added:', note.id)
    }

    // Add tag to lead
    const tag = await addTagToLead(closeResponse.id, CLOSE_CONFIG.TAG_NAME)
    if (tag) {
      console.log('[Close CRM] Tag added:', CLOSE_CONFIG.TAG_NAME)
    }

    // Create follow-up task
    const taskData: CloseTaskData = {
      lead_id: closeResponse.id,
      text: `📞 Llamar a ${firstName} para dar seguimiento al registro en DobleLabs. Valor: $2,000 MXN`,
      due_date: followUpDateString,
      is_complete: false,
    }

    const task = await createFollowUpTask(taskData)
    if (task) {
      console.log('[Close CRM] Follow-up task created:', task.id, 'Due:', followUpDateString)
    }

    // Subscribe to email sequence (if configured)
    let sequenceSubscription = null
    // Uncomment the line below and set EMAIL_SEQUENCE_ID in CLOSE_CONFIG when ready
    // if (contactId && CLOSE_CONFIG.EMAIL_SEQUENCE_ID) {
    //   sequenceSubscription = await subscribeToEmailSequence(
    //     closeResponse.id, 
    //     contactId, 
    //     CLOSE_CONFIG.EMAIL_SEQUENCE_ID
    //   )
    //   if (sequenceSubscription) {
    //     console.log('[Close CRM] Email sequence subscription created:', sequenceSubscription.id)
    //   }
    // }

    return NextResponse.json({
      success: true,
      closeLeadId: closeResponse.id,
      closeOpportunityId: opportunity?.id || null,
      closeNoteId: note?.id || null,
      closeTaskId: task?.id || null,
      closeTagApplied: tag ? CLOSE_CONFIG.TAG_NAME : null,
      message: 'Lead, opportunity, note, tag, and follow-up task created in Close CRM',
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
