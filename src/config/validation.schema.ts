import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Server Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api'),

  // MongoDB Configuration
  MONGODB_URI: Joi.string().required().description('MongoDB connection string'),

  // JWT Authentication
  JWT_SECRET: Joi.string().required().description('JWT secret key'),
  JWT_EXPIRATION: Joi.string().default('1d').description('JWT expiration time'),
  JWT_REFRESH_SECRET: Joi.string().description('JWT refresh token secret key'),
  JWT_REFRESH_EXPIRATION: Joi.string()
    .default('7d')
    .description('JWT refresh token expiration time'),

  // File Upload Configuration
  PROFILE_IMAGE_DIR: Joi.string().default('uploads/profile'),
  ATTENDANCE_PHOTO_DIR: Joi.string().default('uploads/attendance'),
  LEAVE_ATTACHMENT_DIR: Joi.string().default('uploads/leave'),
  MAX_FILE_SIZE: Joi.number().default(5 * 1024 * 1024), // 5MB default

  // Attendance Configuration
  LATE_TOLERANCE_MINUTES: Joi.number().default(15),
  EARLY_LEAVE_TOLERANCE_MINUTES: Joi.number().default(15),
  MIN_WORK_HOURS: Joi.number().default(8.5),
  GEOFENCE_RADIUS: Joi.number().default(500),

  // Email Configuration
  EMAIL_HOST: Joi.string().default('smtp.gmail.com'),
  EMAIL_PORT: Joi.number().default(587),
  EMAIL_SECURE: Joi.boolean().default(false),
  EMAIL_USER: Joi.string().description('Email user for SMTP authentication'),
  EMAIL_PASSWORD: Joi.string().description(
    'Email password for SMTP authentication',
  ),
  EMAIL_FROM: Joi.string().default(
    'e-Presensi Politani <no-reply@politani.ac.id>',
  ),

  // Frontend URL
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3001'),
  BACKEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Storage Configuration
  STORAGE_TYPE: Joi.string().valid('local', 's3', 'gcs').default('local'),
  S3_BUCKET: Joi.string().when('STORAGE_TYPE', {
    is: 's3',
    then: Joi.required(),
  }),
  S3_REGION: Joi.string().when('STORAGE_TYPE', {
    is: 's3',
    then: Joi.required(),
  }),
  S3_ACCESS_KEY_ID: Joi.string().when('STORAGE_TYPE', {
    is: 's3',
    then: Joi.required(),
  }),
  S3_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_TYPE', {
    is: 's3',
    then: Joi.required(),
  }),
});
