const fs = require("fs");
const path = require("path");


function generateDocs(
    projectDir,
    analysis,
    plan,
    verification
) {

    const issues =
        analysis.issues.length === 0
            ? "No structural issues detected."
            : analysis.issues
                .map(
                    issue =>
                        `- [${issue.severity}] ${issue.file}: ${issue.message}`
                )
                .join("\n");


    const actions =
        plan.actions
            .map(
                (action, index) =>
                    `${index + 1}. ${action.type} - ${action.action}`
            )
            .join("\n");


    const content =
`# CodeStruct AI Report

## Project

Files: ${analysis.totalFiles}

Lines: ${analysis.totalLines}


## Issues

${issues}


## Refactoring Plan

${actions}


## Verification

Status: ${verification.status}
`;


    const filePath =
        path.join(
            projectDir,
            "CODESTRUCT-REPORT.md"
        );


    fs.writeFileSync(
        filePath,
        content,
        "utf8"
    );


    return {

        generated: true,

        file:
            "CODESTRUCT-REPORT.md"

    };

}


module.exports = {
    generateDocs
};