<p align="center">
  <img src="docs/GEARshare_LOGO.jpg" alt="GearShare Logo" width="200" />
</p>

<h1 align="center">GearShare — Local Resource Sharing Platform</h1>

<p align="center">
  <a href="https://github.com/theKunte/local-resource-sharing/actions/workflows/test-coverage.yml"><img src="https://github.com/theKunte/local-resource-sharing/actions/workflows/test-coverage.yml/badge.svg" alt="Tests & Coverage" /></a>
  <a href="https://codecov.io/gh/theKunte/local-resource-sharing"><img src="https://codecov.io/gh/theKunte/local-resource-sharing/graph/badge.svg" alt="codecov" /></a>
</p>

A community-based gear sharing platform built with React, TypeScript, and Firebase. Share equipment, tools, and resources within trusted groups of friends and neighbors.

## 🌟 Features

- **User Authentication**: Secure Firebase authentication
- **Group Management**: Create and manage trusted sharing groups
- **Resource Sharing**: List gear and share with specific groups
- **Borrow Requests**: Request to borrow items with date ranges
- **Request Dashboard**: Manage incoming and outgoing borrow requests
- **Real-time Updates**: Live status updates across the app
- **Responsive Design**: Mobile-first design with Tailwind CSS

## 🏗️ Architecture

### Frontend

- **React 19** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Firebase** for authentication
- **Axios** for API communication

### Backend

- **Node.js** with Express
- **TypeScript** for type safety
- **Prisma** ORM with SQLite (dev) / PostgreSQL (prod)
- **Firebase Admin SDK** for auth verification
- **Helmet** for security headers
- **Rate limiting** for API protection

## 📋 Prerequisites

- Node.js 18+ and npm
- Firebase account
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/theKunte/local-resource-sharing.git
cd local-resource-sharing
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Email/Password authentication
3. Generate a service account key (see [SETUP_AUTH.md](SETUP_AUTH.md))
4. Configure environment variables (next step)

### 4. Environment Configuration

#### Frontend (.env)

```bash
cd frontend
cp .env.example .env
# Edit .env with your Firebase config
```

#### Backend (.env)

```bash
cd backend
cp .env.example .env
# Edit .env with your Firebase service account credentials
```

See [SETUP_AUTH.md](SETUP_AUTH.md) for detailed Firebase configuration.

### 5. Database Setup

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 6. Run the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
local-resource-sharing/
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   ├── types/         # TypeScript type definitions
│   │   └── context/       # React context providers
│   └── package.json
├── backend/               # Express backend
│   ├── src/
│   │   ├── index.ts       # Main server file
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Auth & validation
│   │   ├── routes/        # API routes
│   │   └── utils/         # Helper functions
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
└── docs/                  # Documentation
    ├── API.md            # API documentation
    └── DATABASE_SCHEMA.md # Database schema docs
```

## 🔧 Development

### Available Scripts

**Frontend:**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

**Backend:**

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run compiled code
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only

### Code Quality

- TypeScript strict mode enabled
- ESLint configured for React and TypeScript
- Consistent error handling patterns
- Proper TypeScript types throughout

## 📚 Documentation

- [API Documentation](docs/API.md) - API endpoints and usage
- [Database Schema](docs/DATABASE_SCHEMA.md) - Database structure
- [Authentication Setup](SETUP_AUTH.md) - Firebase configuration guide

## 🔐 Security

- Firebase authentication with JWT tokens
- Rate limiting on all API endpoints
- Helmet.js security headers
- CORS configured for specific origins
- Input validation and sanitization
- Group-based access control

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [React](https://react.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Firebase](https://firebase.google.com/)
- Database by [Prisma](https://www.prisma.io/)

---

Made with ❤️ for building stronger communities through sharing



```

```
