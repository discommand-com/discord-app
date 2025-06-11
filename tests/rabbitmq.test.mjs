import { jest } from '@jest/globals';
import * as rabbitmq from '../src/rabbitmq.mjs';

describe('rabbitmq.mjs', () => {
    let mockChannel, mockConnection, mockAmqplib, mockLogger;

    beforeEach(() => {
        mockChannel = {
            assertQueue: jest.fn().mockResolvedValue({}),
            sendToQueue: jest.fn(),
            consume: jest.fn((queue, cb) => { mockChannel._consumeCb = cb; }),
            ack: jest.fn()
        };
        mockConnection = {
            createChannel: jest.fn().mockResolvedValue(mockChannel),
            close: jest.fn().mockResolvedValue()
        };
        mockAmqplib = {
            connect: jest.fn().mockResolvedValue(mockConnection)
        };
        mockLogger = {
            debug: jest.fn(),
            error: jest.fn()
        };
    });

    afterEach(async () => {
        await rabbitmq._resetRabbitMQTestState();
        jest.clearAllMocks();
    });

    it('publish calls assertQueue and sendToQueue with correct args', async () => {
        await rabbitmq.publish('testq', { foo: 'bar' }, {}, { amqplibLib: mockAmqplib, logger: mockLogger });
        expect(mockChannel.assertQueue).toHaveBeenCalledWith('testq', expect.objectContaining({ durable: true, exclusive: false }));
        expect(mockChannel.sendToQueue).toHaveBeenCalledWith('testq', Buffer.from(JSON.stringify({ foo: 'bar' })));
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Published message'), expect.any(Object));
    });

    it('consume calls assertQueue and sets up consumer, calls onMessage and ack', async () => {
        const onMessage = jest.fn();
        await rabbitmq.consume('testq', onMessage, {}, { amqplibLib: mockAmqplib, logger: mockLogger });
        expect(mockChannel.assertQueue).toHaveBeenCalledWith('testq', expect.objectContaining({ durable: false, exclusive: true }));
        expect(mockChannel.consume).toHaveBeenCalledWith('testq', expect.any(Function));
        // Simulate a message
        const msg = { content: Buffer.from(JSON.stringify({ hello: 'world' })) };
        await mockChannel._consumeCb(msg);
        expect(onMessage).toHaveBeenCalledWith({ hello: 'world' });
        expect(mockChannel.ack).toHaveBeenCalledWith(msg);
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Consuming queue'),);
    });

    it('consume handles invalid JSON gracefully', async () => {
        const onMessage = jest.fn();
        await rabbitmq.consume('testq', onMessage, {}, { amqplibLib: mockAmqplib, logger: mockLogger });
        const msg = { content: Buffer.from('notjson') };
        await mockChannel._consumeCb(msg);
        expect(onMessage).toHaveBeenCalledWith('notjson');
        expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });
});
