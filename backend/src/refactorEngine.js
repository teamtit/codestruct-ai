import fs from "fs";
import path from "path";

import { transformProject, createApiModule } from "./astTransformer.js";
import { verifyTransformedProject } from "./verifier.js";


/* =========================================================
   MAIN REFACTOR FUNCTION
========================================================= */

export async function refactorProject({
  projectId,
  projectDirectory
}) {

  console.log("");
  console.log("=================================");
  console.log("Starting CodeStruct Refactoring");
  console.log("=================================");

  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  if (!projectDirectory) {
    throw new Error("Project directory is required.");
  }


  /* =======================================================
     CHECK PROJECT
  ======================================================= */

  if (!fs.existsSync(projectDirectory)) {
    throw new Error(
      `Project directory not found: ${projectDirectory}`
    );
  }


  const projectName =
    path.basename(projectDirectory);


  /* =======================================================
     PREVIEW DIRECTORY
  ======================================================= */

  const previewRoot =
    path.join(
      projectDirectory,
      "CODESTRUCT-PREVIEW"
    );

  const transformedRoot =
    path.join(
      previewRoot,
      "TRANSFORMED"
    );

  const transformedProjectDirectory =
    path.join(
      transformedRoot,
      projectName
    );


  /*
    Remove previous preview.
  */

  if (fs.existsSync(previewRoot)) {

    fs.rmSync(
      previewRoot,
      {
        recursive: true,
        force: true
      }
    );
  }


  /*
    Create preview directory.
  */

  fs.mkdirSync(
    transformedRoot,
    {
      recursive: true
    }
  );


  /* =======================================================
     COPY ORIGINAL PROJECT
  ======================================================= */

  copyDirectory(
    projectDirectory,
    transformedProjectDirectory
  );


  /*
    Remove CODESTRUCT-PREVIEW if it accidentally
    got copied from an older project.
  */

  const copiedPreview =
    path.join(
      transformedProjectDirectory,
      "CODESTRUCT-PREVIEW"
    );

  if (fs.existsSync(copiedPreview)) {

    fs.rmSync(
      copiedPreview,
      {
        recursive: true,
        force: true
      }
    );
  }


  /* =======================================================
     DETECT ARCHITECTURE
  ======================================================= */

  const architecture =
    detectArchitecture(
      transformedProjectDirectory
    );


  console.log("");
  console.log("Detected architecture:");
  console.log(architecture);


  /* =======================================================
     API MODULE LOCATION
  ======================================================= */

  let apiModulePath;


  /*
    Browser/public project
  */

  if (
    fs.existsSync(
      path.join(
        transformedProjectDirectory,
        "public"
      )
    )
  ) {

    apiModulePath =
      path.join(
        transformedProjectDirectory,
        "public",
        "assets",
        "api",
        "api.js"
      );

  } else {

    /*
      Normal source project
    */

    apiModulePath =
      path.join(
        transformedProjectDirectory,
        "src",
        "api",
        "api.js"
      );
  }


  /* =======================================================
     AST TRANSFORMATION
  ======================================================= */

  const transformation =
    await transformProject(
      transformedProjectDirectory,
      apiModulePath
    );


  /*
    IMPORTANT:
    transformProject returns:

    {
      transformationResults,
      apiCalls
    }

    So createApiModule MUST receive:

      transformation.apiCalls

    NOT the entire transformation object.
  */

  createApiModule(
    apiModulePath,
    transformation.apiCalls
  );


  /* =======================================================
     UPDATE HTML SCRIPT TAGS
  ======================================================= */

  const htmlFiles =
    getFilesByExtension(
      transformedProjectDirectory,
      [".html"]
    );


  const htmlFilesChanged = [];


  for (const htmlFile of htmlFiles) {

    const changed =
      updateHtmlScripts(
        htmlFile
      );


    if (changed) {

      htmlFilesChanged.push(
        path.relative(
          transformedProjectDirectory,
          htmlFile
        )
      );
    }
  }


  /* =======================================================
     VERIFY TRANSFORMED PROJECT
  ======================================================= */

  const verification =
    await verifyTransformedProject(
      transformedProjectDirectory
    );


  /* =======================================================
     TRANSFORMATION REPORT
  ======================================================= */

  const report = {

    projectId,

    projectName,

    architecture,

    transformationResults:
      transformation.transformationResults,

    transformedFiles:
      transformation.transformationResults.map(
        item => item.file
      ),

    apiCalls:
      transformation.apiCalls,

    detectedApiCalls:
      transformation.apiCalls,

    htmlFilesChanged,

    apiModule:
      path.relative(
        transformedProjectDirectory,
        apiModulePath
      ),

    verification,

    originalSourceUntouched: true,

    previewPath:
      transformedProjectDirectory
  };


  const reportPath =
    path.join(
      previewRoot,
      "transformation-report.json"
    );


  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      report,
      null,
      2
    ),
    "utf8"
  );


  /* =======================================================
     FINAL RESULT
  ======================================================= */

  const result = {

    projectId,

    projectName,

    architecture,

    transformationResults:
      transformation.transformationResults,

    transformedFiles:
      transformation.transformationResults.map(
        item => item.file
      ),

    apiCalls:
      transformation.apiCalls,

    detectedApiCalls:
      transformation.apiCalls,

    htmlFilesChanged,

    apiModule:
      path.relative(
        transformedProjectDirectory,
        apiModulePath
      ),

    verification,

    originalSourceUntouched: true,

    previewPath:
      transformedProjectDirectory,

    reportPath
  };


  console.log("");
  console.log("=================================");
  console.log("Refactor completed:");
  console.log(result);
  console.log("=================================");


  return result;
}


