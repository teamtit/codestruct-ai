const API_BASE = "http://localhost:5000";

const projectFile = document.getElementById("projectFile");
const analyzeBtn = document.getElementById("analyzeBtn");
const refactorBtn = document.getElementById("refactorBtn");

const status = document.getElementById("status");

const dashboard = document.getElementById("dashboard");

const totalFiles = document.getElementById("totalFiles");
const totalLines = document.getElementById("totalLines");
const issueCount = document.getElementById("issueCount");

const architecture = document.getElementById("architecture");
const issues = document.getElementById("issues");
const refactorPlan = document.getElementById("refactorPlan");

const safePreview = document.getElementById("safePreview");
const previewPath = document.getElementById("previewPath");


let currentProjectId = null;
let currentAnalysis = null;
let currentPlan = null;
let currentRefactor = null;


/* =========================================================
   STATUS
========================================================= */

function setStatus(message, type = "") {

    if (!status) return;

    status.textContent = message;

    status.className = "status";

    if (type) {
        status.classList.add(type);
    }
}


/* =========================================================
   FILE VALIDATION
========================================================= */

function validateZipFile(file) {

    if (!file) {
        setStatus("Please select a ZIP file.", "error");
        return false;
    }

    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".zip")) {
        setStatus("Only ZIP files are allowed.", "error");
        return false;
    }

    return true;
}


/* =========================================================
   ANALYZE
========================================================= */

analyzeBtn.addEventListener("click", async () => {

    try {

        const file = projectFile.files[0];

        if (!validateZipFile(file)) {
            return;
        }

        setStatus("Analyzing project...", "loading");

        analyzeBtn.disabled = true;
        refactorBtn.disabled = true;


        const formData = new FormData();

        formData.append("project", file);


        const response = await fetch(
            `${API_BASE}/api/analyze`,
            {
                method: "POST",
                body: formData
            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Project analysis failed."
            );
        }


        currentProjectId = data.projectId;
        currentAnalysis = data.analysis;
        currentPlan = data.plan;


        renderAnalysis(
            currentAnalysis
        );

        renderRefactorPlan(
            currentPlan
        );


        if (dashboard) {
            dashboard.classList.remove("hidden");
        }


        refactorBtn.disabled = false;

        setStatus(
            "Project analyzed successfully.",
            "success"
        );


    } catch (error) {

        console.error(error);

        setStatus(
            error.message ||
            "Something went wrong during analysis.",
            "error"
        );

    } finally {

        analyzeBtn.disabled = false;
    }
});


/* =========================================================
   REFACTOR
========================================================= */

refactorBtn.addEventListener("click", async () => {

    try {

        if (!currentProjectId) {

            setStatus(
                "Please analyze the project first.",
                "error"
            );

            return;
        }


        setStatus(
            "Creating safe transformation...",
            "loading"
        );

        refactorBtn.disabled = true;


        const response = await fetch(
            `${API_BASE}/api/refactor/${currentProjectId}`,
            {
                method: "POST"
            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Refactoring failed."
            );
        }


        /*
         * Backend returns the refactor result
         * directly.
         *
         * Example:
         *
         * {
         *   success: true,
         *   projectId: "...",
         *   previewPath: "...",
         *   verification: {...}
         * }
         *
         * So don't use data.result.previewPath.
         */

        currentRefactor = data;


        renderSafePreview(
            currentRefactor
        );


        setStatus(
            "Safe transformation completed successfully.",
            "success"
        );


    } catch (error) {

        console.error(error);

        setStatus(
            error.message ||
            "Something went wrong during refactoring.",
            "error"
        );

    } finally {

        refactorBtn.disabled = false;
    }
});


/* =========================================================
   RENDER ANALYSIS
========================================================= */

function renderAnalysis(data) {

    if (!data) return;


    if (totalFiles) {
        totalFiles.textContent =
            data.totalFiles ?? 0;
    }


    if (totalLines) {
        totalLines.textContent =
            data.totalLines ?? 0;
    }


    if (issueCount) {
        issueCount.textContent =
            data.issues?.length ?? 0;
    }


    renderArchitecture(
        data.architecture
    );


    renderIssues(
        data.issues
    );
}


/* =========================================================
   ARCHITECTURE
========================================================= */

