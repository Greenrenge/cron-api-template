// MQ_HOST=amqp://guest:guest@localhost:5672 TASKS=taskA,taskB
const RabbitMQInputAdapter = require("@greenrenge/adapters/input/input_adapters/mq/rabbitmq-input-adapter")
const fromPairs = require("lodash/fromPairs")

const connectInput = async (mqHost, handlers) => {
  const input = new RabbitMQInputAdapter(handlers)
  await input.setting({
    connectionString: mqHost,
    exchangeName: "unnamed_ex",
    queueName: "unnamed_queue",
    prefetch: 1,
  })
  return input
}
const REGISTERED_HANDLERS = {
  async taskA(data) {
    console.log("hi:::", data.name)
  },
}
async function main() {
  const tasks = process.env.TASKS || ""
  const input = await connectInput(process.env.MQ_HOST, {
    ...fromPairs(
      tasks.split(",").map(t => [
        t,
        async function(rawdata) {
          try {
            const handler = REGISTERED_HANDLERS[t]
            if (!handler) throw new Error("no handler to support task", t)
            await REGISTERED_HANDLERS[t](rawdata)
          } catch (err) {
            console.error("error to run task ", t, " error:: ", err)
            // TODO: retry
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
