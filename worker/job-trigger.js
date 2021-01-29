// MONGO_HOST=mongodb://localhost:27024/agenda MQ_HOST=amqp://guest:guest@localhost:5672 TASKS=taskA,taskB
const SchedulerInputAdapter = require("@greenrenge/adapters/input/input_adapters/agenda/agenda-input-adapter")
const RabbitMQOutputAdapter = require("@greenrenge/adapters/output/output_adapters/mq/rabbitmq-output-adapter")
const fromPairs = require("lodash/fromPairs")

const connectInput = async (connStr, handlers) => {
  const input = new SchedulerInputAdapter(handlers)
  await input.setting({
    db: connStr,
    collectionName: "agenda",
  })
  return input
}
const connectOutput = async mqHost => {
  const output = new RabbitMQOutputAdapter()
  await output.setting({
    connectionString: mqHost,
    exchangeName: "unnamed_ex",
    queueName: "unnamed_queue",
  })
  return output
}

async function main() {
  const connStr = process.env.MONGO_HOST
  const tasks = process.env.TASKS || ""
  const output = await connectOutput(process.env.MQ_HOST)
  await output.connect()
  const input = await connectInput(connStr, {
    ...fromPairs(
      tasks.split(",").map(t => [
        t,
        async function(rawdata, { job }) {
          try {
            await output.publish({
              channel: t,
              data: rawdata,
              persist: true,
            })
          } catch (err) {
            console.error("cannot push data to queue", err)
            job.fail(err)
            await job.save()
          }
        },
      ]),
    ),
  })
  await input.connect()
}

main().catch(err => {
  console.error(err.toString())
  process.exit(1)
})
