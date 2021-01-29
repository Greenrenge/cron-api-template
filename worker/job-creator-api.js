// MONGO_HOST=mongodb://localhost:27024/agenda PORT=3000
const Scheduler = require("@greenrenge/adapters/lib/agenda/agenda-scheduler.lib")
const Agenda = require("agenda")
const { MongoClient } = require("mongodb")
const xprs = require("xprs")

const app = xprs()

const createAgenda = async connStr => {
  const connection = await MongoClient.connect(connStr)
  const db = await connection.db()
  const agenda = new Agenda({
    mongo: db,
    db: {
      collection: "agenda",
    },
    ssl: true,
    defaultLockLifetime: 15000,
  })
  return agenda
}

async function main() {
  const connStr = process.env.MONGO_HOST
  const agenda = await createAgenda(connStr)
  await agenda.start()
  const scheduler = new Scheduler(agenda)

  app.delete("/:jobType/:id/", async (req, res, next) => {
    const { jobType, id } = req.params
    await scheduler.cancelJob({
      key: { id: `${jobType}_${id}` },
    })
    res.send(200)
  })
  // TODO: retrigger end point

  app.post("/:jobType/:id", async (req, res, next) => {
    try {
      const { jobType, id } = req.params
      const { data, interval } = req.body
      if (!jobType || !id || !data || !interval)
        return res.status(400).send({
          success: false,
          message: "jobType id data interval is all required",
        })
      const saved = await scheduler.startJob({
        jobName: jobType,
        key: { id: `${jobType}_${id}` },
        interval,
        data,
      })
      return res.status(201).send({
        success: true,
        data: saved,
      })
    } catch (err) {
      return res.status(500).send({
        success: false,
        message: "an error occurred ",
      })
    }
  })

  app.listen(process.env.PORT, () =>
    console.info("started on ", process.env.PORT),
  )
}

main().catch(err => {
  console.error(err.toString())
  process.exit(1)
})
