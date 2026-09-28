import express from "express";
import cors from "cors";
import multer from "multer";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { analyzeProject } from "./src/analyzer.js";
import { createRefactorPlan } from "./src/refactorPlanner.js";
import { refactorProject } from "./src/refactorEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = 5000;

const WORKSPACE_DIR = path.join(
  __dirname,
  "workspace"
);

const UPLOAD_DIR = path.join(
  WORKSPACE_DIR,
  "uploads"
);

const DOWNLOAD_DIR = path.join(
  WORKSPACE_DIR,
  "downloads"
);

fs.mkdirSync(
  UPLOAD_DIR,
  { recursive: true }
);

fs.mkdirSync(
  DOWNLOAD_DIR,
  { recursive: true }
);


// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

app.use(
  cors()
);

app.use(
  express.json()
);


// ---------------------------------------------------------
// Multer
// ---------------------------------------------------------

const upload = multer({
  dest: UPLOAD_DIR,

  limits: {
    fileSize: 20 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const extension =
      path.extname(file.originalname)
        .toLowerCase();

    if (extension !== ".zip") {
      return cb(
        new Error("Only ZIP files are allowed.")
      );
    }

    cb(null, true);
  }
});


// ---------------------------------------------------------
// Health
// ---------------------------------------------------------

app.get(
  "/api/health",
  (req, res) => {
    res.json({
      success: true,
      message: "CodeStruct AI backend is running.",
      timestamp: new Date().toISOString()
    });
  }
);


// ---------------------------------------------------------
// Analyze Project
// ---------------------------------------------------------

app.post(
  "/api/analyze",
  upload.single("project"),
  async (req, res) => {
    let projectId = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "ZIP project file is required."
        });
      }

      const originalName =
        path.basename(
          req.file.originalname,
          ".zip"
        );

      const safeProjectName =
        sanitizeName(originalName);

      projectId =
        `${Date.now()}-${safeProjectName}`;

      const projectDirectory =
        path.join(
          WORKSPACE_DIR,
          projectId
        );

      fs.mkdirSync(
        projectDirectory,
        {
          recursive: true
        }
      );

      // ---------------------------------------------------
      // Extract ZIP
      // ---------------------------------------------------

      const zip =
        new AdmZip(
          req.file.path
        );

      zip.extractAllTo(
        projectDirectory,
        true
      );

      // ---------------------------------------------------
      // Remove uploaded temporary ZIP
      // ---------------------------------------------------

      try {
        fs.unlinkSync(
          req.file.path
        );
      } catch {
        // Ignore cleanup error
      }

      // ---------------------------------------------------
      // Detect nested project folder
      // ---------------------------------------------------

      const actualProjectDirectory =
        resolveProjectRoot(
          projectDirectory
        );

      const analysis =
        await analyzeProject(
          actualProjectDirectory
        );

      res.json({
        success: true,

        projectId,

        projectName:
          safeProjectName,

        projectDirectory:
          actualProjectDirectory,

        analysis
      });

    } catch (error) {

      console.error(
        "ANALYZE ERROR:",
        error
      );

      if (projectId) {
        cleanupProject(projectId);
      }

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Project analysis failed."
      });
    }
  }
);


// ---------------------------------------------------------
// Create Refactor Plan
// ---------------------------------------------------------

app.post(
  "/api/refactor-plan/:projectId",
  async (req, res) => {
    try {

      const {
        projectId
      } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "Project ID is required."
        });
      }

      const projectDirectory =
        findProjectDirectory(
          projectId
        );

      if (!projectDirectory) {
        return res.status(404).json({
          success: false,
          error: "Project not found."
        });
      }

      const analysis =
        await analyzeProject(
          projectDirectory
        );

      const plan =
        createRefactorPlan(
          analysis
        );

      res.json({
        success: true,

        projectId,

        plan
      });

    } catch (error) {

      console.error(
        "PLAN ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Refactor plan creation failed."
      });
    }
  }
);


// ---------------------------------------------------------
// Refactor Project
// ---------------------------------------------------------

app.post(
  "/api/refactor/:projectId",
  async (req, res) => {

    try {

      const {
        projectId
      } = req.params;

      console.log(
        "REFactor request received:",
        projectId
      );

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "Project ID is required."
        });
      }

      // ---------------------------------------------------
      // Find uploaded project
      // ---------------------------------------------------

      const projectDirectory =
        findProjectDirectory(
          projectId
        );

      if (!projectDirectory) {
        return res.status(404).json({
          success: false,
          error:
            `Project not found: ${projectId}`
        });
      }

      console.log(
        "Project directory:",
        projectDirectory
      );

      // ---------------------------------------------------
      // Run safe refactor
      // ---------------------------------------------------

      const result =
        await refactorProject({
          projectId,
          projectDirectory
        });

      console.log(
        "Refactor completed:",
        result
      );

      res.json({
        success: true,

        projectId,

        projectName:
          result.projectName,

        architecture:
          result.architecture,

        transformationResults:
          result.transformationResults || [],

        transformedFiles:
          result.transformedFiles || [],

        apiCalls:
          result.apiCalls || [],

        detectedApiCalls:
          result.detectedApiCalls || [],

        htmlFilesChanged:
          result.htmlFilesChanged || [],

        apiModule:
          result.apiModule || null,

        verification:
          result.verification || null,

        originalSourceUntouched:
          result.originalSourceUntouched !== false,

        previewPath:
          result.previewPath || null,

        reportPath:
          result.reportPath || null
      });

    } catch (error) {

      console.error(
        "================================="
      );

      console.error(
        "REFACTOR ERROR:"
      );

      console.error(
        error
      );

      console.error(
        "================================="
      );

      res.status(500).json({
        success: false,

        error:
          error?.message ||
          "Project refactoring failed.",

        stack:
          process.env.NODE_ENV === "development"
            ? error?.stack
            : undefined
      });
    }
  }
);


