import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ... viteConfig,
    configFile: false,
    customLogger: {
      ... viteLogger,
      error:  (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        ". .",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx? v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Get the correct path in production
  const __filename = fileURLToPath(import.meta. url);
  const __dirname = path.dirname(__filename);
  
  // The dist folder structure in production:  
  // dist/
  //   index.js (your server)
  //   public/ (your client build)
  const distPath = path.resolve(__dirname, "public");

  console.log('[STATIC] Attempting to serve static files from:', distPath);
  console.log('[STATIC] Directory exists:', fs.existsSync(distPath));

  if (! fs.existsSync(distPath)) {
    console.error(`❌ Could not find the build directory:  ${distPath}`);
    console.error('Available files in dist:', fs.readdirSync(__dirname));
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Log what files are in the dist/public directory
  try {
    const files = fs.readdirSync(distPath);
    console.log('[STATIC] Files in public directory:', files);
  } catch (e) {
    console.error('[STATIC] Error reading public directory:', e);
  }

  // Serve static assets with caching
  app.use(express.static(distPath, {
    index: false, // Don't automatically serve index.html
    setHeaders: (res, filePath) => {
      // Cache static assets for 1 hour
      if (filePath.endsWith('.js') || filePath.endsWith('. css')) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      // Cache images for 1 day
      if (filePath.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    }
  }));

  // SPA fallback - serve index.html for all non-API routes
  // IMPORTANT: Use app.get() not app.use() to only catch GET requests
  app.get('*', (req, res, next) => {
    // Skip API routes
    if (req. path.startsWith('/api/')) {
      return next();
    }
    
    const indexPath = path.resolve(distPath, "index.html");
    
    // Check if index.html exists
    if (! fs.existsSync(indexPath)) {
      console.error('[STATIC] index.html not found at:', indexPath);
      return res.status(404).send('Application not found.  Please rebuild the client.');
    }
    
    console.log('[STATIC] Serving index.html for:', req.path);
    
    // Send index.html with no-cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('[STATIC] Error serving index. html:', err);
        if (!res.headersSent) {
          res.status(500).send('Error loading application');
        }
      }
    });
  });
}
