# AbhiMusicKeys Backend

This is the backend server for the AbhiMusicKeys application, a music learning platform.

## Features

- User authentication and authorization
- Course management
- Payment processing with Razorpay
- File management and downloads
- Email notifications
- Admin panel functionality
- Firebase integration

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase project setup
- Razorpay account
- Email service configuration

## Installation

1. Clone the repository:
```bash
git clone https://github.com/abhi-28-key/AbhiMusicKeys-Backend.git
cd AbhiMusicKeys-Backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
PORT=5000
NODE_ENV=development
FIREBASE_PROJECT_ID=your-firebase-project-id
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret
EMAIL_SERVICE=your-email-service
EMAIL_USER=your-email
EMAIL_PASS=your-email-password
```

4. Add Firebase credentials:
Place your Firebase admin SDK JSON file in the root directory (ensure it's in .gitignore)

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout

### Courses
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get specific course
- `POST /api/courses` - Create new course (admin only)
- `PUT /api/courses/:id` - Update course (admin only)
- `DELETE /api/courses/:id` - Delete course (admin only)

### Payments
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/history` - Get payment history

### Downloads
- `GET /api/downloads` - Get available downloads
- `POST /api/downloads/:id` - Download file

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `GET /api/admin/analytics` - Get analytics (admin only)
- `POST /api/admin/announcements` - Create announcement (admin only)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `RAZORPAY_KEY_ID` | Razorpay public key | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | Yes |
| `EMAIL_SERVICE` | Email service provider | Yes |
| `EMAIL_USER` | Email username | Yes |
| `EMAIL_PASS` | Email password | Yes |

## Security

- All sensitive files are excluded from version control
- Environment variables are used for configuration
- Firebase credentials are kept secure
- API endpoints are protected with authentication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved. 