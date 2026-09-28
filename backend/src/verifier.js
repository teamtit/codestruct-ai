import fs from "fs";
import path from "path";
import * as parser from "@babel/parser";


/**
 * Main verification function.
 *
 * Supports both:
 *
 * 1. Traditional architecture
 *    src/api/api.js
 *
 * 2. Browser architecture
 *    public/assets/api/api.js
 */
export async function verifyTransformedProject(
  transformedDirectory
) {
  console.log("=================================");
  console.log("CodeStruct AI Verification");
  console.log("=================================");
  console.log(
    "Verifying:",
    transformedDirectory
  );

  // -------------------------------------------------------
  // 1. Project structure
  // -------------------------------------------------------

  console.log(
    "Checking project structure..."
  );

  const projectStructure =
    verifyProjectStructure(
      transformedDirectory
    );

  // -------------------------------------------------------
  // 2. JavaScript syntax
  // -------------------------------------------------------

  console.log(
    "Checking JavaScript syntax..."
  );

  const javascriptSyntax =
    verifyJavaScriptSyntax(
      transformedDirectory
    );

  // -------------------------------------------------------
  // 3. Generated API module
  // -------------------------------------------------------

  console.log(
    "Checking generated API module..."
  );

  const apiModule =
    verifyApiModule(
      transformedDirectory
    );

  // -------------------------------------------------------
  // 4. Transformation report
  // -------------------------------------------------------

  console.log(
    "Checking transformation report..."
  );

  const transformationReport =
    verifyTransformationReport(
      transformedDirectory
    );

  // -------------------------------------------------------
  // Final result
  // -------------------------------------------------------

  /*
   * IMPORTANT:
   *
   * transformation-report.json may be created
   * AFTER this verification step by the engine.
   *
   * Therefore the report is informational and
   * should NOT make the whole transformation fail.
   */

  const verified =
    projectStructure.valid &&
    javascriptSyntax.valid &&
    apiModule.valid;

  const status =
    verified
      ? "PASSED"
      : "FAILED";

  const result = {
    verified,

    status,

    checks: {
      projectStructure,
      javascriptSyntax,
      apiModule,
      transformationReport
    },

    message:
      verified
        ? "Transformed project passed all required verification checks."
        : "Transformed project failed one or more required verification checks."
  };

  console.log(
    "================================="
  );

  console.log(
    "VERIFICATION RESULT:"
  );

  console.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

  console.log(
    "================================="
  );

  return result;
}


/**
 * --------------------------------------------------------
 * Project Structure
 * --------------------------------------------------------
 */
function verifyProjectStructure(
  transformedDirectory
) {
  const missingDirectories = [];

  const hasPublic =
    fs.existsSync(
      path.join(
        transformedDirectory,
        "public"
      )
    );

  const hasSrc =
    fs.existsSync(
      path.join(
        transformedDirectory,
        "src"
      )
    );

  const hasServer =
    fs.existsSync(
      path.join(
        transformedDirectory,
        "server.js"
      )
    );

  /*
   * Browser projects:
   *
   * public/
   * public/assets/
   *
   * are valid.
   */

  if (hasPublic) {
    const assetsDirectory =
      path.join(
        transformedDirectory,
        "public",
        "assets"
      );

    if (
      !fs.existsSync(
        assetsDirectory
      )
    ) {
      missingDirectories.push(
        "public/assets"
      );
    }

  } else if (hasSrc) {

    /*
     * Traditional projects can use:
     *
     * src/
     * src/api/
     */

    const apiDirectory =
      path.join(
        transformedDirectory,
        "src",
        "api"
      );

    /*
     * Only require src/api when
     * src architecture is actually being used.
     */

    if (
      fs.existsSync(
        path.join(
          transformedDirectory,
          "src"
        )
      ) &&
      !fs.existsSync(apiDirectory)
    ) {
      missingDirectories.push(
        "src/api"
      );
    }

  } else if (!hasServer) {

    /*
     * A completely minimal project may not
     * have public/src/server.
     */

    missingDirectories.push(
      "public or src"
    );
  }

  return {
    valid:
      missingDirectories.length === 0,

    missingDirectories
  };
}


/**
 * --------------------------------------------------------
 * JavaScript Syntax Verification
 * --------------------------------------------------------
 */
function verifyJavaScriptSyntax(
  transformedDirectory
) {
  const files =
    getJavaScriptFiles(
      transformedDirectory
    );

  console.log(
    `Found ${files.length} JavaScript/TypeScript files.`
  );

  const errors = [];

  const checkedFiles = [];

  for (const file of files) {

    const relative =
      path.relative(
        transformedDirectory,
        file
      );

    try {

      const source =
        fs.readFileSync(
          file,
          "utf8"
        );

      parser.parse(
        source,
        {
          sourceType: "unambiguous",

          plugins: [
            "jsx",
            "typescript"
          ]
        }
      );

      console.log(
        `  ✓ ${relative}`
      );

      checkedFiles.push(
        relative
      );

    } catch (error) {

      console.log(
        `  ✗ ${relative}`
      );

      errors.push({
        file: relative,

        message:
          error?.message ||
          "Syntax error"
      });
    }
  }

  return {
    valid:
      errors.length === 0,

    checkedFiles:
      files.length,

    files:
      checkedFiles,

    errors
  };
}


