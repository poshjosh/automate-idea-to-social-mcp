import * as fs from "fs";

/**
 * Extract the value of the named field from a JSON file.
 * @param jsonFilePath - Path to the JSON file
 * @param nameOfFieldToExtract - Name of the field to extract
 * @returns Extraction result
 */
function extractFieldValueFromJsonFile(jsonFilePath: string, nameOfFieldToExtract: string): string {

    // Check if file exists
    if (!fs.existsSync(jsonFilePath)) {
        throw new Error(`Does not exist: ${jsonFilePath}`);
    }

    // Check if it's actually a file
    const stats = fs.statSync(jsonFilePath);
    if (!stats.isFile()) {
        throw new Error(`Not a file: ${jsonFilePath}`);
    }

    // Read the file
    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');

    // Parse JSON
    let jsonData: unknown = JSON.parse(fileContent);

    // Check if parsed data is an object
    if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
        throw new Error('JSON root must be an object')
    }

    const data = jsonData as Record<string, any>;

    if (!(nameOfFieldToExtract in data)) {
        throw new Error(`JSON object does not contain a "${nameOfFieldToExtract}" field`)
    }

    return data[nameOfFieldToExtract].toString();
}

export {
    extractFieldValueFromJsonFile
};
