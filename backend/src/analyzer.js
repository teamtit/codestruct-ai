const fs = require("fs");
const path = require("path");

const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const IGNORE_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    ".codestruct-backup"
]);

const SUPPORTED_FILES = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".html",
    ".css",
    ".json"
]);

function getAllFiles(dir, result = []) {
    if (!fs.existsSync(dir)) {
        return result;
    }

    const entries = fs.readdirSync(dir, {
        withFileTypes: true
    });

    for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            getAllFiles(fullPath, result);
        } else {
            const ext = path.extname(entry.name).toLowerCase();

            if (SUPPORTED_FILES.has(ext)) {
                result.push(fullPath);
            }
        }
    }

    return result;
}

function countLines(content) {
    if (!content) {
        return 0;
    }

    return content.split(/\r?\n/).length;
}

function parseJavaScript(content, filePath) {
    const result = {
        functions: [],
        variables: [],
        imports: [],
        exports: [],
        components: [],
        hooks: [],
        classes: [],
        apiCalls: [],
        domOperations: [],
        parseError: null
    };

    try {
        const ast = parser.parse(content, {
            sourceType: "unambiguous",
            plugins: [
                "jsx",
                "typescript"
            ]
        });

        traverse(ast, {

            FunctionDeclaration(path) {
                if (path.node.id) {
                    result.functions.push(
                        path.node.id.name
                    );
                }
            },

            FunctionExpression(path) {
                if (
                    path.parent &&
                    path.parent.type === "VariableDeclarator" &&
                    path.parent.id
                ) {
                    result.functions.push(
                        path.parent.id.name
                    );
                }
            },

            ArrowFunctionExpression(path) {
                if (
                    path.parent &&
                    path.parent.type === "VariableDeclarator" &&
                    path.parent.id
                ) {
                    result.functions.push(
                        path.parent.id.name
                    );
                }
            },

            VariableDeclarator(path) {
                if (path.node.id.type === "Identifier") {
                    result.variables.push(
                        path.node.id.name
                    );
                }
            },

            ImportDeclaration(path) {
                if (path.node.source) {
                    result.imports.push(
                        path.node.source.value
                    );
                }
            },

            ExportNamedDeclaration(path) {
                if (path.node.declaration) {
                    result.exports.push(
                        "named"
                    );
                } else {
                    result.exports.push(
                        "named"
                    );
                }
            },

            ExportDefaultDeclaration() {
                result.exports.push(
                    "default"
                );
            },

            ClassDeclaration(path) {
                if (path.node.id) {
                    result.classes.push(
                        path.node.id.name
                    );
                }
            },

            CallExpression(path) {
                const callee = path.node.callee;

                if (
                    callee &&
                    callee.type === "Identifier" &&
                    callee.name.startsWith("use")
                ) {
                    result.hooks.push(
                        callee.name
                    );
                }

                if (
                    callee &&
                    callee.type === "MemberExpression" &&
                    callee.object &&
                    callee.object.name === "document"
                ) {
                    result.domOperations.push(
                        callee.property?.name || "document"
                    );
                }

                if (
                    callee &&
                    callee.type === "Identifier" &&
                    (
                        callee.name === "fetch" ||
                        callee.name === "axios"
                    )
                ) {
                    result.apiCalls.push(
                        callee.name
                    );
                }
            },

            JSXElement() {
                if (!result.components.includes("JSX")) {
                    result.components.push("JSX");
                }
            }
        });

    } catch (error) {
        result.parseError = error.message;
    }

    result.functions = [...new Set(result.functions)];
    result.variables = [...new Set(result.variables)];
    result.imports = [...new Set(result.imports)];
    result.exports = [...new Set(result.exports)];
    result.classes = [...new Set(result.classes)];
    result.hooks = [...new Set(result.hooks)];
    result.components = [...new Set(result.components)];
    result.apiCalls = [...new Set(result.apiCalls)];
    result.domOperations = [...new Set(result.domOperations)];

    return result;
}

function analyzeHtml(content) {
    const result = {
        forms: 0,
        scripts: 0,
        stylesheets: 0,
        images: 0,
        links: 0
    };

    result.forms = (
        content.match(/<form\b/gi) || []
    ).length;

    result.scripts = (
        content.match(/<script\b/gi) || []
    ).length;

    result.stylesheets = (
        content.match(/<link\b/gi) || []
    ).length;

    result.images = (
        content.match(/<img\b/gi) || []
    ).length;

    result.links = (
        content.match(/<a\b/gi) || []
    ).length;

    return result;
}

