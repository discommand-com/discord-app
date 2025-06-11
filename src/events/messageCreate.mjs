import log from '../log.mjs';
import { publish } from '../rabbitmq.mjs';

// Event handler for messageCreate
export default async function (message) {
    log.debug('messageCreate', { message });
    try {
        const myId = global.client.user.id;
        log.debug('myId', { myId });
        if (message.author.id === myId) {
            log.debug('Message is from myself, skipping');
            return;
        }
        const mentionsMe = message.mentions.users.has(myId);
        log.debug('mentionsMe', { mentionsMe });
        const isReplyToMe = message.reference && message.channel && myId
            ? (await message.channel.messages.fetch(message.reference.messageId)).author.id === myId
            : false;
        log.debug('isReplyToMe', { isReplyToMe });
        let mentionsMyRole = false;
        if (message.mentions.roles.size > 0 && message.guild && message.guild.members) {
            log.debug('Checking for role mentions');
            const me = await message.guild.members.fetch(myId);
            log.debug('Fetched self member', { me });
            const myRoles = me.roles.cache;
            log.debug('myRoles', { myRoles: myRoles.map(r => r.id) });
            mentionsMyRole = message.mentions.roles.some(role => myRoles.has(role.id));
            log.debug('mentionsMyRole', { mentionsMyRole });
        }
        if (!mentionsMe && !isReplyToMe && !mentionsMyRole) {
            log.debug('Message does not mention me, reply to me, or mention my role. Skipping.');
            return;
        }
        const messages = await message.channel.messages.fetch({ limit: 100 });
        log.debug('Fetched channel messages', { count: messages.size });
        const history = messages.map(m => ({
            id: m.id,
            content: m.content,
            author: m.author?.id,
            timestamp: m.createdTimestamp
        }));
        log.debug('history', { historyCount: history.length });
        await publish('inbox', {
            rsvp: `discord_${myId}`,
            message,
            history,
        });
        log.debug('Published to inbox');
    } catch (err) {
        log.error('Failed to publish message to inbox queue', err);
    }
}
