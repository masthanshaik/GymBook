# Frontend Implementation Guide

## Overview

The React frontend is a complete, modern web application for the GymBook SaaS platform. It includes authentication, a dashboard, and management interfaces for members, payments, classes, and more.

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool (fast) |
| **Tailwind CSS** | Styling |
| **React Router** | Navigation |
| **Zustand** | State management |
| **Axios** | HTTP client |
| **React Hook Form** | Form handling |
| **Lucide React** | Icons |

## Project Structure

```
frontend/
├── index.html                 # HTML entry point
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite config
├── tailwind.config.js        # Tailwind config
├── Dockerfile                # Docker build
│
└── src/
    ├── main.tsx              # React entry point
    ├── App.tsx               # Main app with routes
    ├── index.css             # Global styles
    │
    ├── components/
    │   └── layout/
    │       ├── DashboardLayout.tsx   # Dashboard layout
    │       ├── Sidebar.tsx           # Navigation sidebar
    │       ├── Header.tsx            # Top header
    │       └── LandingLayout.tsx     # Landing page layout
    │
    ├── pages/
    │   ├── Landing.tsx       # Landing/home page
    │   ├── Dashboard.tsx     # Dashboard
    │   ├── Members.tsx       # Members list
    │   ├── Memberships.tsx   # Plans & memberships
    │   ├── Payments.tsx      # Payments
    │   ├── Classes.tsx       # Classes
    │   ├── Attendance.tsx    # Attendance
    │   ├── Reports.tsx       # Reports
    │   ├── Settings.tsx      # Settings
    │   ├── NotFound.tsx      # 404 page
    │   └── Auth/
    │       ├── Login.tsx     # Login page
    │       └── Signup.tsx    # Signup page
    │
    ├── services/
    │   └── api.ts            # API client with axios
    │
    ├── store/
    │   └── auth.ts           # Zustand auth store
    │
    ├── types/
    │   └── index.ts          # TypeScript types
    │
    └── utils/
        └── index.ts          # Utility functions
```

## Getting Started

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Runs at `http://localhost:3000` with hot reload.

### Build for Production

```bash
npm run build
npm run preview
```

## Pages & Features

### 1. Landing Page (`/`)
- Hero section with call-to-action
- Feature showcase
- Pricing plans
- Navigation to login/signup

### 2. Authentication

#### Login Page (`/login`)
- Email and password input
- Form validation
- Token storage
- Redirect to dashboard on success

#### Signup Page (`/signup`)
- Gym registration form
- Owner information
- Auto-login after signup
- Form validation with React Hook Form

### 3. Protected Dashboard

All protected pages require authentication and use the `DashboardLayout`:

#### Dashboard (`/dashboard`)
- Key metrics cards (members, revenue, renewals, checkins)
- Revenue trend chart
- Member growth chart
- Recent activity

#### Members (`/members`)
- List all members
- Search and filter
- Add new member
- Edit/delete member
- Member status management

#### Memberships (`/memberships`)
- Plan management
- Create/edit plans
- Plan analytics
- Member-to-plan assignments

#### Payments (`/payments`)
- Payment history
- Transaction details
- Refund management
- Payment status tracking

#### Classes (`/classes`)
- Class schedule management
- Member enrollment
- Class capacity tracking
- Attendance per class

#### Attendance (`/attendance`)
- Check-in/check-out tracking
- Attendance reports
- Member presence status
- Historical attendance data

#### Reports (`/reports`)
- Financial reports (revenue, expenses, profit)
- Member analytics (growth, churn, retention)
- Attendance metrics
- Class utilization
- Export to PDF/Excel

#### Settings (`/settings`)
- Gym profile management
- Payment gateway configuration
- Communication settings (email, SMS, WhatsApp)
- Team member management
- Subscription management

## Key Components

### API Client

```typescript
// src/services/api.ts
import { apiClient } from '@services/api'

// Login
await apiClient.login(email, password)

// Members
await apiClient.getMembers(page, pageSize)
await apiClient.createMember(data)
await apiClient.updateMember(memberId, data)

// Payments
await apiClient.initiatePayment(data)
await apiClient.refundPayment(paymentId, data)

// And many more...
```

### Authentication Store

```typescript
// src/store/auth.ts
import { useAuthStore } from '@store/auth'

const { isAuthenticated, user, logout, setTokens, setUser } = useAuthStore()
```

### Protected Route

```typescript
// App.tsx
<Route
  element={
    <ProtectedRoute>
      <DashboardLayout />
    </ProtectedRoute>
  }
>
  {/* Protected routes */}
</Route>
```

## Styling

Uses Tailwind CSS with custom utility classes:

