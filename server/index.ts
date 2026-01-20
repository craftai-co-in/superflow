import 'dotenv/config'; 
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// CRITICAL: Trust Render's proxy (MUST be first)
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  
  // Security headers for data protection
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// CRITICAL: Mount webhook with raw parser BEFORE global JSON parsers
app.use('/api/payment/webhook', express.raw({ type: 'application/json', limit: '10mb' }));

// Global body parsers
app.use(express. json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse:  Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path. startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Error handler - MUST check if headers already sent
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Error handler caught:', err);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(status).json({ message });
    }
    
    // If headers already sent, just log the error
    console.error('Cannot send error response - headers already sent');
  });

  // Setup Vite in development OR serve static files in production
  // IMPORTANT: This must come AFTER registerRoutes and error handler
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Listen on Render's PORT
  const port = parseInt(process.env.PORT || '10000', 10);

  server.listen(port, '0.0.0.0', () => {
    log(`serving on port ${port}`);
    console.log(`🚀 Server ready at http://localhost:${port}`);
    console.log(`📂 Static files: ${app.get("env") === "production" ? "enabled" : "disabled (dev mode)"}`);
    console.log(`🔧 Environment: ${app.get("env")}`);
  });
})();
