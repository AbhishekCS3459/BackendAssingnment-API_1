import fs from "fs";
import { Kafka, Producer, Partitioners } from "kafkajs";
import path from "path";
export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private static instance: KafkaProducer;
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
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      createPartitioner: Partitioners.LegacyPartitioner,
    });

    this.producer.connect();
    this.producer.on("producer.connect", async () => {
      console.log("Kafka Producer connected 🟢");
    });
  }

  public static getKafkaInstance(clientId: string): KafkaProducer {
    if (!KafkaProducer.instance) {
      KafkaProducer.instance = new KafkaProducer(clientId);
    }
    return KafkaProducer.instance;
  }

  async Kafkaconnect() {
    await this.producer.connect();
  }

  async Kafkadisconnect() {
    await this.producer.disconnect();
  }

  async ProduceKafka(topic: string, message: string) {
    await this.producer.send({
      topic,
      messages: [{ value: message }],
    });
    console.log("Sent message: " + message);
  }
}
