import Layout from '@/components/layout/Layout'

export default function SubscriptionPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-white">Suscripción</h1>

        {/* Current Plan */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-lg font-medium text-white mb-4">Plan Actual</h2>
          
          <div className="flex items-center justify-between p-4 bg-bg-elevated rounded-lg">
            <div>
              <p className="text-white font-medium">Prueba Gratis</p>
              <p className="text-text-secondary text-sm">14 días restantes</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">20</p>
              <p className="text-text-secondary text-sm">créditos restantes</p>
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'Starter', price: '$29', credits: '100/mes', features: ['100 créditos/mes', 'Soporte básico', 'Calidad estándar'] },
            { name: 'Pro', price: '$99', credits: '500/mes', features: ['500 créditos/mes', 'Soporte prioritario', 'Alta calidad', 'Acceso API'] },
            { name: 'Enterprise', price: 'Personalizado', credits: 'Ilimitado', features: ['Créditos ilimitados', 'Soporte dedicado', 'Calidad premium', 'Integración personalizada'] },
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
                Mejorar
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
