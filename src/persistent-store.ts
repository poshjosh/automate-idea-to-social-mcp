import storage from 'node-persist';
import { logInfo, logThrown } from "./logger.js";


/**
 * Class for storing and retrieving data in a persistent way
 */
class PersistentStore {
    constructor(options: object) {
        storage.init(options).catch((err: unknown) => {
            logThrown(`@PersistentStore. Error initializing storage with options: ${JSON.stringify(options)}`, err);
        });
    }

    async set(key: string, value: any): Promise<void> {
        await storage.set(key, value);
        logInfo(`@PersistentStore. Set: ${key} = ${value ? JSON.stringify(value): value}`);
    }

    async get(key: string): Promise<any> {
        const value = await storage.get(key);
        logInfo(`@PersistentStore. Get: ${key} = ${value ? JSON.stringify(value) : value}`);
        return value;
    }

    async del(key: string): Promise<void> {
        await storage.del(key);
        logInfo(`@PersistentStore. Deleted: ${key}`);
    }
}

// Export the main classes and functions
export {
    PersistentStore
};