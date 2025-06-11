import 'dotenv/config';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord.js';
import log from './log.mjs';
import { getAppToken } from './db.mjs';

/**
 * Purges all global and (optionally) guild-specific application commands.
 * @param {Object} options
 * @param {string} options.token - Discord bot token
 * @param {string} options.clientId - Discord client ID
 * @param {string|null} [options.guildId] - Guild ID to purge (optional)
 * @param {Object} [options.restClass=REST] - REST class
 * @param {Object} [options.routes=Routes] - Discord.js Routes
 * @param {Object} [options.logger=log] - Logger instance
 * @returns {Promise<void>}
 */
export async function purgeCommands({
    token,
    clientId,
    guildId = null,
    restClass = REST,
    routes = Routes,
    logger = log
}) {
    if (!token || !clientId) {
        logger.error('Token and clientId must be provided.');
        throw new Error('Missing credentials');
    }
    const rest = new restClass({ version: '10' }).setToken(token);
    // Purge all global application commands
    await rest.put(routes.applicationCommands(clientId), { body: [] });
    logger.info('All global application commands purged.');
    if (guildId) {
        await rest.put(routes.applicationGuildCommands(clientId, guildId), { body: [] });
        logger.info(`All application commands purged for guild ${guildId}.`);
    }
}

// CLI usage
if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        let clientId = process.env.DISCORD_CLIENT_ID || process.argv[2];
        if (!clientId) {
            log.error('DISCORD_CLIENT_ID env variable or first CLI argument must be set.');
            process.exit(1);
        }
        const token = await getAppToken(clientId);
        if (!token) {
            log.error(`No token found in database for app id: ${clientId}`);
            process.exit(1);
        }
        const guildId = process.env.PURGE_GUILD_ID || null;
        try {
            await purgeCommands({ token, clientId, guildId });
        } catch (err) {
            log.error(err);
            process.exit(1);
        }
    })();
}
