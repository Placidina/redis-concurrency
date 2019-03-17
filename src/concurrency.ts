import Redis from 'redis';
import Redlock from 'redlock';

const config: Redis.ClientOpts = {
    host: '127.0.0.1',
    port: 6379
};

const client: Redis.RedisClient = new Redis.RedisClient(config);
const redlock = new Redlock(
    // you should have one client for each independent redis node
    // or cluster
    [client],
    {
        // the expected clock drift; for more details
        // see http://redis.io/topics/distlock
        driftFactor: 0.01, // time in ms

        // the max number of times Redlock will attempt
        // to lock a resource before erroring
        retryCount: 10,

        // the time in ms between attempts
        retryDelay: 200, // time in ms

        // the max time in ms randomly added to retries
        // to improve performance under high contention
        // see https://www.awsarchitectureblog.com/2015/03/backoff.html
        retryJitter: 200 // time in ms
    }
);

// the string identifier for the resource you want to lock
const resource = 'locks:num';

// the maximum amount of time you want the resource locked in milliseconds,
// keeping in mind that you can extend the lock up until
// the point when it expires
const ttl = 1000;

redlock.on('clientError', (err: Error) => {
    console.error('A redis error has occurred:', err);
});

export class Concurrency {
    public async Run(num: Number) {
        for (let i = 0; i < num; i++) {
            await this.add();
        }
    };

    private async add() {
        await new Promise<string>((resovle, reject) => {
            redlock.lock(resource, ttl).then((lock) => {
                client.watch('num', (err: any) => {
                    if (err) {
                        console.error(err);
                        lock.unlock().catch((err: Error) => {
                            console.error(err);
                        });
                        reject(err);
                    }

                    client.get('num', (err: any, reply: string) => {
                        if (err) {
                            console.error(err);
                            lock.unlock().catch((err: Error) => {
                                console.error(err);
                            });
                            reject(err);
                        }

                        let num: number = Number(reply);
                        num++;

                        console.log(num);

                        client.multi().set('num', String(num)).exec((err: any, reply: any) => {
                            if (err) {
                                console.error(err);
                                lock.unlock().catch((err: Error) => {
                                    console.error(err);
                                });
                                reject(err);
                            }

                            lock.unlock().catch((err: Error) => {
                                console.error(err);
                            });
                            resovle(reply);
                        });
                    });
                });
            });
        });
    }
}
