import { Outlet, Link } from 'react-router-dom'

const LandingLayout = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">GymBook</h1>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#docs" className="text-gray-600 hover:text-gray-900">Docs</a>
            </div>
            <div className="flex space-x-4">
              <Link to="/login" className="btn-secondary">Sign In</Link>
              <Link to="/signup" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <p className="text-center text-gray-400">© 2024 GymBook. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingLayout
