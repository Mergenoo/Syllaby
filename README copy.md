# Law Bandit Frontend

A modern Next.js frontend for the Law Bandit application with Supabase authentication.

## Features

- 🏠 **Landing Page** - Attractive homepage with call-to-action buttons
- 🔐 **Authentication** - Login and signup pages with Supabase integration
- 📋 **Projects Page** - Dashboard for viewing legal cases/projects
- 🛡️ **Protected Routes** - Middleware-based authentication
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js (>= 18.0.0)
- npm or yarn
- Supabase project

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:
   Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Pages

### Landing Page (`/`)

- Public page with app introduction
- Navigation to login and signup
- Responsive design with gradient background

### Login Page (`/login`)

- Email and password authentication
- Form validation
- Redirects to projects page on success
- Link to signup page

### Signup Page (`/signup`)

- User registration with name, email, and password
- Form validation
- Redirects to projects page on success
- Link to login page

### Projects Page (`/projects`)

- Protected route (requires authentication)
- Displays list of legal cases/projects
- Status indicators (active, pending, completed)
- Mock data for demonstration

## Authentication Flow

1. **Public Access**: Landing page is accessible to everyone
2. **Authentication**: Login/signup pages handle user authentication
3. **Protected Routes**: Projects page requires authentication
4. **Middleware**: Automatically redirects unauthenticated users to login
5. **Auto-redirect**: Authenticated users are redirected to projects from auth pages

## File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx          # Login page
│   │   │   └── action.tsx        # Login server action
│   │   └── signup/
│   │       ├── page.tsx          # Signup page
│   │       └── action.tsx        # Signup server action
│   ├── projects/
│   │   └── page.tsx              # Projects dashboard
│   ├── page.tsx                  # Landing page
│   └── layout.tsx               # Root layout
├── utils/
│   └── supabase/
│       ├── client.ts             # Supabase client
│       ├── server.ts             # Supabase server client
│       └── middleware.ts         # Authentication middleware
└── middleware.ts                 # Next.js middleware
```

## Styling

- **Tailwind CSS** for utility-first styling
- **Responsive design** that works on all devices
- **Consistent color scheme** with indigo as primary color
- **Modern UI components** with hover effects and transitions

## Development

### Adding New Pages

1. Create a new directory in `src/app/`
2. Add a `page.tsx` file
3. For protected routes, the middleware will automatically handle authentication

### Adding Authentication Actions

1. Create an `action.tsx` file in the page directory
2. Use the `"use server"` directive
3. Import the Supabase server client
4. Handle form data and authentication logic

### Environment Variables

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key

## Deployment

1. Set up environment variables in your hosting platform
2. Build the application: `npm run build`
3. Start the production server: `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
