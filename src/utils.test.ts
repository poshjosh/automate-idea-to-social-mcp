import * as fs from "fs";
import { extractFieldValueFromJsonFile } from "./utils";

// Mock fs.existsSync and fs.readFileSync
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    statSync: jest.fn(),
    readFileSync: jest.fn()
}));

describe('extractFieldValueFromJsonFile', () => {

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    test('should return the value for an existing field', () => {
        const jsonFilePath = '../package.json';
        const fieldName = 'version';
        const expectedValue = '0.0.1';

        // Mock path exists
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        // Mock path is a file
        (fs.statSync as jest.Mock).mockReturnValue({
            isFile: () => true
        });

        // Mock file content with multiple lines
        (fs.readFileSync as jest.Mock).mockReturnValue('{"version": "0.0.1", "name": "test-package"}');

        const result = extractFieldValueFromJsonFile(jsonFilePath, fieldName);

        expect(result).toBe(expectedValue);
    });
});