/* =========================================================
   ARCHITECTURE DETECTION
========================================================= */

function detectArchitecture(projectDirectory) {

  const files =
    getAllFiles(
      projectDirectory
    );


  const extensions =
    files.map(
      file =>
        path.extname(file).toLowerCase()
    );


  const hasHtml =
    extensions.includes(".html");

  const hasCss =
    extensions.includes(".css");

  const hasJavaScript =
    extensions.includes(".js") ||
    extensions.includes(".jsx");

  const hasTypeScript =
    extensions.includes(".ts") ||
    extensions.includes(".tsx");


  let react = false;


  for (const file of files) {

    if (
      ![".js", ".jsx", ".ts", ".tsx"]
        .includes(
          path.extname(file).toLowerCase()
        )
    ) {
      continue;
    }


    try {

      const content =
        fs.readFileSync(
          file,
          "utf8"
        );


      if (
        content.includes("from 'react'") ||
        content.includes('from "react"') ||
        content.includes("React.") ||
        content.includes("useState(") ||
        content.includes("useEffect(")
      ) {

        react = true;
        break;
      }

    } catch {
      // Ignore unreadable files
    }
  }


  const hasServer =
    files.some(
      file => {

        const name =
          path.basename(file).toLowerCase();

        return (
          name === "server.js" ||
          name === "server.ts" ||
          name === "app.js" ||
          name === "app.ts"
        );
      }
    );


  return {

    frontend:
      hasHtml ||
      hasCss ||
      react,

    backend:
      hasServer,

    react,

    html:
      hasHtml,

    css:
      hasCss,

    javascript:
      hasJavaScript,

    typescript:
      hasTypeScript
  };
}


/* =========================================================
   UPDATE HTML SCRIPT TAGS
========================================================= */

function updateHtmlScripts(
  htmlFile
) {

  let content;


  try {

    content =
      fs.readFileSync(
        htmlFile,
        "utf8"
      );

  } catch {

    return false;
  }


  const original =
    content;


  /*
    Convert local JS scripts into module scripts.

    Example:

    <script src="assets/script.js"></script>

    becomes:

    <script type="module" src="assets/script.js"></script>
  */

  content =
    content.replace(
      /<script\s+([^>]*?)src=["']([^"']+\.js)["']([^>]*)><\/script>/gi,
      (full, before, src, after) => {

        /*
          Ignore external URLs.
        */

        if (
          src.startsWith("http://") ||
          src.startsWith("https://") ||
          src.startsWith("//")
        ) {

          return full;
        }


        /*
          Already module?
        */

        if (
          /type\s*=\s*["']module["']/i.test(
            full
          )
        ) {

          return full;
        }


        return `<script type="module" ${before}src="${src}"${after}></script>`;
      }
    );


  if (content !== original) {

    fs.writeFileSync(
      htmlFile,
      content,
      "utf8"
    );

    return true;
  }


  return false;
}


/* =========================================================
   COPY DIRECTORY
========================================================= */

function copyDirectory(
  source,
  destination
) {

  fs.mkdirSync(
    destination,
    {
      recursive: true
    }
  );


  const entries =
    fs.readdirSync(
      source,
      {
        withFileTypes: true
      }
    );


  for (const entry of entries) {

    /*
      Never copy the preview directory.
    */

    if (
      entry.name === "CODESTRUCT-PREVIEW"
    ) {
      continue;
    }


    /*
      Ignore common generated folders.
    */

    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist" ||
      entry.name === "build" ||
      entry.name === ".next"
    ) {
      continue;
    }


    const sourcePath =
      path.join(
        source,
        entry.name
      );


    const destinationPath =
      path.join(
        destination,
        entry.name
      );


    if (entry.isDirectory()) {

      copyDirectory(
        sourcePath,
        destinationPath
      );

    } else {

      fs.copyFileSync(
        sourcePath,
        destinationPath
      );
    }
  }
}


/* =========================================================
   GET ALL FILES
========================================================= */

function getAllFiles(
  directory
) {

  const files = [];


  if (!fs.existsSync(directory)) {
    return files;
  }


  const entries =
    fs.readdirSync(
      directory,
      {
        withFileTypes: true
      }
    );


  for (const entry of entries) {

    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === "dist" ||
      entry.name === "build" ||
      entry.name === ".next" ||
      entry.name === "coverage" ||
      entry.name === "CODESTRUCT-PREVIEW"
    ) {
      continue;
    }


    const fullPath =
      path.join(
        directory,
        entry.name
      );


    if (entry.isDirectory()) {

      files.push(
        ...getAllFiles(
          fullPath
        )
      );

    } else {

      files.push(
        fullPath
      );
    }
  }


  return files;
}


/* =========================================================
   GET FILES BY EXTENSION
========================================================= */

function getFilesByExtension(
  directory,
  extensions
) {

  const files =
    getAllFiles(
      directory
    );


  return files.filter(
    file =>
      extensions.includes(
        path.extname(file).toLowerCase()
      )
  );
}