/**
 * --------------------------------------------------------
 * Generated API Module
 * --------------------------------------------------------
 */
function verifyApiModule(
  transformedDirectory
) {
  /*
   * First try the new browser architecture.
   */
  const browserApi =
    path.join(
      transformedDirectory,
      "public",
      "assets",
      "api",
      "api.js"
    );

  /*
   * Then support old architecture.
   */
  const legacyApi =
    path.join(
      transformedDirectory,
      "src",
      "api",
      "api.js"
    );

  let apiPath = null;

  if (
    fs.existsSync(browserApi)
  ) {
    apiPath = browserApi;
  } else if (
    fs.existsSync(legacyApi)
  ) {
    apiPath = legacyApi;
  }

  if (!apiPath) {
    return {
      exists: false,

      valid: false,

      file:
        "public/assets/api/api.js",

      message:
        "Generated API module was not found."
    };
  }

  try {

    const source =
      fs.readFileSync(
        apiPath,
        "utf8"
      );

    /*
     * Empty API module is allowed.
     *
     * But it must still contain valid JS.
     */
    parser.parse(
      source,
      {
        sourceType: "module"
      }
    );

    return {
      exists: true,

      valid: true,

      file:
        path.relative(
          transformedDirectory,
          apiPath
        ),

      message:
        "Generated API module is valid."
    };

  } catch (error) {

    return {
      exists: true,

      valid: false,

      file:
        path.relative(
          transformedDirectory,
          apiPath
        ),

      message:
        error?.message ||
        "Generated API module is invalid."
    };
  }
}


/**
 * --------------------------------------------------------
 * Transformation Report
 * --------------------------------------------------------
 */
function verifyTransformationReport(
  transformedDirectory
) {
  /*
   * Report is optional at verification time
   * because refactorEngine may create/update it
   * immediately after verification.
   */

  const reportPath =
    path.join(
      transformedDirectory,
      "..",
      "..",
      "transformation-report.json"
    );

  /*
   * Also check directly around the transformed
   * project if necessary.
   */

  const possiblePaths = [
    reportPath,

    path.join(
      transformedDirectory,
      "transformation-report.json"
    ),

    path.join(
      path.dirname(
        path.dirname(
          transformedDirectory
        )
      ),
      "transformation-report.json"
    )
  ];

  const existingPath =
    possiblePaths.find(
      (file) =>
        fs.existsSync(file)
    );

  if (!existingPath) {

    return {
      exists: false,

      valid: true,

      optional: true,

      message:
        "Transformation report will be created by the refactor engine."
    };
  }

  try {

    const source =
      fs.readFileSync(
        existingPath,
        "utf8"
      );

    const report =
      JSON.parse(source);

    return {
      exists: true,

      valid: true,

      optional: true,

      file:
        path.relative(
          transformedDirectory,
          existingPath
        ),

      report
    };

  } catch (error) {

    return {
      exists: true,

      valid: false,

      optional: true,

      message:
        error?.message ||
        "Transformation report is invalid."
    };
  }
}


/**
 * --------------------------------------------------------
 * Get JavaScript files
 * --------------------------------------------------------
 */
function getJavaScriptFiles(
  directory
) {
  const files = [];

  if (
    !fs.existsSync(directory)
  ) {
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

    const fullPath =
      path.join(
        directory,
        entry.name
      );

    if (
      entry.isDirectory()
    ) {

      if (
        shouldSkip(
          fullPath
        )
      ) {
        continue;
      }

      files.push(
        ...getJavaScriptFiles(
          fullPath
        )
      );

    } else {

      const extension =
        path.extname(
          entry.name
        ).toLowerCase();

      if (
        extension === ".js" ||
        extension === ".jsx" ||
        extension === ".ts" ||
        extension === ".tsx"
      ) {
        files.push(
          fullPath
        );
      }
    }
  }

  return files;
}


/**
 * --------------------------------------------------------
 * Skip folders
 * --------------------------------------------------------
 */
function shouldSkip(
  filePath
) {
  const normalized =
    filePath
      .split(path.sep)
      .join("/");

  const blockedParts = [
    "/node_modules/",
    "/.git/",
    "/dist/",
    "/build/",
    "/.next/",
    "/coverage/",
    "/CODESTRUCT-PREVIEW/",
    "/.codestruct-backup/"
  ];

  return blockedParts.some(
    (part) =>
      normalized.includes(part)
  );
}