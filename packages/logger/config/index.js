const config = {
  logDirectory: './log',
  datePattern: 'YYYYMMDD',
  // maxFiles: '7d',
  enableLogFile: (process.env.NODE_ENV === 'production' || process.env.LOG_FILE === 'true')
}

module.exports = config
