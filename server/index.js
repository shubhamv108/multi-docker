const keys = require('./keys');

// express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres client setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));

console.log('Creating table "values" in Postgres');
pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));


// Redis Client Setup
const redis = require('redis')
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 10000
});
const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
    res.send('Hi');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values')
    res.send(values.rows)
})

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values)
    })
})

app.post('/values', async (req, res) => {
    const index = req.body.index

    if (parseInt(index) > 40) {
        res.status(422).send('Index too high')
    }

    redisClient.hset('values', index, 'Nothing yet!')
    console.log("Publishing " + index + " to redis insert chanel")
    redisPublisher.publish('insert', index, (err, reply) => {
        if (err) {
            console.log("Error publishing to insert channel index: ", index);    
        }
        console.log("publish into insert channel ", index, " reply ", reply);
    })
    pgClient.query('INSERT INTO values (number) VALUES($1)', [ index ])
    res.send({ working: true })
})

app.listen(5000, err => {
    console.log('Listening')
})