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
        try { await connection.close(); } catch { }
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

export async function publish(queue, type, message, options = {}, { amqplibLib = amqplib, logger = log } = {}) {
    try {
        const ch = await connect({ amqplibLib });
        await ch.assertExchange(queue, type, { ...options });
        ch.publish(queue, queue, Buffer.from(JSON.stringify(message)));
        logger.debug(`Published message to exchange '${queue}' with routing key '${queue}'`, { message: JSON.stringify(message) });
    } catch (error) {
        logger.error(`Failed to publish message to exchange '${queue}'`, { error });
        throw error;
    }
}

export async function consume(queue, type, onMessage, options = {}, { amqplibLib = amqplib, logger = log } = {}) {
    try {
        const ch = await connect({ amqplibLib });
        await ch.assertExchange(queue, type, { ...options });
        await ch.assertQueue(queue, { ...options });
        await ch.bindQueue(queue, queue, queue);
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
        logger.debug(`Consuming queue '${queue}' (bound to exchange '${queue}')`);
    } catch (error) {
        logger.error(`Failed to consume messages from queue '${queue}'`, { error });
        throw error;
    }
}

export default { publish, consume, _resetRabbitMQTestState };
