// ============================================
// CodeStruct AI API Module
// ============================================
//
// Generated automatically.
// Original source files were not modified.
// This file belongs to the transformed preview.
//


// CodeStruct AI generated API wrapper

export async function codestructApiRequest1(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            options
        );

    if (!response.ok) {

        throw new Error(
            `API request failed: ${response.status} ${response.statusText}`
        );
    }

    return response;
}
