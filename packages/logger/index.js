const { Logger } = require('./winston')
const _config = require('./config')

function getLog ({
  logDirectory = './log',
  datePattern = 'YYYYMMDD',
  maxFiles = undefined,
  enableLogFile = undefined
}) {
  let winston
  let initialDebug
  const skips = []
  const names = []
  /**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 */
  function init (namespaces) {
    const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/)
    const len = split.length

    for (var i = 0; i < len; i++) {
      if (!split[i]) continue // ignore empty strings
      namespaces = split[i].replace(/\*/g, '.*?')
      if (namespaces[0] === '-') {
        skips.push(new RegExp('^' + namespaces.substr(1) + '$'))
      } else {
        names.push(new RegExp('^' + namespaces + '$'))
      }
    }
    return true
  }
  /**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 */

  function isEnabled (name) {
    let i, len
    for (i = 0, len = skips.length; i < len; i++) {
      if (skips[i].test(name)) {
        return false
      }
    }
    for (i = 0, len = names.length; i < len; i++) {
      if (names[i].test(name)) {
        return true
      }
    }
    return false
  }

  const createLogWithNamespace = (name, debugEnable = undefined) => {
    // if debug has been set, we will filter namespaces for debugging
    if (initialDebug === undefined && process.env.DEBUG) {
      init(process.env.DEBUG)
    }

    winston = winston || new Logger({
      logDirectory,
      datePattern,
      maxFiles,
      enableLogFile: enableLogFile !== undefined ? enableLogFile : (['production'].includes(process.env.NODE_ENV) || ['true', true].includes(process.env.LOG_FILE))
    })

    const template = `[${name}]`
    const log = (level, ...msgs) => {
      try {
        winston.log(level, `${template} : `, ...msgs)
      } catch (err) {
        console.error(`init-logger : cannot log ${JSON.stringify(err)} `)
      }
    }

    const wrapCall = (call, ...msgs) => {
      try {
        call(`${template} : `, ...msgs)
      } catch (err) {
        console.error(`init-logger : cannot log ${JSON.stringify(err)} `)
      }
    }

    // debug loging level will be appended based on configuration , use same env as debug use(DEBUG=*)
    let debug
    if (!isEnabled(name) && !debugEnable) {
      debug = (...msgs) => {}
    } else {
      debug = (...msgs) => wrapCall(winston.debug.bind(winston), ...msgs)
    }

    return {
      log,
      // silly: (...msgs) => wrapCall(winston.silly.bind(winston), ...msgs),
      debug, // depend on filter
      verbose: (...msgs) => wrapCall(winston.verbose.bind(winston), ...msgs),
      info: (...msgs) => wrapCall(winston.info.bind(winston), ...msgs),
      warn: (...msgs) => wrapCall(winston.warn.bind(winston), ...msgs),
      error: (...msgs) => wrapCall(winston.error.bind(winston), ...msgs)
    }
  }

  createLogWithNamespace.getLog = getLog
  return createLogWithNamespace
}

module.exports = getLog({
  ..._config,
  enableLogFile: undefined// for later evaluate
})

module.exports.getLog = getLog
