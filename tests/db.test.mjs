import { jest } from '@jest/globals';
import * as dbModule from '../src/db.mjs';

describe('db.mjs', () => {
    let mockPool, mockQuery;
    const fakeToken = 'abc123';
    const fakeTitle = 'Test App';

    beforeEach(() => {
        mockQuery = jest.fn();
        mockPool = { query: mockQuery };
        dbModule._setDbPoolForTest(mockPool);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('getAppToken returns token if found', async () => {
        mockQuery.mockResolvedValueOnce([[{ token: fakeToken }]]);
        const token = await dbModule.getAppToken('1');
        expect(token).toBe(fakeToken);
        expect(mockQuery).toHaveBeenCalledWith('SELECT token FROM apps WHERE id = ?', ['1']);
    });

    it('getAppToken returns null if not found', async () => {
        mockQuery.mockResolvedValueOnce([[]]);
        const token = await dbModule.getAppToken('2');
        expect(token).toBeNull();
    });

    it('getAppTitle returns title if found', async () => {
        mockQuery.mockResolvedValueOnce([[{ title: fakeTitle }]]);
        const title = await dbModule.getAppTitle('1');
        expect(title).toBe(fakeTitle);
        expect(mockQuery).toHaveBeenCalledWith('SELECT title FROM apps WHERE id = ?', ['1']);
    });

    it('getAppTitle returns null if not found', async () => {
        mockQuery.mockResolvedValueOnce([[]]);
        const title = await dbModule.getAppTitle('2');
        expect(title).toBeNull();
    });
});
