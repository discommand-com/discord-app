import log from '../log.mjs';
import { publish } from '../rabbitmq.mjs';

// Event handler for messageCreate
export default async function (message) {
    log.debug('messageCreate', { message });
    try {
        const myId = global.client.user.id;
        if (message.author.id === myId) {
            return;
        }
        const mentionsMe = message.mentions.users.has(myId);
        const isReplyToMe = message.reference && message.channel && myId
            ? (await message.channel.messages.fetch(message.reference.messageId)).author.id === myId
            : false;
        let mentionsMyRole = false;
        if (message.mentions.roles.size > 0 && message.guild && message.guild.members) {
            const me = await message.guild.members.fetch(myId);
            const myRoles = me.roles.cache;
            mentionsMyRole = message.mentions.roles.some(role => myRoles.has(role.id));
        }
        if (!mentionsMe && !isReplyToMe && !mentionsMyRole) {
            return;
        }
        const historyMessages = await message.channel.messages.fetch({ limit: 100 });
        const history = historyMessages.map(m => ({
            id: m.id,
            content: m.cleanContent,
            author: m.author?.id,
            timestamp: m.createdTimestamp
        }));
        const authorRoles = (message.member && message.member.roles)
            ? message.member.roles.cache.map(role => role.id)
            : [];
        await publish('inbox', {
            rsvp: `discord_${myId}`,
            authorRoles,
            message,
            history,
        });
    } catch (err) {
        log.error('Failed to publish message to inbox queue', err);
    }
}
