import log from '../log.mjs';

// Event handler for messageCreate
export default async function (message) {
    log.debug('messageCreate', { message });
    if (message.author.bot) return;
    if (message.content === '!ping') {
        message.reply('Pong!');
    }
}
