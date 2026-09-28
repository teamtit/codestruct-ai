// CodeStruct AI generated API module
// Generated from AST analysis.
// This module is a transformation preview.
// Original source code was not modified.

export async function apiRequest1(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(
            `API request failed: ${response.status} ${response.statusText}`
        );
    }

    return response;
}
