const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 10000
});
const subscriber = redisClient.duplicate();

function fib(index) {
    if (index < 2) return 1;
    return fib(index - 1) + fib(index - 2);
}

subscriber.on('message', (channel, message) => {
    console.log('setting index fib in redis set values for index', message);
    redisClient.hset('values', message, fib(parseInt(message)));
});

subscriber.subscribe('insert');