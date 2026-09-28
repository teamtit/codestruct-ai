import fs from "fs";
import path from "path";

import * as parser from "@babel/parser";
import * as traverseModule from "@babel/traverse";
import * as generatorModule from "@babel/generator";

const traverse =
  typeof traverseModule === "function"
    ? traverseModule
    : typeof traverseModule.default === "function"
      ? traverseModule.default
      : traverseModule.default?.default;

const generate =
  typeof generatorModule === "function"
    ? generatorModule
    : typeof generatorModule.default === "function"
      ? generatorModule.default
      : generatorModule.default?.default;


/* =========================================================
   CONFIG
========================================================= */

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".codestruct-backup",
  "CODESTRUCT-PREVIEW"
]);

const JS_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];


/* =========================================================
   MAIN TRANSFORM FUNCTION
========================================================= */

export async function transformProject(projectDirectory, apiModulePath) {

  console.log("");
  console.log("=================================");
  console.log("CodeStruct AST Transformation");
  console.log("=================================");
  console.log("Source root:", projectDirectory);


  const jsFiles = getJavaScriptFiles(projectDirectory);

  console.log("JavaScript files found:", jsFiles.length);
  console.log("");


  const transformationResults = [];
  const apiCalls = [];

  let apiCounter = 1;


  for (const filePath of jsFiles) {

    console.log("---------------------------------");
    console.log("Checking:", filePath);
    console.log("---------------------------------");


    /*
      Don't transform the generated API file itself.
    */

    if (path.resolve(filePath) === path.resolve(apiModulePath)) {
      console.log("Skipping generated API module.");
      continue;
    }


    const result = transformJavaScriptFile(
      filePath,
      apiCounter
    );


    if (result.transformed) {

      apiCounter += result.apiCalls.length;

      transformationResults.push({
        file: path.relative(projectDirectory, filePath),
        transformed: true,
        apiCalls: result.apiCalls
      });

      apiCalls.push(...result.apiCalls);

      console.log(
        `✓ Transformed: ${path.relative(projectDirectory, filePath)}`
      );

    } else {

      console.log(
        `No transformation needed: ${path.relative(projectDirectory, filePath)}`
      );
    }
  }


  console.log("");
  console.log("Transformation summary:");
  console.log("Transformed files:", transformationResults.length);
  console.log("API calls transformed:", apiCalls.length);
  console.log("=================================");


  return {
    transformationResults,
    apiCalls
  };
}


/* =========================================================
   TRANSFORM ONE JS FILE
========================================================= */

