import log from '../log.mjs';
import { getAppPresence } from '../db.mjs';

// Event handler for ready
export default async function (client) {
    log.info(`Logged in as ${client.user.tag}`);
    const dbPresence = await getAppPresence(client.user.id);
    client.user.setPresence({
        activities: dbPresence ? [{ name: dbPresence, type: 4 }] : [],
        status: 'online'
    });
}