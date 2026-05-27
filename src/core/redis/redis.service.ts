import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis

  onModuleInit() {
    const host = process.env.REDIS_HOST || 'localhost'
    const port = parseInt(process.env.REDIS_PORT || '6379', 10)

    this.redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: 3,
    })

    this.redisClient.on('error', err => {
      console.error('Redis connection error:', err)
    })
  }

  async onModuleDestroy() {
    await this.redisClient.quit()
  }

  getClient(): Redis {
    return this.redisClient
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds) {
      return this.redisClient.set(key, value, 'EX', ttlSeconds)
    }
    return this.redisClient.set(key, value)
  }

  async del(key: string): Promise<number> {
    return this.redisClient.del(key)
  }

  async exists(key: string): Promise<number> {
    return this.redisClient.exists(key)
  }
}
