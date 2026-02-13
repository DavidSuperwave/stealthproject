import Layout from '@/components/layout/Layout'

export default function SubscriptionPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-white">Subscription</h1>

        {/* Current Plan */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-lg font-medium text-white mb-4">Current Plan</h2>
          
          <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg">
            <div>
              <p className="text-white font-medium">Free Trial</p>
              <p className="text-text-secondary text-sm">14 days remaining</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">20</p>
              <p className="text-text-secondary text-sm">credits left</p>
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'Starter', price: '$29', credits: '100/mo', features: ['100 credits/month', 'Basic support', 'Standard quality'] },
            { name: 'Pro', price: '$99', credits: '500/mo', features: ['500 credits/month', 'Priority support', 'High quality', 'API access'] },
            { name: 'Enterprise', price: 'Custom', credits: 'Unlimited', features: ['Unlimited credits', 'Dedicated support', 'Premium quality', 'Custom integration'] },
          ].map((plan) => (
            <div 
              key={plan.name}
              className="bg-bg-secondary rounded-xl border border-border p-6"
            >
              <h3 className="text-lg font-medium text-white">{plan.name}</h3>
              <p className="text-3xl font-bold text-white mt-2">{plan.price}</p>
              <p className="text-text-secondary">{plan.credits}</p>
              
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm text-text-secondary">• {feature}</li>
                ))}
              </ul>

              <button className="w-full mt-6 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors">
                Upgrade
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
