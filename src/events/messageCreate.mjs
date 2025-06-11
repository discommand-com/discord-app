import log from '../log.mjs';
import { publish } from '../rabbitmq.mjs';

// Event handler for messageCreate
export default async function (message) {
    log.debug('messageCreate', { message });
    try {
        await publish('inbox', {
            id: message.id,
            content: message.content,
            author: message.author?.id,
            channel: message.channel?.id,
            timestamp: message.createdTimestamp
        });
    } catch (err) {
        log.error('Failed to publish message to inbox queue', err);
    }
}
