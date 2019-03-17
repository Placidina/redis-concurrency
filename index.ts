import * as cluster from 'cluster';
import { cpus } from 'os';
import Redis from 'redis';
import { Concurrency } from './src/concurrency';

async function RedisConcurrency() {
    if (cluster.isMaster) {
        console.log('Master process is running');

        const config: Redis.ClientOpts = {
            host: '127.0.0.1',
            port: 6379
        };

        const client: Redis.RedisClient = new Redis.RedisClient(config);
        client.set('num', '0');

        for (let i = 0; i < cpus().length; i++) {
            cluster.fork();
        }
    } else {
        await new Concurrency().Run(5);
    }
}


Promise.all([
    RedisConcurrency()
]).catch(err => {
    console.error(err);
});