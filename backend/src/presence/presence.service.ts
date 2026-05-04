import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

const ONLINE_USERS_KEY = 'presence:online';
const userSocketsKey = (userId: string) => `presence:user:${userId}:sockets`;
const SOCKET_TTL_SECONDS = 60 * 60; // 1h safety net

@Injectable()
export class PresenceService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async addSocket(userId: string, socketId: string): Promise<{ wasFirst: boolean }> {
    const setKey = userSocketsKey(userId);
    await this.redis.sadd(setKey, socketId);
    await this.redis.expire(setKey, SOCKET_TTL_SECONDS);
    const count = await this.redis.scard(setKey);
    if (count === 1) {
      await this.redis.sadd(ONLINE_USERS_KEY, userId);
      return { wasFirst: true };
    }
    return { wasFirst: false };
  }

  async removeSocket(userId: string, socketId: string): Promise<{ wasLast: boolean }> {
    const setKey = userSocketsKey(userId);
    await this.redis.srem(setKey, socketId);
    const count = await this.redis.scard(setKey);
    if (count === 0) {
      await this.redis.srem(ONLINE_USERS_KEY, userId);
      return { wasLast: true };
    }
    return { wasLast: false };
  }

  async listOnline(): Promise<string[]> {
    return this.redis.smembers(ONLINE_USERS_KEY);
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.sismember(ONLINE_USERS_KEY, userId)) === 1;
  }

  async filterOffline(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const pipeline = this.redis.pipeline();
    for (const id of userIds) pipeline.sismember(ONLINE_USERS_KEY, id);
    const results = await pipeline.exec();
    if (!results) return [...userIds];
    const offline: string[] = [];
    userIds.forEach((id, idx) => {
      const [, value] = results[idx] ?? [];
      if (value !== 1) offline.push(id);
    });
    return offline;
  }
}
