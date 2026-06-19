'use client'

import Script from 'next/script'

const calendlyUrl = 'https://calendly.com/superwave/superwave-callback?primary_color=058c00'

export default function CalendlyEmbed() {
  return (
    <>
      <div
        className="calendly-inline-widget min-w-0 w-full overflow-hidden rounded-[24px]"
        data-url={calendlyUrl}
        style={{
          minWidth: '320px',
          height: 'clamp(640px, 82vw, 780px)',
        }}
      />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
    </>
  )
}