```tsx
// Buttons
<button className="btn-primary">Primary</button>
<button className="btn-secondary">Secondary</button>
<button className="btn-outline">Outline</button>

// Form inputs
<input className="input-field" />

// Cards
<div className="card">Content</div>

// Typography
<h1 className="section-title">Title</h1>
<h2 className="subsection-title">Subtitle</h2>
```

## Implementation Roadmap

### Phase 1: Core Pages (✓ Complete)
- ✅ Landing page
- ✅ Login page
- ✅ Signup page
- ✅ Dashboard layout
- ✅ Basic navigation

### Phase 2: Member Management (TODO)
- [ ] Members list with pagination
- [ ] Member profile view
- [ ] Add/edit member form
- [ ] Member status management
- [ ] Bulk member operations

### Phase 3: Financial Management (TODO)
- [ ] Membership plans CRUD
- [ ] Payment processing
- [ ] Invoice generation
- [ ] Refund handling
- [ ] Financial reports

### Phase 4: Class Management (TODO)
- [ ] Class schedule management
- [ ] Member enrollment
- [ ] Attendance tracking
- [ ] Class reports

### Phase 5: Analytics (TODO)
- [ ] Dashboard charts (Recharts)
- [ ] Financial reports
- [ ] Member analytics
- [ ] Export to PDF/Excel

### Phase 6: Admin Features (TODO)
- [ ] Admin dashboard
- [ ] Vendor management
- [ ] System analytics
- [ ] Support tickets

## API Integration Points

### Authentication
```typescript
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET /api/v1/auth/me
```

### Members
```typescript
GET /api/v1/members?page=1&page_size=20
POST /api/v1/members
GET /api/v1/members/{id}
PUT /api/v1/members/{id}
DELETE /api/v1/members/{id}
```

### Memberships
```typescript
GET /api/v1/memberships/plans
POST /api/v1/memberships/plans
POST /api/v1/memberships/{id}/renew
```

### Payments
```typescript
POST /api/v1/payments/initiate
GET /api/v1/payments/{id}
POST /api/v1/payments/{id}/refund
```

### Reports
```typescript
GET /api/v1/reports/financial
GET /api/v1/reports/members
GET /api/v1/reports/attendance
GET /api/v1/reports/export/pdf
```

## Development Best Practices

### Component Structure

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/auth'

const MyComponent = () => {
  const [state, setState] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  return (
    <div>
      {/* Component content */}
    </div>
  )
}

export default MyComponent
```

### API Calls

```typescript
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)

const fetchData = async () => {
  setLoading(true)
  try {
    const response = await apiClient.getMembers()
    // Handle response
  } catch (err: any) {
    setError(err.response?.data?.detail || 'Error')
  } finally {
    setLoading(false)
  }
}
```

### Form Handling

```typescript
import { useForm } from 'react-hook-form'

const MyForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = (data) => {
    // Submit form
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: true })} />
      {errors.email && <p>Email is required</p>}
      <button type="submit">Submit</button>
    </form>
  )
}
```

## Testing

```bash
# In development, use React DevTools in browser

# Test API integration
npm run dev

# Navigate to http://localhost:3000
```

## Deployment

### Docker

```bash
docker build -t gymbook-frontend:latest ./frontend
docker run -p 3000:3000 gymbook-frontend:latest
```

### Vercel

```bash
npm install -g vercel
cd frontend
vercel
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

## Troubleshooting

### API Connection Issues
- Check `VITE_API_URL` in `.env`
- Ensure backend is running on port 8000
- Check browser console for CORS errors

### Authentication Issues
- Clear browser storage: DevTools → Application → Local Storage → Clear All
- Check tokens are being stored correctly
- Verify API is accepting requests with Authorization header

### Build Issues
```bash
rm -rf node_modules
npm install
npm run build
```

## Next Steps

1. **Run the application**
   ```bash
   docker-compose up -d
   cd frontend && npm install && npm run dev
   ```

2. **Test authentication**
   - Go to http://localhost:3000
   - Sign up for a new gym account
   - Login and explore dashboard

3. **Implement remaining pages**
   - See Phase 2-6 in roadmap
   - Follow component structure patterns
   - Use API client for all backend calls

4. **Add more features**
   - Charts and analytics (Recharts)
   - Real-time updates (WebSocket)
   - File uploads
   - Notifications

## Code Quality

```bash
npm run lint          # Check code quality
npm run format        # Format code with Prettier
npm run type-check    # TypeScript checking
```

## Resources

- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Vite Docs](https://vitejs.dev)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com)
- [Zustand Docs](https://github.com/pmndrs/zustand)

---

**The frontend is ready to use and extend. Follow the implementation roadmap to complete all features!**
