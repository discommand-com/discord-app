import 'dotenv/config';
import log from './log.mjs';
import setupEvents from './events.mjs';
import { Client, GatewayIntentBits } from 'discord.js';
import { getAppToken } from './db.mjs';
import { consume } from './rabbitmq.mjs';

/**
 * Creates and logs in a Discord client, allowing dependency injection for testability.
 * @param {Object} options
 * @param {Object} [options.logger] - Logger instance
 * @param {Function} [options.setupEventsFn] - Function to set up events
 * @param {Function} [options.ClientClass] - Discord client class
 * @param {Object} [options.GatewayIntentBitsObj] - Gateway intent bits
 * @param {Array} [options.partials] - Array of partials
 * @param {Object} [options.clientOptions] - Additional options for Discord client
 * @param {Function} [options.getAppTokenFn] - Function to get app token by app id (for testability)
 * @returns {Promise<Object>} Discord client instance
 */
export const createAndLoginDiscordClient = async ({
    logger = log,
    setupEventsFn = setupEvents,
    ClientClass = Client,
    GatewayIntentBitsObj = GatewayIntentBits,
    partials = ['MESSAGE', 'CHANNEL', 'REACTION'],
    clientOptions = {},
    getAppTokenFn = getAppToken // allow injection for testability
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
    // Start consuming from 'discord_<client_id>' queue (transient, exclusive)
    const queueName = `discord_${appId}`;
    consume(queueName, async (msg) => {
        logger.info(`Received message from queue '${queueName}':`, msg);
    }, { durable: false, exclusive: true });
    return client;
};
