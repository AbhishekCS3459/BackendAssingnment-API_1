import { RedisClientType, createClient } from "redis";
export class RedisClient {
  private client: RedisClientType;
  private static instance: RedisClient;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_HOST || "redis://localhost:6379",
      username: "default",
      password: process.env.REDIS_PASSWORD || "AVNS_OPtW1zSjYlWeTsDiPJI",
    });
    this.client.connect();
    this.client.on("connect", (err: any) => {
      if (err) {
        console.error(err);
      }
      console.log("Redis connected 🟢");
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async fetch(): Promise<string> {
    const response = await this.client.lPop("DATA_QUEUE");
    return response || "";
  }

  async sendQueue(message: string) {
    await this.client.rPush("DATA_QUEUE", message);
    await this.client.expire("DATA_QUEUE", 30);
  }

  async subscribe() {
    await this.client.subscribe(
      "DATA_QUEUE",
      (err: any, channelName: string) => {
        if (err) {
          console.error(err);
        }
        console.log(`Subscribed to ${channelName} channel(s)`);
      }
    );
  }
  async Cache_Value(key: string, value: string): Promise<boolean> {
    try {
      await this.client.set(key, value);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async GET(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  async MGET(key: string[]) {
    try {
      return await this.client.mGet(key);
    } catch (error) {
      console.log(error);
    }
  }
}
