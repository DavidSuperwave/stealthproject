'use client'

import Layout from '@/components/layout/Layout'
import ScriptWorkshop from '@/components/script-workshop/ScriptWorkshop'

export default function ScriptsPage() {
  return (
    <Layout>
      <ScriptWorkshop 
        supermemoryApiKey={process.env.NEXT_PUBLIC_SUPERMEMORY_API_KEY || ''}
        onUseScript={(script) => {
          console.log('Using script:', script)
          // Navigate to personalize flow with this script
        }}
      />
    </Layout>
  )
}
