import fs from "fs";
import { Consumer, Kafka, Message } from "kafkajs";
import path from "path";
export class KafkaConsumerService {
  private kafka: Kafka;

  private consumer: Consumer;
  private static instance: KafkaConsumerService;
  public clientId: string;

  private constructor(clientId: string) {
    this.clientId = clientId;
    const KAFKA_HOST = process.env.KAFKA_HOST || "YOUR AIVEN KAFKA HOST";

    this.kafka = new Kafka({
      brokers: [KAFKA_HOST],
      ssl: {
        ca: [fs.readFileSync(path.resolve("./ca.pem"), "utf-8")],
      },
      sasl: {
        //@ts-ignore
        username: process.env.KAFKA_USERNAME || "YOUR AIVEN KAFKA USERNAME",
        password: process.env.KAFKA_PASSWORD || "YOUR AIVEN KAFKA PASSWORD",
        mechanism: "plain",
      },
    });

    this.consumer = this.kafka.consumer({ groupId: "DATA_QUEUE" });

    this.consumer.connect();

    this.consumer.on("consumer.connect", async () => {
      console.log("Kafka Consumer connected 🟢");
    });
  }

  public static getKafkaInstance(clientId: string): KafkaConsumerService {
    if (!KafkaConsumerService.instance) {
      KafkaConsumerService.instance = new KafkaConsumerService(clientId);
    }
    return KafkaConsumerService.instance;
  }

  async Kafkaconnect() {
    await this.consumer.connect();
  }

  async Kafkadisconnect() {
    await this.consumer.disconnect();
  }

  async consumeKafka(topic: string, callback: (message: Message) => void) {
    await this.consumer.subscribe({ topic, fromBeginning: true });

    await this.consumer.run({
      //@ts-ignore
      eachMessage: async ({ message }: { message: { value: string } }) => {
        console.log(`Received message: ${message.value}`);

        callback(message);
      },
    });
  }
}