function renderArchitecture(data) {

    if (!architecture) return;


    architecture.innerHTML = "";


    if (!data) {

        architecture.innerHTML = `
            <div class="empty-state">
                No architecture information available.
            </div>
        `;

        return;
    }


    const items = [];


    if (data.frontend) {
        items.push("Frontend");
    }

    if (data.backend) {
        items.push("Backend");
    }

    if (data.react) {
        items.push("React");
    }

    if (data.html) {
        items.push("HTML");
    }

    if (data.css) {
        items.push("CSS");
    }

    if (data.js) {
        items.push("JavaScript");
    }

    if (data.ts) {
        items.push("TypeScript");
    }


    if (items.length === 0) {

        architecture.innerHTML = `
            <div class="empty-state">
                No architecture detected.
            </div>
        `;

        return;
    }


    items.forEach(item => {

        const element =
            document.createElement("span");

        element.className =
            "architecture-tag";

        element.textContent =
            item;

        architecture.appendChild(
            element
        );
    });
}


/* =========================================================
   ISSUES
========================================================= */

function renderIssues(issueList) {

    if (!issues) return;


    issues.innerHTML = "";


    if (!issueList || issueList.length === 0) {

        issues.innerHTML = `
            <div class="empty-state">
                No structural issues detected.
            </div>
        `;

        return;
    }


    issueList.forEach(issue => {

        const card =
            document.createElement("div");

        card.className =
            "issue-card";


        card.innerHTML = `
            <div class="issue-header">
                <strong>${escapeHtml(
                    issue.type || "Issue"
                )}</strong>

                <span class="issue-severity">
                    ${escapeHtml(
                        issue.severity || "medium"
                    )}
                </span>
            </div>

            <div class="issue-file">
                ${escapeHtml(
                    issue.file || ""
                )}
            </div>

            <div class="issue-message">
                ${escapeHtml(
                    issue.message || ""
                )}
            </div>
        `;


        issues.appendChild(card);
    });
}


/* =========================================================
   REFACTOR PLAN
========================================================= */

function renderRefactorPlan(plan) {

    if (!refactorPlan) return;


    refactorPlan.innerHTML = "";


    if (!plan) {

        refactorPlan.innerHTML = `
            <div class="empty-state">
                No refactor plan available.
            </div>
        `;

        return;
    }


    const actions =
        plan.actions || [];


    let html = `
        <div class="plan-summary">
            <strong>
                ${escapeHtml(
                    plan.goal ||
                    "Improve project structure."
                )}
            </strong>

            <div class="plan-count">
                ${actions.length}
                planned action(s)
            </div>
        </div>
    `;


    actions.forEach(action => {

        html += `
            <div class="plan-item">

                <div class="plan-item-header">

                    <strong>
                        ${escapeHtml(
                            action.type ||
                            "Action"
                        )}
                    </strong>

                    <span>
                        ${escapeHtml(
                            action.priority ||
                            "medium"
                        )}
                    </span>

                </div>

                <div>
                    ${escapeHtml(
                        action.action ||
                        ""
                    )}
                </div>

                ${
                    action.file
                        ? `
                            <div class="plan-file">
                                ${escapeHtml(
                                    action.file
                                )}
                            </div>
                          `
                        : ""
                }

            </div>
        `;
    });


    refactorPlan.innerHTML =
        html;
}


/* =========================================================
   SAFE PREVIEW
========================================================= */

