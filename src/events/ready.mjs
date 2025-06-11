import log from '../log.mjs';

// Event handler for ready
export default async function (client) {
    log.info(`Logged in as ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: 'App Template', type: 4 }], status: 'online' });
}
