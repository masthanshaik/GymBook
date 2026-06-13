# GymBook Frontend

Modern React.js frontend for the GymBook SaaS Gym Management Platform.

## Features

- 🎨 Responsive design with Tailwind CSS
- ⚡ Fast with Vite
- 🔐 JWT authentication
- 🛡️ Protected routes
- 📱 Mobile-first approach
- 🎯 State management with Zustand
- 📡 API integration with Axios
- 🔄 Token refresh mechanism

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Zustand** - State management
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Runs at `http://localhost:3000`

### Build

```bash
npm run build
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Update with your backend URL:

```
VITE_API_URL=http://localhost:8000/api/v1
```

## Project Structure

```
src/
├── components/        # Reusable components
│   └── layout/       # Layout components
├── pages/            # Page components
│   └── Auth/         # Authentication pages
├── services/         # API client
├── store/            # Zustand stores
├── types/            # TypeScript types
├── utils/            # Utility functions
├── styles/           # Global styles
├── App.tsx           # Main app component
└── main.tsx          # Entry point
```

## Available Pages

- `/` - Landing page
- `/login` - Login
- `/signup` - Vendor signup
- `/dashboard` - Dashboard (protected)
- `/members` - Members management (protected)
- `/memberships` - Membership plans (protected)
- `/payments` - Payments (protected)
- `/classes` - Classes management (protected)
- `/attendance` - Attendance tracking (protected)
- `/reports` - Analytics & reports (protected)
- `/settings` - Settings (protected)

## API Integration

The `apiClient` service handles all API communication:

```typescript
import { apiClient } from '@services/api'

// Login
const response = await apiClient.login(email, password)

// Get members
const members = await apiClient.getMembers(page, pageSize)

// Create member
await apiClient.createMember(memberData)
```

## Authentication Flow

1. User logs in at `/login`
2. Access and refresh tokens are stored
3. Tokens are automatically included in API requests
4. If access token expires, refresh token is used to get new one
5. Logout clears tokens and redirects to login

## Styling

Uses Tailwind CSS with custom components:

```tsx
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>
<button className="btn-outline">Outline Button</button>
<input className="input-field" />
<div className="card">Content</div>
```

## State Management

Using Zustand for authentication state:

```typescript
import { useAuthStore } from '@store/auth'

const { isAuthenticated, user, logout } = useAuthStore()
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier
- `npm run type-check` - Check TypeScript

## Docker

Build and run with Docker:

```bash
docker build -t gymbook-frontend .
docker run -p 3000:3000 gymbook-frontend
```

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Traditional Hosting

1. Build: `npm run build`
2. Deploy `dist/` folder to your server

## Development Tips

- Use `npm run dev` for hot reload
- Check types with `npm run type-check`
- Format code with `npm run format`
- Components in `src/components` are reusable
- Pages in `src/pages` are route components

## Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## License

Proprietary - All rights reserved

## Support

- Email: support@gymtrack.io
- Docs: https://docs.gymtrack.io
- Issues: GitHub Issues
