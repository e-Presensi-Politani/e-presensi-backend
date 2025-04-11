// src/config/configuration.ts
export default () => ({
  // Server Configuration
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api',

  // MongoDB Configuration
  database: {
    uri:
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/e-presensi-politani',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex and useFindAndModify not supported in Mongoose 6+
    },
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'YOUR_SECRET_KEY_HERE',
    accessExpiration: process.env.JWT_EXPIRATION || '1d',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'YOUR_REFRESH_SECRET_KEY_HERE',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  // File Upload Configuration
  fileUpload: {
    profileImageDir: process.env.PROFILE_IMAGE_DIR || 'uploads/profile',
    attendancePhotoDir:
      process.env.ATTENDANCE_PHOTO_DIR || 'uploads/attendance',
    leaveAttachmentDir: process.env.LEAVE_ATTACHMENT_DIR || 'uploads/leave',
    maxFileSize: parseInt(
      process.env.MAX_FILE_SIZE ?? `${5 * 1024 * 1024}`,
      10,
    ), // 5MB default
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },

  // Attendance Configuration
  attendance: {
    lateToleranceMinutes: parseInt(
      process.env.LATE_TOLERANCE_MINUTES ?? '15',
      10,
    ),
    earlyLeaveToleranceMinutes: parseInt(
      process.env.EARLY_LEAVE_TOLERANCE_MINUTES ?? '15',
      10,
    ),
    minWorkHoursForFullDay: parseFloat(process.env.MIN_WORK_HOURS ?? '8.5'),
    geofenceRadius: parseInt(process.env.GEOFENCE_RADIUS ?? '500', 10), // in meters
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT ?? '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'no-reply@politani.ac.id',
    password: process.env.EMAIL_PASSWORD || 'your_password',
    from:
      process.env.EMAIL_FROM || 'e-Presensi Politani <no-reply@politani.ac.id>',
  },

  // Application Info
  app: {
    name: 'e-Presensi Politani',
    description:
      'Sistem Presensi Digital Politeknik Pertanian Negeri Payakumbuh',
    version: '1.0.0',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  },

  // Media Storage - Choose between local or cloud storage
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // local, s3, gcs
    s3: {
      bucket: process.env.S3_BUCKET || 'your-bucket-name',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'your-access-key-id',
      secretAccessKey:
        process.env.S3_SECRET_ACCESS_KEY || 'your-secret-access-key',
    },
  },
});
