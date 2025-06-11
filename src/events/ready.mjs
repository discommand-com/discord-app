import log from '../log.mjs';
import { getAppTitle } from '../db.mjs';

// Event handler for ready
export default async function (client) {
    log.info(`Logged in as ${client.user.tag}`);
    const title = await getAppTitle(client.user.id);
    client.user.setPresence({
        activities: title ? [{ name: title, type: 4 }] : [],
        status: 'online'
    });
}