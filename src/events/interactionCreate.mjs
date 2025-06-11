import log from '../log.mjs';

// Event handler for interactionCreate
export default async function (interaction) {
    log.debug('createInteraction', interaction);
    const handler = global.commands[interaction.commandName];
    if (handler) {
        await handler(interaction);
    }
}
