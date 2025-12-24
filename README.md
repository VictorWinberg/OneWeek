# OneWeek - Family Calendar

A family calendar web app built on top of Google Calendar, designed for quick overview and low mental resistance.

## Features

- Week-focused view (Mon-Sun)
- Events from multiple Google Calendars combined
- Color-coded by responsible person
- Change responsibility (move events between calendars)
- Optimized for both desktop and mobile

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Zustand
- **Backend**: Node.js + Express
- **Data**: Google Calendar (no own database)
- **Auth**: Google OAuth 2.0

## Family Members

- Annie
- Victor
- Annie & Victor (shared)
- Lillen
- Familjen (unassigned)

## Setup

### 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/auth/callback`
5. Note your Client ID and Client Secret

### 2. Environment Configuration

```bash
cp env.example .env
# Edit .env with your Google credentials
```

### 3. Install Dependencies

```bash
npm install
```

This will automatically install dependencies for both backend and frontend.

### 4. Configure Calendars

1. Copy the template config file:

```bash
cp config.json.template config.json
```

1. Edit `config.json` with your calendar configuration.

#### Configuration Structure

The `config.json` file uses a role-based permission system:

```json
{
  "users": {
    "user1": {
      "emails": ["user1@example.com", "user1.alt@example.com"]
    }
  },
  "roles": {
    "owner": ["create", "read", "update", "delete"],
    "editor": ["create", "read", "update"],
    "viewer": ["read"]
  },
  "calendars": [
    {
      "id": "your-calendar-id@gmail.com",
      "name": "Calendar Name",
      "color": "#FF6B9D",
      "permissions": {
        "user1": "owner",
        "user2": "editor"
      }
    }
  ]
}
```

**Key Concepts:**

- **Users**: Define users and their email addresses (a user can have multiple emails)
- **Roles**: Define what permissions each role has (create, read, update, delete)
- **Calendars**: Each calendar specifies which users have which roles
- **Permissions**: When a user logs in with any of their emails, they get the permissions assigned to their user ID

**Example Permissions:**

- `owner`: Full CRUD access (create, read, update, delete)
- `editor`: Can create, read, and update events, but not delete them
- `viewer`: Can only read events

### 5. Run Development

```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173) concurrently.

### 6. Login and Use

1. Open <http://localhost:5173>
2. Login with Google
3. Your configured calendars will load automatically from the backend

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies (root, backend, frontend) |
| `npm run dev` | Start development servers |
| `npm run build` | Build for production |
| `npm start` | Start production servers |

## License

MIT