function analyzeCss(content) {
    const selectors = (
        content.match(/[^{}]+\{/g) || []
    ).length;

    const mediaQueries = (
        content.match(/@media\b/gi) || []
    ).length;

    const animations = (
        content.match(/@keyframes\b/gi) || []
    ).length;

    return {
        selectors,
        mediaQueries,
        animations
    };
}

function createIssues(fileInfo) {
    const issues = [];

    if (fileInfo.lines > 500) {
        issues.push({
            type: "large-file",
            severity: "high",
            message: "This file is very large and may contain multiple responsibilities."
        });
    } else if (fileInfo.lines > 250) {
        issues.push({
            type: "large-file",
            severity: "medium",
            message: "This file is larger than recommended and may benefit from splitting."
        });
    }

    if (
        fileInfo.imports &&
        fileInfo.imports.length > 15
    ) {
        issues.push({
            type: "many-imports",
            severity: "medium",
            message: "This file has many imports and may have too many responsibilities."
        });
    }

    if (fileInfo.parseError) {
        issues.push({
            type: "parse-error",
            severity: "high",
            message: "The JavaScript/TypeScript file could not be parsed."
        });
    }

    if (
        fileInfo.domOperations &&
        fileInfo.domOperations.length > 10
    ) {
        issues.push({
            type: "dom-heavy",
            severity: "medium",
            message: "This file contains many DOM operations."
        });
    }

    if (
        fileInfo.apiCalls &&
        fileInfo.apiCalls.length > 0 &&
        fileInfo.domOperations &&
        fileInfo.domOperations.length > 0
    ) {
        issues.push({
            type: "mixed-responsibilities",
            severity: "medium",
            message: "API communication and DOM manipulation are mixed in the same file."
        });
    }

    return issues;
}

function detectArchitecture(fileResults) {
    const architecture = {
        hasFrontend: false,
        hasBackend: false,
        hasReact: false,
        hasHtml: false,
        hasCss: false,
        hasJavaScript: false,
        hasTypeScript: false
    };

    for (const file of fileResults) {

        const filePath = file.path.toLowerCase();

        if (
            filePath.endsWith(".html") ||
            filePath.includes("/public/") ||
            filePath.includes("\\public\\")
        ) {
            architecture.hasFrontend = true;
        }

        if (
            filePath.includes("server.js") ||
            filePath.includes("app.js") ||
            filePath.includes("routes") ||
            filePath.includes("controllers")
        ) {
            architecture.hasBackend = true;
        }

        if (
            filePath.endsWith(".jsx") ||
            filePath.endsWith(".tsx") ||
            file.components?.includes("JSX")
        ) {
            architecture.hasReact = true;
        }

        if (filePath.endsWith(".html")) {
            architecture.hasHtml = true;
        }

        if (filePath.endsWith(".css")) {
            architecture.hasCss = true;
        }

        if (filePath.endsWith(".js")) {
            architecture.hasJavaScript = true;
        }

        if (
            filePath.endsWith(".ts") ||
            filePath.endsWith(".tsx")
        ) {
            architecture.hasTypeScript = true;
        }
    }

    return architecture;
}

function buildDependencyGraph(fileResults) {
    const graph = {};

    for (const file of fileResults) {
        graph[file.path] = file.imports || [];
    }

    return graph;
}

function analyzeProject(projectDir) {

    const files = getAllFiles(projectDir);

    const fileResults = [];
    const issues = [];

    let totalLines = 0;

    for (const fullPath of files) {

        const relativePath = path.relative(
            projectDir,
            fullPath
        );

        const content = fs.readFileSync(
            fullPath,
            "utf8"
        );

        const extension = path
            .extname(fullPath)
            .toLowerCase();

        const lines = countLines(content);

        totalLines += lines;

        const fileInfo = {
            path: relativePath,
            extension,
            lines,
            functions: [],
            variables: [],
            imports: [],
            exports: [],
            components: [],
            hooks: [],
            classes: [],
            apiCalls: [],
            domOperations: [],
            html: null,
            css: null,
            parseError: null
        };

        if (
            extension === ".js" ||
            extension === ".jsx" ||
            extension === ".ts" ||
            extension === ".tsx"
        ) {

            const jsAnalysis = parseJavaScript(
                content,
                relativePath
            );

            Object.assign(
                fileInfo,
                jsAnalysis
            );
        }

        if (extension === ".html") {
            fileInfo.html = analyzeHtml(
                content
            );
        }

        if (extension === ".css") {
            fileInfo.css = analyzeCss(
                content
            );
        }

        const fileIssues = createIssues(
            fileInfo
        );

        for (const issue of fileIssues) {
            issues.push({
                file: relativePath,
                ...issue
            });
        }

        fileResults.push(fileInfo);
    }

    const architecture = detectArchitecture(
        fileResults
    );

    return {
        totalFiles: fileResults.length,

        totalLines,

        files: fileResults,

        architecture,

        dependencyGraph:
            buildDependencyGraph(fileResults),

        issues
    };
}

module.exports = {
    analyzeProject
};