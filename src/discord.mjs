import 'dotenv/config';
import log from './log.mjs';
import setupEvents from './events.mjs';
import { Client, GatewayIntentBits } from 'discord.js';
import { getAppToken } from './db.mjs';
import { consume } from './rabbitmq.mjs';

const MAX_LENGTH = 2000; // Discord's max message length

function splitMessage(message) {
    message = (message || '').trim();
    if (message === '') return [];
    if (message.length <= MAX_LENGTH) return [message];
    const chunks = [];
    while (message.length > MAX_LENGTH) {
        let chunk = message.slice(0, MAX_LENGTH);
        let splitIndex = chunk.lastIndexOf('\n');
        if (splitIndex === -1) splitIndex = chunk.lastIndexOf('.');
        if (splitIndex === -1 || splitIndex < 1) splitIndex = MAX_LENGTH;
        else splitIndex++;
        const part = message.slice(0, splitIndex).trim();
        chunks.push(part);
        message = message.slice(splitIndex).trim();
    }
    if (message !== '') chunks.push(message);
    return chunks;
}

function getGuild(client, guildId, logger) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        logger.error('Guild not found', { guildId });
    }
    return guild;
}

function getChannel(guild, channelId, logger) {
    const channel = guild.channels.cache.get(channelId);
    if (!channel || (channel.type !== 0 && channel.type !== 5 && channel.type !== 11)) {
        logger.error('Channel not found or not a text channel', { channelId });
        return null;
    }
    return channel;
}

async function handleSendMessage(channel, content, logger) {
    if (!content) {
        logger.error('No content provided for sendMessage');
        return;
    }
    try {
        const parts = splitMessage(content);
        for (const part of parts) {
            await channel.send(part);
        }
        logger.info('Message sent to channel', { channelId: channel.id, parts: parts.length });
    } catch (err) {
        logger.error('Failed to send message', { error: err });
    }
}

async function handleSendTyping(channel, logger) {
    try {
        await channel.sendTyping();
        logger.info('Sent typing indicator to channel', { channelId: channel.id });
    } catch (err) {
        logger.error('Failed to send typing indicator', { error: err });
    }
}

async function handleQueueMessage(client, logger, msg) {
    logger.info('Received message from queue', msg);
    if (!msg || typeof msg !== 'object' || !msg.method || !msg.guildId || !msg.channelId) {
        logger.error('Invalid message format received from queue', { msg });
        return;
    }
    const guild = getGuild(client, msg.guildId, logger);
    if (!guild) return;
    const channel = getChannel(guild, msg.channelId, logger);
    if (!channel) return;
    if (msg.method === 'sendMessage') {
        await handleSendMessage(channel, msg.content, logger);
    } else if (msg.method === 'sendTyping') {
        await handleSendTyping(channel, logger);
    } else {
        logger.error('Unknown method in message from queue', { method: msg.method });
    }
}

export {
    splitMessage,
    getGuild,
    getChannel,
    handleSendMessage,
    handleSendTyping,
    handleQueueMessage
};

export const createAndLoginDiscordClient = async ({
    logger = log,
    setupEventsFn = setupEvents,
    ClientClass = Client,
    GatewayIntentBitsObj = GatewayIntentBits,
    partials = ['MESSAGE', 'CHANNEL', 'REACTION'],
    clientOptions = {},
    getAppTokenFn = getAppToken,
    consumeFn = consume // allow injection for testability
} = {}) => {
    let appId = process.env.DISCORD_CLIENT_ID;
    if (!appId) {
        appId = process.argv[2];
    }
    if (!appId) {
        throw new Error('DISCORD_CLIENT_ID env variable or first CLI argument must be set.');
    }
    const dbToken = await getAppTokenFn(appId);
    if (!dbToken) {
        throw new Error(`No token found in database for app id: ${appId}`);
    }
    const client = new ClientClass({
        intents: [
            GatewayIntentBitsObj.Guilds,
            GatewayIntentBitsObj.GuildMessages,
            GatewayIntentBitsObj.MessageContent
        ],
        partials,
        ...clientOptions
    });
    await setupEventsFn(client);
    try {
        await client.login(dbToken);
    } catch (error) {
        logger.error('Failed to login:', error);
        throw error;
    }
    const queueName = `discord_${appId}`;
    consumeFn(queueName, (msg) => handleQueueMessage(client, logger, msg), { durable: false, exclusive: true });
    return client;
};
