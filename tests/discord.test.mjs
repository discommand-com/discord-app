import { jest } from '@jest/globals';
import {
  splitMessage,
  getGuild,
  getChannel,
  handleSendMessage,
  handleSendTyping,
  handleQueueMessage,
  createAndLoginDiscordClient
} from '../src/discord.mjs';

describe('splitMessage', () => {
  it('returns empty array for empty string', () => {
    expect(splitMessage('')).toEqual([]);
  });
  it('returns single chunk if under max length', () => {
    expect(splitMessage('hello')).toEqual(['hello']);
  });
  it('splits at newline or period if possible', () => {
    const msg = 'a'.repeat(1990) + '\nmore text';
    const result = splitMessage(msg + 'x'.repeat(20));
    expect(result.length).toBe(2);
    expect(result[0].length).toBeLessThanOrEqual(2000);
  });
  it('splits at max length if no split char', () => {
    const msg = 'a'.repeat(2005);
    const result = splitMessage(msg);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(2000);
    expect(result[1].length).toBe(5);
  });
});

describe('getGuild', () => {
  it('returns guild if found', () => {
    const logger = { error: jest.fn() };
    const guild = { id: '123' };
    const client = { guilds: { cache: new Map([['123', guild]]) } };
    expect(getGuild(client, '123', logger)).toBe(guild);
    expect(logger.error).not.toHaveBeenCalled();
  });
  it('logs error and returns undefined if not found', () => {
    const logger = { error: jest.fn() };
    const client = { guilds: { cache: new Map() } };
    expect(getGuild(client, 'nope', logger)).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith('Guild not found', { guildId: 'nope' });
  });
});

describe('getChannel', () => {
  it('returns channel if found and type ok', () => {
    const logger = { error: jest.fn() };
    const channel = { id: 'c', type: 0 };
    const guild = { channels: { cache: new Map([['c', channel]]) } };
    expect(getChannel(guild, 'c', logger)).toBe(channel);
    expect(logger.error).not.toHaveBeenCalled();
  });
  it('logs error and returns null if not found or wrong type', () => {
    const logger = { error: jest.fn() };
    const guild = { channels: { cache: new Map() } };
    expect(getChannel(guild, 'nope', logger)).toBeNull();
    expect(logger.error).toHaveBeenCalled();
    const badType = { id: 'c', type: 99 };
    const guild2 = { channels: { cache: new Map([['c', badType]]) } };
    logger.error.mockClear();
    expect(getChannel(guild2, 'c', logger)).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('handleSendMessage', () => {
  it('logs error if no content', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const channel = { send: jest.fn() };
    await handleSendMessage(channel, '', logger);
    expect(logger.error).toHaveBeenCalledWith('No content provided for sendMessage');
    expect(channel.send).not.toHaveBeenCalled();
  });
  it('sends all parts and logs info', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const channel = { send: jest.fn().mockResolvedValue(), id: 'c' };
    const content = 'a'.repeat(2001);
    await handleSendMessage(channel, content, logger);
    expect(channel.send).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith('Message sent to channel', { channelId: 'c', parts: 2 });
  });
  it('logs error if send fails', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const channel = { send: jest.fn().mockRejectedValue(new Error('fail')), id: 'c' };
    await handleSendMessage(channel, 'hi', logger);
    expect(logger.error).toHaveBeenCalledWith('Failed to send message', { error: expect.any(Error) });
  });
});

describe('handleSendTyping', () => {
  it('calls sendTyping and logs info', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const channel = { sendTyping: jest.fn().mockResolvedValue(), id: 'c' };
    await handleSendTyping(channel, logger);
    expect(channel.sendTyping).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Sent typing indicator to channel', { channelId: 'c' });
  });
  it('logs error if sendTyping fails', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const channel = { sendTyping: jest.fn().mockRejectedValue(new Error('fail')), id: 'c' };
    await handleSendTyping(channel, logger);
    expect(logger.error).toHaveBeenCalledWith('Failed to send typing indicator', { error: expect.any(Error) });
  });
});

describe('handleQueueMessage', () => {
  it('logs error if message is invalid', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const client = {};
    await handleQueueMessage(client, logger, null);
    expect(logger.error).toHaveBeenCalledWith('Invalid message format received from queue', { msg: null });
  });
  it('calls correct handler for sendMessage', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const channel = { send: jest.fn().mockResolvedValue(), id: 'c', type: 0 };
    const guild = { channels: { cache: new Map([['c', channel]]) } };
    const client = { guilds: { cache: new Map([['g', guild]]) } };
    const msg = { method: 'sendMessage', guildId: 'g', channelId: 'c', content: 'hi' };
    await handleQueueMessage(client, logger, msg);
    expect(channel.send).toHaveBeenCalledWith('hi');
  });
  it('calls correct handler for sendTyping', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const channel = { sendTyping: jest.fn().mockResolvedValue(), id: 'c', type: 0 };
    const guild = { channels: { cache: new Map([['c', channel]]) } };
    const client = { guilds: { cache: new Map([['g', guild]]) } };
    const msg = { method: 'sendTyping', guildId: 'g', channelId: 'c' };
    await handleQueueMessage(client, logger, msg);
    expect(channel.sendTyping).toHaveBeenCalled();
  });
  it('logs error for unknown method', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const channel = { send: jest.fn(), id: 'c', type: 0 };
    const guild = { channels: { cache: new Map([['c', channel]]) } };
    const client = { guilds: { cache: new Map([['g', guild]]) } };
    const msg = { method: 'nope', guildId: 'g', channelId: 'c' };
    await handleQueueMessage(client, logger, msg);
    expect(logger.error).toHaveBeenCalledWith('Unknown method in message from queue', { method: 'nope' });
  });
});

describe('createAndLoginDiscordClient', () => {
  it('injects consumeFn and calls it with correct args', async () => {
    const logger = { error: jest.fn(), info: jest.fn() };
    const setupEventsFn = jest.fn().mockResolvedValue();
    const login = jest.fn().mockResolvedValue();
    const client = { login, guilds: { cache: new Map() } };
    const ClientClass = jest.fn(() => client);
    const GatewayIntentBitsObj = { Guilds: 1, GuildMessages: 2, MessageContent: 4 };
    const getAppTokenFn = jest.fn().mockResolvedValue('token');
    const consumeFn = jest.fn();
    await createAndLoginDiscordClient({
      logger,
      setupEventsFn,
      ClientClass,
      GatewayIntentBitsObj,
      partials: [],
      clientOptions: {},
      getAppTokenFn,
      consumeFn
    });
    expect(ClientClass).toHaveBeenCalled();
    expect(setupEventsFn).toHaveBeenCalledWith(client);
    expect(login).toHaveBeenCalledWith('token');
    expect(consumeFn).toHaveBeenCalled();
  });
});
