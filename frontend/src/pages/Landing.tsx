import { ArrowRight, BarChart3, Users, Zap, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Gym Management Made Simple
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Modern SaaS platform for managing members, payments, classes, and attendance. All in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/signup" className="btn-primary text-lg px-8 py-3">
            Start Free Trial <ArrowRight className="inline ml-2" size={20} />
          </Link>
          <a href="https://docs.gymtrack.io" className="btn-outline text-lg px-8 py-3">
            View Documentation
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Powerful Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Users size={32} className="text-blue-600" />}
              title="Member Management"
              description="Manage member profiles, statuses, and communication preferences"
            />
            <FeatureCard
              icon={<BarChart3 size={32} className="text-green-600" />}
              title="Real-Time Analytics"
              description="Track revenue, member growth, and attendance metrics"
            />
            <FeatureCard
              icon={<Zap size={32} className="text-yellow-600" />}
              title="Payment Integration"
              description="Accept payments via Razorpay, UPI, cards, and more"
            />
            <FeatureCard
              icon={<Shield size={32} className="text-red-600" />}
              title="Secure & Scalable"
              description="Enterprise-grade security with multi-tenant isolation"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Simple Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PricingCard
              name="Starter"
              price="₹999"
              features={["Up to 500 members", "1 location", "Basic analytics"]}
            />
            <PricingCard
              name="Professional"
              price="₹2,999"
              features={["Up to 2000 members", "3 locations", "Advanced analytics", "WhatsApp integration"]}
              popular
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              features={["Unlimited members", "Unlimited locations", "White-labeling", "API access"]}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

const FeatureCard = ({ icon, title, description }: any) => (
  <div className="card">
    <div className="mb-4">{icon}</div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
)

const PricingCard = ({ name, price, features, popular = false }: any) => (
  <div className={`card ${popular ? 'ring-2 ring-blue-600' : ''}`}>
    <h3 className="text-xl font-bold mb-2">{name}</h3>
    <p className="text-3xl font-bold text-blue-600 mb-6">{price}/mo</p>
    <ul className="space-y-3 mb-6">
      {features.map((feature: string) => (
        <li key={feature} className="flex items-center">
          <span className="text-green-600 mr-2">✓</span>
          {feature}
        </li>
      ))}
    </ul>
    <button className={popular ? 'btn-primary w-full' : 'btn-outline w-full'}>
      Get Started
    </button>
  </div>
)

export default Landing
