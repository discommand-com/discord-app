import 'dotenv/config';
import log from './log.mjs';
import amqplib from 'amqplib';

const MQ_URL = process.env.MQ_HOST
    ? `amqp://${process.env.MQ_USER}:${process.env.MQ_PASS}@${process.env.MQ_HOST}/${process.env.MQ_VHOST || ''}`
    : null;

if (!MQ_URL) {
    throw new Error('RabbitMQ environment variables are not set. Please check your .env file.');
}

let connection;
let channel;

// Allow injection of amqplib and log for testability
export async function _resetRabbitMQTestState() {
    if (connection) {
        try { await connection.close(); } catch {}
        connection = undefined;
        channel = undefined;
    }
}

async function connect({ amqplibLib = amqplib } = {}) {
    if (!connection) {
        connection = await amqplibLib.connect(MQ_URL);
        channel = await connection.createChannel();
    }
    return channel;
}

export async function publish(queue, message, options = {}, { amqplibLib = amqplib, logger = log } = {}) {
    const ch = await connect({ amqplibLib });
    await ch.assertQueue(queue, { durable: true, exclusive: false, ...options });
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
    logger.debug(`Published message to queue '${queue}'`, { message });
}

export async function consume(queue, onMessage, options = {}, { amqplibLib = amqplib, logger = log } = {}) {
    const ch = await connect({ amqplibLib });
    await ch.assertQueue(queue, { durable: false, exclusive: true, ...options });
    ch.consume(queue, async (msg) => {
        if (msg !== null) {
            let content;
            try {
                content = JSON.parse(msg.content.toString());
            } catch (e) {
                content = msg.content.toString();
            }
            await onMessage(content);
            ch.ack(msg);
        }
    });
    logger.debug(`Consuming queue '${queue}'`);
}

export default { publish, consume, _resetRabbitMQTestState };
