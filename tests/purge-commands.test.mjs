import { jest } from '@jest/globals';
import { purgeCommands } from '../src/purge-commands.mjs';

describe('purgeCommands', () => {
    let mockRest, mockRoutes, mockLogger;
    const token = 'test-token';
    const clientId = 'test-client-id';
    const guildId = 'test-guild-id';

    beforeEach(() => {
        mockRest = jest.fn().mockImplementation(() => ({
            setToken: jest.fn().mockReturnThis(),
            put: jest.fn().mockResolvedValue({})
        }));
        mockRoutes = {
            applicationCommands: jest.fn().mockReturnValue('global-cmd-url'),
            applicationGuildCommands: jest.fn().mockReturnValue('guild-cmd-url')
        };
        mockLogger = {
            info: jest.fn(),
            error: jest.fn()
        };
    });

    it('purges only global commands if no guildId is provided', async () => {
        await purgeCommands({
            token,
            clientId,
            restClass: mockRest,
            routes: mockRoutes,
            logger: mockLogger
        });
        expect(mockRoutes.applicationCommands).toHaveBeenCalledWith(clientId);
        expect(mockRoutes.applicationGuildCommands).not.toHaveBeenCalled();
        const restInstance = mockRest.mock.results[0].value;
        expect(restInstance.put).toHaveBeenCalledWith('global-cmd-url', { body: [] });
        expect(mockLogger.info).toHaveBeenCalledWith('All global application commands purged.');
    });

    it('purges global and guild commands if guildId is provided', async () => {
        await purgeCommands({
            token,
            clientId,
            guildId,
            restClass: mockRest,
            routes: mockRoutes,
            logger: mockLogger
        });
        expect(mockRoutes.applicationCommands).toHaveBeenCalledWith(clientId);
        expect(mockRoutes.applicationGuildCommands).toHaveBeenCalledWith(clientId, guildId);
        const restInstance = mockRest.mock.results[0].value;
        expect(restInstance.put).toHaveBeenCalledWith('global-cmd-url', { body: [] });
        expect(restInstance.put).toHaveBeenCalledWith('guild-cmd-url', { body: [] });
        expect(mockLogger.info).toHaveBeenCalledWith('All global application commands purged.');
        expect(mockLogger.info).toHaveBeenCalledWith(`All application commands purged for guild ${guildId}.`);
    });

    it('throws and logs error if missing credentials', async () => {
        await expect(purgeCommands({
            token: '',
            clientId: '',
            restClass: mockRest,
            routes: mockRoutes,
            logger: mockLogger
        })).rejects.toThrow('Missing credentials');
        expect(mockLogger.error).toHaveBeenCalledWith('Token and clientId must be provided.');
    });
});
