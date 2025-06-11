import log from '../log.mjs';
import { publish } from '../rabbitmq.mjs';

// Event handler for messageCreate
export default async function (message) {
    log.debug('messageCreate', {
        messageId: message?.id ?? null,
        guildId: message?.guild?.id ?? null,
        channelId: message?.channel?.id ?? null,
        authorId: message?.author?.id ?? null
    });
    try {
        const myId = global?.client?.user?.id ?? null;
        if (!myId || message?.author?.id === myId) {
            return;
        }
        const mentionsMe = message?.mentions?.users?.has?.(myId) ?? false;
        const isReplyToMe = message?.reference && message?.channel && myId && message?.reference?.messageId
            ? ((await message.channel.messages.fetch(message.reference.messageId))?.author?.id === myId)
            : false;
        let mentionsMyRole = false;
        if ((message?.mentions?.roles?.size ?? 0) > 0 && message?.guild && message?.guild?.members) {
            const me = await message.guild.members.fetch(myId);
            const myRoles = me?.roles?.cache ?? new Map();
            mentionsMyRole = message.mentions.roles.some(role => myRoles.has(role.id));
        }
        if (!mentionsMe && !isReplyToMe && !mentionsMyRole) {
            return;
        }
        const historyMessages = await message?.channel?.messages?.fetch?.({ limit: 100 }) ?? [];
        const mainMsg = {
            messageId: message?.id ?? null,
            guildId: message?.guild?.id ?? null,
            channelId: message?.channel?.id ?? null,
            authorId: message?.author?.id ?? null,
            authorUsername: message?.author?.username ?? null,
            authorNickname: message?.member?.nickname ?? message?.author?.username ?? null,
            timestamp: message?.createdTimestamp ? new Date(message.createdTimestamp).toISOString() : null,
            content: message?.cleanContent ?? message?.content ?? null,
            mentionsMe,
            isReplyToMe,
            mentionsMyRole
        };
        const history = (historyMessages.map ? historyMessages.map(m => ({
            messageId: m?.id ?? null,
            authorId: m?.author?.id ?? null,
            authorUsername: m?.author?.username ?? null,
            authorNickname: m?.member?.nickname ?? m?.author?.username ?? null,
            timestamp: m?.createdTimestamp ? new Date(m.createdTimestamp).toISOString() : null,
            content: m?.cleanContent ?? m?.content ?? null
        })) : []);
        const authorRoles = (message?.member?.roles?.cache)
            ? Array.from(message.member.roles.cache.values()).map(role => role?.id ?? null)
            : [];
        await publish('inbox', {
            myId,
            rsvp: `discord_${myId}`,
            messageId: message?.id ?? null,
            guildId: message?.guild?.id ?? null,
            channelId: message?.channel?.id ?? null,
            authorId: message?.author?.id ?? null,
            authorUsername: message?.author?.username ?? null,
            authorNickname: message?.member?.nickname ?? message?.author?.username ?? null,
            authorRoles,
            message: mainMsg,
            history,
        });
    } catch (err) {
        log.error('Failed to publish message to inbox queue', err);
    }
}