function renderSafePreview(result) {

    if (!safePreview) {
        return;
    }


    /*
     * Backend result is expected directly.
     */

    const verification =
        result?.verification || {};


    const transformationReport =
        result?.transformationReport || {};


    const verificationPassed =
        verification.verified === true ||
        verification.status === "PASSED";


    const changedFiles =
        result?.changedFiles ??
        transformationReport.filesChanged ??
        0;


    const apiCalls =
        result?.apiCallsDetected ??
        0;


    const transformedCalls =
        result?.transformationsPlanned ??
        transformationReport.callsTransformed ??
        0;


    const previewLocation =
        result?.previewPath ||
        "CODESTRUCT-PREVIEW";


    const transformedCopy =
        result?.transformedPath ||
        "CODESTRUCT-PREVIEW/TRANSFORMED";


    const apiModule =
        result?.apiModule ||
        "Not generated";


    const message =
        result?.message ||
        "Safe transformation completed.";


    safePreview.innerHTML = `

        <div class="safe-preview">

            <div class="preview-title">

                <div>
                    <h3>
                        Safe Transformation Preview
                    </h3>

                    <p>
                        ${verificationPassed
                            ? "Transformation verified successfully."
                            : "Transformation verification requires attention."
                        }
                    </p>
                </div>

                <span class="${
                    verificationPassed
                        ? "verification-pass"
                        : "verification-fail"
                }">

                    ${
                        verificationPassed
                            ? "VERIFIED"
                            : "NOT VERIFIED"
                    }

                </span>

            </div>


            <div class="preview-stats">

                <div class="preview-stat">

                    <div class="preview-stat-number">
                        ${changedFiles}
                    </div>

                    <div class="preview-stat-label">
                        Files Changed
                    </div>

                </div>


                <div class="preview-stat">

                    <div class="preview-stat-number">
                        ${apiCalls}
                    </div>

                    <div class="preview-stat-label">
                        API Calls Found
                    </div>

                </div>


                <div class="preview-stat">

                    <div class="preview-stat-number">
                        ${transformedCalls}
                    </div>

                    <div class="preview-stat-label">
                        Calls Transformed
                    </div>

                </div>

            </div>


            <div class="preview-details">

                <div class="preview-row">

                    <span>
                        Preview Location
                    </span>

                    <strong class="safe-value">
                        ${escapeHtml(
                            previewLocation
                        )}
                    </strong>

                </div>


                <div class="preview-row">

                    <span>
                        Transformed Copy
                    </span>

                    <strong class="safe-value">
                        ${escapeHtml(
                            transformedCopy
                        )}
                    </strong>

                </div>


                <div class="preview-row">

                    <span>
                        API Module
                    </span>

                    <strong class="safe-value">
                        ${escapeHtml(
                            apiModule
                        )}
                    </strong>

                </div>


                <div class="preview-row">

                    <span>
                        Original Source
                    </span>

                    <strong class="safe-value">
                        Untouched ✓
                    </strong>

                </div>


                <div class="preview-row">

                    <span>
                        Verification
                    </span>

                    <strong class="safe-value">
                        ${
                            verificationPassed
                                ? "PASSED ✓"
                                : "FAILED ✕"
                        }
                    </strong>

                </div>

            </div>


            <div class="transformation-message">

                ${escapeHtml(
                    message
                )}

            </div>


            <div class="preview-note">

                CodeStruct AI creates a transformed
                copy instead of modifying the original
                uploaded project.

            </div>


            ${
                verificationPassed
                    ? `
                        <button
                            id="downloadRefactoredBtn"
                            class="download-btn"
                            type="button"
                        >
                            Download Refactored Project
                        </button>
                      `
                    : ""
            }

        </div>
    `;


    if (previewPath) {

        previewPath.textContent =
            verificationPassed
                ? `Verified preview: ${previewLocation}`
                : "Verification requires attention.";
    }


    const downloadBtn =
        document.getElementById(
            "downloadRefactoredBtn"
        );


    if (downloadBtn) {

        downloadBtn.addEventListener(
            "click",
            downloadRefactoredProject
        );
    }
}


/* =========================================================
   DOWNLOAD
========================================================= */

async function downloadRefactoredProject() {

    try {

        if (!currentProjectId) {

            setStatus(
                "Project ID not found.",
                "error"
            );

            return;
        }


        const verification =
            currentRefactor?.verification;


        const verified =
            verification?.verified === true ||
            verification?.status === "PASSED";


        if (!verified) {

            setStatus(
                "Project verification has not passed.",
                "error"
            );

            return;
        }


        setStatus(
            "Preparing download...",
            "loading"
        );


        const downloadUrl =
            `${API_BASE}/api/refactor/${currentProjectId}/download`;


        const response =
            await fetch(downloadUrl);


        if (!response.ok) {

            let message =
                "Download failed.";

            try {

                const errorData =
                    await response.json();

                message =
                    errorData.message ||
                    message;

            } catch {

                // Ignore JSON parsing error
            }


            throw new Error(message);
        }


        const blob =
            await response.blob();


        const url =
            window.URL.createObjectURL(
                blob
            );


        const anchor =
            document.createElement("a");


        anchor.href = url;

        anchor.download =
            `codestruct-refactored-${currentProjectId}.zip`;


        document.body.appendChild(anchor);

        anchor.click();

        anchor.remove();


        window.URL.revokeObjectURL(url);


        setStatus(
            "Refactored project downloaded successfully.",
            "success"
        );


    } catch (error) {

        console.error(error);

        setStatus(
            error.message ||
            "Download failed.",
            "error"
        );
    }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}