// ---------------------------------------------------------
// Download Refactored Project
// ---------------------------------------------------------

app.get(
  "/api/refactor/:projectId/download",
  async (req, res) => {

    try {

      const {
        projectId
      } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: "Project ID is required."
        });
      }

      const projectDirectory =
        findProjectDirectory(
          projectId
        );

      if (!projectDirectory) {
        return res.status(404).json({
          success: false,
          error: "Project not found."
        });
      }

      const transformedDirectory =
        path.join(
          projectDirectory,
          "CODESTRUCT-PREVIEW",
          "TRANSFORMED"
        );

      if (!fs.existsSync(transformedDirectory)) {
        return res.status(404).json({
          success: false,
          error:
            "Transformed project not found. Run Refactor first."
        });
      }

      const downloadZipPath =
        path.join(
          DOWNLOAD_DIR,
          `${projectId}-codestruct-refactored.zip`
        );

      if (fs.existsSync(downloadZipPath)) {
        fs.unlinkSync(
          downloadZipPath
        );
      }

      const zip =
        new AdmZip();

      addDirectoryToZip(
        zip,
        transformedDirectory,
        path.basename(
          projectDirectory
        )
      );

      zip.writeZip(
        downloadZipPath
      );

      console.log(
        "Download ZIP created:",
        downloadZipPath
      );

      res.download(
        downloadZipPath,
        `${path.basename(projectDirectory)}-codestruct-refactored.zip`
      );

    } catch (error) {

      console.error(
        "DOWNLOAD ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Download failed."
      });
    }
  }
);


// ---------------------------------------------------------
// Error Handler
// ---------------------------------------------------------

app.use(
  (error, req, res, next) => {

    console.error(
      "GLOBAL ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Internal server error."
    });
  }
);


// ---------------------------------------------------------
// Helper: Find Project
// ---------------------------------------------------------

function findProjectDirectory(
  projectId
) {

  const safeId =
    sanitizeProjectId(
      projectId
    );

  if (!safeId) {
    return null;
  }

  const projectDirectory =
    path.join(
      WORKSPACE_DIR,
      safeId
    );

  if (!fs.existsSync(projectDirectory)) {
    return null;
  }

  return resolveProjectRoot(
    projectDirectory
  );
}


// ---------------------------------------------------------
// Helper: Resolve ZIP root
// ---------------------------------------------------------

function resolveProjectRoot(
  directory
) {

  const entries =
    fs.readdirSync(
      directory,
      {
        withFileTypes: true
      }
    );

  // If extracted ZIP itself contains one
  // project folder, use that folder.
  if (entries.length === 1) {

    const onlyEntry =
      entries[0];

    if (
      onlyEntry.isDirectory() &&
      onlyEntry.name !==
        "CODESTRUCT-PREVIEW"
    ) {

      return path.join(
        directory,
        onlyEntry.name
      );
    }
  }

  return directory;
}


// ---------------------------------------------------------
// Helper: Add directory to ZIP
// ---------------------------------------------------------

function addDirectoryToZip(
  zip,
  directory,
  zipRoot
) {

  const entries =
    fs.readdirSync(
      directory,
      {
        withFileTypes: true
      }
    );

  for (const entry of entries) {

    const fullPath =
      path.join(
        directory,
        entry.name
      );

    const zipPath =
      path.join(
        zipRoot,
        entry.name
      ).replaceAll(
        "\\",
        "/"
      );

    if (entry.isDirectory()) {

      addDirectoryToZip(
        zip,
        fullPath,
        zipPath
      );

    } else {

      zip.addLocalFile(
        fullPath,
        path.dirname(zipPath),
        path.basename(zipPath)
      );
    }
  }
}


// ---------------------------------------------------------
// Helper: Sanitize name
// ---------------------------------------------------------

function sanitizeName(
  name
) {

  return name
    .replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    )
    .replace(
      /^-|-$/g,
      ""
    )
    .slice(
      0,
      100
    ) || "project";
}


// ---------------------------------------------------------
// Helper: Sanitize Project ID
// ---------------------------------------------------------

function sanitizeProjectId(
  projectId
) {

  if (
    typeof projectId !== "string"
  ) {
    return null;
  }

  if (
    !/^[a-zA-Z0-9_-]+$/.test(
      projectId
    )
  ) {
    return null;
  }

  return projectId;
}


// ---------------------------------------------------------
// Helper: Cleanup
// ---------------------------------------------------------

function cleanupProject(
  projectId
) {

  try {

    const directory =
      path.join(
        WORKSPACE_DIR,
        sanitizeProjectId(projectId)
      );

    if (
      fs.existsSync(directory)
    ) {

      fs.rmSync(
        directory,
        {
          recursive: true,
          force: true
        }
      );
    }

  } catch {
    // Ignore cleanup failure
  }
}


// ---------------------------------------------------------
// Start Server
// ---------------------------------------------------------

app.listen(
  PORT,
  () => {

    console.log(
      `CodeStruct AI backend running on http://localhost:${PORT}`
    );

  }
);