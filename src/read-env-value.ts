import * as fs from "fs";
import dotenv from "dotenv";

/**
 * Reads a specific key and its value from a .env file
 * @param {string} envFilePath - Path to the .env file
 * @param {string} key - The key to look for
 * @param {string} fallback - The fallback to return if the key is not found
 * @returns {string|null} The value of the key, or fallback if not found
 */
export function readEnvValue(envFilePath: string, key: string, fallback: any = null) {
    if (!fs.existsSync(envFilePath)) {
        throw new Error(`File not found: ${envFilePath}`);
    }

    const content = fs.readFileSync(envFilePath, 'utf8');

    const parsed = dotenv.parse(content);

    return parsed[key] ?? fallback;
}