# Law Bandit Frontend

A modern Next.js frontend for the Law Bandit application with comprehensive Google Calendar integration, Supabase authentication, and intelligent syllabus processing.

## Features

- 🏠 **Landing Page** - Attractive homepage with call-to-action buttons
- 🔐 **Authentication** - Login and signup pages with Supabase integration
- 📚 **Class Management** - Create and manage law school classes
- 📅 **Calendar Integration** - Full Google Calendar sync with event extraction
- 📄 **Syllabus Processing** - AI-powered extraction of calendar events from PDFs
- 🎯 **Project Dashboard** - View and manage your classes and assignments
- 🛡️ **Protected Routes** - Middleware-based authentication
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS

## Quick Start

### Prerequisites

- Node.js (>= 18.0.0)
- npm or yarn
- Supabase project
- Google Calendar API access

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
BACKEND_URL=https://law-bandit-back.vercel.app
```

3. Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Pages & Features

### Landing Page (`/`)

- Public page with app introduction
- Navigation to login and signup
- Responsive design with modern UI

### Authentication (`/login`, `/signup`)

- Email and password authentication
- Form validation with error handling
- Redirects to projects page on success
- Cross-navigation between login and signup

### Projects Dashboard (`/projects`)

- Protected route (requires authentication)
- Displays list of user's classes
- Upload new syllabi functionality
- Google Calendar integration buttons
- Real-time data from Supabase

### Class Detail Page (`/projects/[id]`)

- Detailed view of individual classes
- Calendar events extracted from syllabus
- Google Calendar integration
- Event management and viewing

### Calendar View (`/calendar`)

- Comprehensive calendar interface
- View all events across classes
- Google Calendar sync status
- Event filtering and management

## Google Calendar Integration

### Features

- **OAuth Authentication** - Secure Google Calendar connection
- **Calendar Selection** - Choose which Google Calendar to sync
- **Bidirectional Sync** - Import from Google Calendar and export to it
- **Event Management** - Automatic event extraction and synchronization

### How It Works

1. **Connect**: Authenticate with Google Calendar via OAuth
2. **Select**: Choose which Google Calendar to sync with
3. **Sync**: Import events directly to your class calendar
4. **Export**: Add class events to your Google Calendar

### API Endpoints

- `GET /api/google-calendar/calendars/[userId]` - Fetch user's Google Calendars
- `POST /api/google-calendar/sync-events/[userId]` - Sync events with selected calendar
- `POST /api/google-calendar` - Add events to Google Calendar
- `GET /api/auth/google` - Handle Google OAuth flow

## Syllabus Processing

### AI-Powered Extraction

- **PDF Upload** - Upload syllabus PDFs directly
- **Event Extraction** - AI extracts assignments, exams, and deadlines
- **Automatic Calendar Creation** - Events are automatically added to class calendar
- **Smart Parsing** - Handles various syllabus formats and structures

### Supported Event Types

- Assignments and homework
- Exams and quizzes
- Project deadlines
- Reading assignments
- Class presentations

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
│   ├── api/
│   │   ├── auth/
│   │   │   └── google/           # Google OAuth endpoints
│   │   ├── calendar/             # Calendar management
│   │   ├── classes/              # Class management
│   │   ├── google-calendar/      # Google Calendar integration
│   │   └── syllabi/              # Syllabus processing
│   ├── auth/
│   │   └── google/
│   │       └── callback/         # OAuth callback handler
│   ├── calendar/
│   │   └── page.tsx              # Calendar view
│   ├── projects/
│   │   ├── page.tsx              # Projects dashboard
│   │   └── [id]/
│   │       └── page.tsx          # Individual class view
│   ├── page.tsx                  # Landing page
│   └── layout.tsx               # Root layout
├── components/
│   ├── CalendarExtractionTest.tsx
│   ├── CalendarView.tsx
│   ├── CreateClassButton.tsx
│   ├── GoogleCalendarIntegration.tsx
│   ├── Navbar.tsx
│   ├── UploadNewSyllabi.tsx
│   └── ViewComponentsButtons.tsx
├── utils/
│   ├── calendar.ts               # Calendar utilities
│   ├── calendarExtraction.ts     # Event extraction logic
│   ├── googleCalendar.ts         # Google Calendar API
│   ├── llm.ts                    # AI/LLM integration
│   └── supabase/
│       ├── client.ts             # Supabase client
│       ├── server.ts             # Supabase server client
│       └── middleware.ts         # Authentication middleware
├── types/
│   └── database.ts               # Database type definitions
└── middleware.ts                 # Next.js middleware
```

## Authentication Flow

1. **Public Access**: Landing page is accessible to everyone
2. **Authentication**: Login/signup pages handle user authentication
3. **Protected Routes**: All app pages require authentication
4. **Middleware**: Automatically redirects unauthenticated users to login
5. **Auto-redirect**: Authenticated users are redirected to projects from auth pages
6. **Google OAuth**: Separate flow for Google Calendar integration

## Styling

- **Tailwind CSS** for utility-first styling
- **Responsive design** that works on all devices
- **Consistent color scheme** with modern gradients
- **Interactive components** with hover effects and transitions
- **Loading states** and error handling UI

## Development

### Adding New Pages

1. Create a new directory in `src/app/`
2. Add a `page.tsx` file
3. For protected routes, the middleware will automatically handle authentication

### Adding API Routes

1. Create a new directory in `src/app/api/`
2. Add a `route.ts` file with GET/POST handlers
3. Use Supabase server client for authentication
4. Handle errors and return proper HTTP status codes

### Google Calendar Integration

1. Use the `GoogleCalendarIntegration` component
2. Handle OAuth flow through `/api/auth/google`
3. Sync events using `/api/google-calendar/sync-events/[userId]`
4. Manage calendar selection and event synchronization

### Environment Variables

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key
- `BACKEND_URL`: Backend API URL for Google Calendar and AI processing

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
