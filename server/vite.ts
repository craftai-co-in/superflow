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
    ...viteConfig,
    configFile: false,
    customLogger: {
      ... viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server:  serverOptions,
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
  const __filename = fileURLToPath(import. meta.url);
  const __dirname = path.dirname(__filename);
  
  // The dist folder structure in production: 
  // dist/
  //   index.js (your server)
  //   public/ (your client build)
  const distPath = path.resolve(__dirname, "public");

  console.log('[STATIC] Attempting to serve static files from:', distPath);
  console.log('[STATIC] Directory exists:', fs.existsSync(distPath));

  if (!fs.existsSync(distPath)) {
    console.error(`❌ Could not find the build directory: ${distPath}`);
    console.error('Available files in dist:', fs.readdirSync(__dirname));
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files
  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes
  app.use("*", (req, res, next) => {
    // Don't serve index.html for API routes
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    
    const indexPath = path.resolve(distPath, "index.html");
    console.log('[STATIC] Serving index.html for:', req.originalUrl);
    res.sendFile(indexPath);
  });
}