function transformJavaScriptFile(filePath, startingCounter) {

  const code = fs.readFileSync(filePath, "utf8");


  let ast;

  try {

    ast = parser.parse(code, {
      sourceType: "unambiguous",

      plugins: [
        "jsx",
        "typescript"
      ]
    });

  } catch (error) {

    console.log(
      "❌ Babel parse failed:",
      path.basename(filePath)
    );

    console.log("Reason:", error.message);

    return {
      transformed: false,
      apiCalls: []
    };
  }


  const apiCalls = [];

  let counter = startingCounter;


  /*
    Traverse AST and find:

      fetch(...)

    OR

      window.fetch(...)
  */

  traverse(ast, {

    CallExpression(pathObject) {

      const node = pathObject.node;

      let isFetch = false;


      /*
        fetch(...)
      */

      if (
        node.callee &&
        node.callee.type === "Identifier" &&
        node.callee.name === "fetch"
      ) {

        isFetch = true;
      }


      /*
        window.fetch(...)
      */

      if (
        node.callee &&
        node.callee.type === "MemberExpression" &&
        !node.callee.computed &&
        node.callee.object &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "window" &&
        node.callee.property &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "fetch"
      ) {

        isFetch = true;
      }


      if (!isFetch) {
        return;
      }


      const functionName =
        `codestructApiRequest${counter}`;


      /*
        Read URL if it is directly available.
      */

      let url = null;

      if (
        node.arguments &&
        node.arguments.length > 0 &&
        node.arguments[0].type === "StringLiteral"
      ) {

        url = node.arguments[0].value;
      }


      /*
        Change:

          fetch(...)

        into:

          codestructApiRequest1(...)
      */

      node.callee = {
        type: "Identifier",
        name: functionName
      };


      apiCalls.push({
        functionName,
        url,
        original: "fetch"
      });


      console.log(
        `✓ fetch detected → ${functionName}()`
      );


      if (url) {
        console.log("  URL:", url);
      }


      counter++;
    }
  });


  /*
    No API calls found.
  */

  if (apiCalls.length === 0) {

    return {
      transformed: false,
      apiCalls: []
    };
  }


  /*
    Add imports.
  */

  const importNodes = apiCalls.map((apiCall) => {

    return {
      type: "ImportDeclaration",

      specifiers: [
        {
          type: "ImportSpecifier",

          imported: {
            type: "Identifier",
            name: apiCall.functionName
          },

          local: {
            type: "Identifier",
            name: apiCall.functionName
          }
        }
      ],

      source: {
        type: "StringLiteral",
        value: "./api/api.js"
      }
    };
  });


  /*
    Add imports at beginning.
  */

  ast.program.body = [
    ...importNodes,
    ...ast.program.body
  ];


  /*
    Generate transformed JavaScript.
  */

  const output = generate(ast, {
    retainLines: false,
    compact: false
  });


  fs.writeFileSync(
    filePath,
    output.code,
    "utf8"
  );


  return {
    transformed: true,
    apiCalls
  };
}


/* =========================================================
   GENERATE API MODULE
========================================================= */

export function createApiModule(apiModulePath, apiCalls) {

  const directory = path.dirname(apiModulePath);


  fs.mkdirSync(directory, {
    recursive: true
  });


  /*
    Remove duplicate functions.
  */

  const uniqueCalls = [];

  const seen = new Set();


  for (const call of apiCalls) {

    if (seen.has(call.functionName)) {
      continue;
    }

    seen.add(call.functionName);

    uniqueCalls.push(call);
  }


  let code = "";


  code += "// CodeStruct AI - Generated API Module\n";
  code += "// Automatically generated during AST transformation.\n\n";


  if (uniqueCalls.length === 0) {

    code += "// No API calls were detected.\n";

  } else {

    for (const call of uniqueCalls) {

      code += `export async function ${call.functionName}(...args) {\n`;

      code += `  return fetch(...args);\n`;

      code += `}\n\n`;
    }
  }


  fs.writeFileSync(
    apiModulePath,
    code,
    "utf8"
  );


  console.log("");
  console.log(
    "Generated API module:",
    apiModulePath
  );

  console.log(
    "Generated API functions:",
    uniqueCalls.length
  );

  console.log("=================================");


  return {
    apiModulePath,
    apiCalls: uniqueCalls
  };
}


/* =========================================================
   FIND JAVASCRIPT FILES
========================================================= */

function getJavaScriptFiles(rootDirectory) {

  const files = [];


  function walk(directory) {

    let entries;

    try {

      entries = fs.readdirSync(
        directory,
        {
          withFileTypes: true
        }
      );

    } catch (error) {

      console.log(
        "Unable to read directory:",
        directory
      );

      return;
    }


    for (const entry of entries) {

      const fullPath =
        path.join(
          directory,
          entry.name
        );


      if (entry.isDirectory()) {

        if (
          SKIP_DIRECTORIES.has(
            entry.name
          )
        ) {
          continue;
        }


        walk(fullPath);

        continue;
      }


      if (!entry.isFile()) {
        continue;
      }


      const extension =
        path.extname(
          entry.name
        ).toLowerCase();


      if (
        JS_EXTENSIONS.includes(
          extension
        )
      ) {

        files.push(fullPath);
      }
    }
  }


  walk(rootDirectory);


  return files;
}