import * as fs from "fs";
import dotenv from "dotenv";
import { readEnvValue } from "./read-env-value";
// Mock the dotenv module
jest.mock('dotenv', () => ({
    parse: jest.fn()
}));
// Mock fs.existsSync and fs.readFileSync
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));
// Mock dotenv.parse
jest.mock('dotenv', () => ({
    parse: jest.fn()
}));
describe('readEnvValue', () => {
    const envFilePath = './test.env';
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });
    test('should return the value for an existing key', () => {
        // Mock file exists
        fs.existsSync.mockReturnValue(true);
        // Mock file content with multiple lines
        fs.readFileSync.mockReturnValue('API_KEY=abc123\nDATABASE_URL=postgresql://localhost:5432/test');
        // Mock dotenv parse result
        dotenv.parse.mockReturnValue({
            'API_KEY': 'abc123',
            'DATABASE_URL': 'postgresql://localhost:5432/test'
        });
        const result = readEnvValue(envFilePath, 'API_KEY');
        expect(result).toBe('abc123');
    });
    test('should return null for a non-existent key', () => {
        // Mock file exists
        fs.existsSync.mockReturnValue(true);
        // Mock file content
        fs.readFileSync.mockReturnValue('API_KEY=abc123');
        // Mock dotenv parse result
        dotenv.parse.mockReturnValue({
            'API_KEY': 'abc123'
        });
        const result = readEnvValue(envFilePath, 'NON_EXISTENT_KEY');
        expect(result).toBeNull();
    });
    test('should throw Error when file does not exist', () => {
        // Mock file exists
        fs.existsSync.mockReturnValue(false);
        expect(() => {
            readEnvValue(envFilePath, 'API_KEY');
        }).toThrow(`File not found: ${envFilePath}`);
        // Ensure readFileSync was not called
        expect(fs.readFileSync).not.toHaveBeenCalled();
    });
    test('should handle empty values', () => {
        // Mock file exists
        fs.existsSync.mockReturnValue(true);
        // Mock file content with empty value
        fs.readFileSync.mockReturnValue('EMPTY_KEY=');
        // Mock dotenv parse result
        dotenv.parse.mockReturnValue({
            'EMPTY_KEY': ''
        });
        const result = readEnvValue(envFilePath, 'EMPTY_KEY');
        expect(result).toBe('');
    });
    test('should handle special characters in values', () => {
        // Mock file exists
        fs.existsSync.mockReturnValue(true);
        // Mock file content with special characters
        fs.readFileSync.mockReturnValue('SPECIAL_KEY=value with spaces & symbols!@#$%^&*()');
        // Mock dotenv parse result
        dotenv.parse.mockReturnValue({
            'SPECIAL_KEY': 'value with spaces & symbols!@#$%^&*()'
        });
        const result = readEnvValue(envFilePath, 'SPECIAL_KEY');
        expect(result).toBe('value with spaces & symbols!@#$%^&*()');
    });
    test('should throw error thrown during file reading', () => {
        // Mock file exists
        fs.existsSync.mockReturnValue(true);
        const errorMessage = 'File read error';
        // Mock file read error
        fs.readFileSync.mockImplementation(() => {
            throw new Error(errorMessage);
        });
        expect(() => {
            readEnvValue(envFilePath, 'API_KEY');
        }).toThrow(errorMessage);
    });
    test('should throw error thrown during dotenv parsing', () => {
        // Mock file exists
        fs.existsSync.mockReturnValue(true);
        // Mock file content
        fs.readFileSync.mockReturnValue('API_KEY=abc123');
        const errorMessage = 'Parse error';
        // Mock dotenv parse error
        dotenv.parse.mockImplementation(() => {
            throw new Error('Parse error');
        });
        expect(() => {
            readEnvValue(envFilePath, 'API_KEY');
        }).toThrow(errorMessage);
    });
});
//# sourceMappingURL=read-env-value.test.js.map