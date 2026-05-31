import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  // Serve static files from dist/public BEFORE vite middleware
  const distPath = path.resolve(import.meta.dirname, "../..", "dist", "public");
  if (fs.existsSync(distPath)) {
    app.use("/assets", express.static(path.join(distPath, "assets")));
  }

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Skip static files and other assets
    if (req.path.startsWith('/assets/') || req.path.startsWith('/manifest') || req.path.includes('.')) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
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
  // esbuild 번들 시 dist/index.js 기준 → dist/public
  const distPath = path.join(process.cwd(), "dist", "public");
  console.log("[Static] distPath:", distPath);
  console.log("[Static] cwd:", process.cwd());
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (client-side routing)
  // exclude static file requests (assets, manifest, etc.)
  app.use("*", (req, res) => {
    // Skip if the request is for a static file
    if (req.path.startsWith('/assets/') || req.path.startsWith('/manifest') || req.path.includes('.')) {
      return res.status(404).end();
    }
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
