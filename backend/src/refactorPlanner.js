export function createRefactorPlan(analysis) {
    const actions = [];

    if (!analysis || !analysis.issues) {
        return {
            goal: "Improve project structure while preserving intended behavior.",
            summary: {
                issuesDetected: 0,
                actionsGenerated: 1
            },
            actions: [
                {
                    type: "baseline",
                    priority: "low",
                    action: "Review project structure and identify safe modularization opportunities.",
                    reason: "No specific structural issues were detected."
                }
            ],
            targetArchitecture: {
                frontend: analysis?.architecture?.frontend ? "frontend/" : null,
                backend: analysis?.architecture?.backend ? "backend/" : null,
                javascript: analysis?.architecture?.js ? "src/" : null,
                react: analysis?.architecture?.react ? "src/components/" : null
            },
            safetyRules: getSafetyRules()
        };
    }

    const issueList = analysis.issues;

    for (const issue of issueList) {

        switch (issue.type) {

            case "large-file":
                actions.push({
                    type: "split-large-file",
                    file: issue.file,
                    priority: issue.severity,
                    action: "Split the large file into smaller modules.",
                    reason: issue.message
                });
                break;

            case "many-imports":
                actions.push({
                    type: "reduce-dependencies",
                    file: issue.file,
                    priority: issue.severity,
                    action: "Reduce unnecessary dependencies and organize imports.",
                    reason: issue.message
                });
                break;

            case "parse-error":
                actions.push({
                    type: "fix-syntax",
                    file: issue.file,
                    priority: "high",
                    action: "Fix syntax errors before applying structural changes.",
                    reason: issue.message
                });
                break;

            case "mixed-responsibilities":
                actions.push({
                    type: "separate-api-and-dom",
                    file: issue.file,
                    priority: issue.severity,
                    action: "Separate API communication from DOM manipulation.",
                    reason: issue.message,
                    suggestedStructure: {
                        api: "src/api/",
                        ui: "src/ui/",
                        services: "src/services/"
                    }
                });
                break;

            case "dom-heavy":
                actions.push({
                    type: "extract-dom-logic",
                    file: issue.file,
                    priority: issue.severity,
                    action: "Extract DOM manipulation into dedicated UI modules.",
                    reason: issue.message,
                    suggestedStructure: {
                        ui: "src/ui/",
                        utils: "src/utils/"
                    }
                });
                break;

            default:
                break;
        }
    }


    /*
     * Frontend / Backend separation
     */

    if (
        analysis.architecture?.frontend &&
        analysis.architecture?.backend
    ) {
        actions.push({
            type: "frontend-backend-separation",
            priority: "medium",
            action: "Keep frontend and backend responsibilities separated.",
            suggestedStructure: {
                frontend: "frontend/",
                backend: "backend/"
            }
        });
    }


    /*
     * HTML organization
     */

    if (analysis.architecture?.html) {
        actions.push({
            type: "html-organization",
            priority: "low",
            action: "Organize HTML structure and keep page markup separate from application logic."
        });
    }


    /*
     * CSS organization
     */

    if (analysis.architecture?.css) {
        actions.push({
            type: "css-organization",
            priority: "low",
            action: "Separate global styles, components and animations into maintainable CSS modules."
        });
    }


    /*
     * JavaScript modularization
     */

    if (
        analysis.architecture?.js &&
        !analysis.architecture?.react
    ) {
        actions.push({
            type: "javascript-modularization",
            priority: "medium",
            action: "Split JavaScript responsibilities into modules such as UI, API, utilities and application logic.",
            suggestedStructure: {
                main: "src/main.js",
                api: "src/api/",
                ui: "src/ui/",
                services: "src/services/",
                utils: "src/utils/"
            }
        });
    }


    /*
     * React architecture
     */

    if (analysis.architecture?.react) {
        actions.push({
            type: "react-architecture",
            priority: "medium",
            action: "Organize React components, hooks, services and utilities into maintainable modules.",
            suggestedStructure: {
                components: "src/components/",
                hooks: "src/hooks/",
                services: "src/services/",
                utils: "src/utils/"
            }
        });
    }


    /*
     * Remove duplicate actions
     */

    const uniqueActions = [];

    const actionKeys = new Set();

    for (const action of actions) {

        const key = `${action.type}-${action.file || ""}`;

        if (!actionKeys.has(key)) {
            actionKeys.add(key);
            uniqueActions.push(action);
        }
    }


    /*
     * Baseline action
     */

    if (uniqueActions.length === 0) {

        uniqueActions.push({
            type: "baseline",
            priority: "low",
            action: "Review project structure and identify safe modularization opportunities.",
            reason: "No specific structural issues were detected."
        });
    }


    return {
        goal: "Improve project structure while preserving intended behavior.",

        summary: {
            issuesDetected: issueList.length,
            actionsGenerated: uniqueActions.length
        },

        actions: uniqueActions,

        targetArchitecture: {
            frontend: analysis.architecture?.frontend
                ? "frontend/"
                : null,

            backend: analysis.architecture?.backend
                ? "backend/"
                : null,

            javascript: analysis.architecture?.js
                ? "src/"
                : null,

            react: analysis.architecture?.react
                ? "src/components/"
                : null
        },

        safetyRules: getSafetyRules()
    };
}


/*
 * Safety rules
 */

function getSafetyRules() {

    return [
        "Do not intentionally remove functionality.",
        "Do not change public APIs without updating references.",
        "Create backups before source transformations.",
        "Verify changes after transformations.",
        "Do not execute uploaded project code during analysis.",
        "Do not overwrite original source files during planning.",
        "Require verification before accepting structural changes."
    ];
}