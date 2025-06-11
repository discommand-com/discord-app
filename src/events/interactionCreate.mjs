import log from '../log.mjs';

// Event handler for interactionCreate
export default async function (interaction) {
    log.debug('createInteraction', interaction);
    interaction.reply({
        content: 'Not Implemented',
        flags: 1 << 6 // EPHEMERAL 
    });
}
