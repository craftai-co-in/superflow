// Session configuration with cross-domain support
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Production configuration for Render
  const isProduction = process.env.NODE_ENV === 'production';
  const isRenderDomain = process.env.RENDER_EXTERNAL_HOSTNAME?. includes('onrender.com');

  return session({
    secret: process.env.SESSION_SECRET || "your-super-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'superflow. sid',
    cookie: {
      httpOnly: true,
      secure:  isProduction, // Secure cookies in production
      maxAge: sessionTtl,
      sameSite: isProduction ? 'lax' : 'lax', // Use 'lax' for Render
      domain: undefined, // Don't set domain for single-domain deployment
      path: '/',
    },
    proxy: isProduction, // Trust proxy in production
  });
}
