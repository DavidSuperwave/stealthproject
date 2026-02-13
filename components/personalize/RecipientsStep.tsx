'use client'

import { useState } from 'react'
import { Upload, Download, FileSpreadsheet, X } from 'lucide-react'

interface Recipient {
  id: string
  first_name: string
  company: string
  email: string
  industry?: string
}

interface RecipientsStepProps {
  variables: { name: string; type: string }[]
  recipients: Recipient[]
  onUploadCSV: (file: File) => void
  onRemoveRecipient: (id: string) => void
}

const mockRecipients: Recipient[] = [
  { id: '1', first_name: 'John', company: 'Acme Inc', email: 'john@acme.com', industry: 'Technology' },
  { id: '2', first_name: 'Sarah', company: 'TechFlow', email: 'sarah@techflow.io', industry: 'SaaS' },
  { id: '3', first_name: 'Mike', company: 'StartupXYZ', email: 'mike@startup.xyz', industry: 'Fintech' },
]

export default function RecipientsStep({ 
  variables, 
  recipients = mockRecipients,
  onUploadCSV,
  onRemoveRecipient 
}: RecipientsStepProps) {
  const [isDragging, setIsDragging] = useState(false)

  const requiredColumns = ['first_name', 'company', 'email']
  const optionalColumns = variables.filter(v => v.type === 'industry').map(v => v.name)

  const handleDownloadTemplate = () => {
    const headers = [...requiredColumns, ...optionalColumns].join(',')
    const csvContent = `data:text/csv;charset=utf-8,${headers}\nJohn,Acme Inc,john@acme.com,Technology`
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'recipients_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-2">Upload Recipients</h2>
        <p className="text-text-secondary">Upload a CSV file with your recipient data.</p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all
          ${isDragging ? 'border-accent bg-accent/5' : 'border-border bg-bg-secondary'}
        `}
      >
        <div className="space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-bg-elevated flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-text-secondary" />
          </div>

          <p className="text-white">Drop CSV here or click to browse</p>

          <div className="text-sm text-text-muted space-y-1">
            <p>Required columns: {requiredColumns.join(', ')}</p>
            <p>Optional: {optionalColumns.join(', ') || 'None'}</p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="text-accent hover:text-accent-hover text-sm underline"
          >
            Download Template CSV
          </button>
        </div>
      </div>

      {/* Preview */}
      {recipients.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Preview (First {Math.min(recipients.length, 5)} rows)
            </h3>
            <span className="text-text-muted">Total recipients: {recipients.length}</span>
          </div>

          <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">first_name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">industry</th>
                </tr>
              </thead>
              <tbody>
                {recipients.slice(0, 5).map((recipient, index) => (
                  <tr key={recipient.id} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-3 text-text-muted">{index + 1}</td>
                    <td className="px-4 py-3 text-white">{recipient.first_name}</td>
                    <td className="px-4 py-3 text-white">{recipient.company}</td>
                    <td className="px-4 py-3 text-text-secondary">{recipient.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{recipient.industry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-bg-secondary rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Estimated credits needed:</span>
              <span className="text-white font-semibold">{recipients.length} credits</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
