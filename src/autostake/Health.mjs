import _ from 'lodash'
import axios from 'axios'
import { timeStamp } from '../utils/Helpers.mjs'

class Health {
  constructor(config, opts) {
    const { address, uuid, name, apiKey, timeout, gracePeriod } = config || {}
    const { dryRun, networkName } = opts || {}

    this.address = address || 'https://uptime.betterstack.com/api/v1/heartbeat';
    this.name = name || networkName
    this.gracePeriod = gracePeriod || 86400   // default 24 hours
    this.timeout = timeout || 86400           // default 24 hours
    this.uuid = uuid
    this.apiKey = apiKey
    this.dryRun = dryRun
    this.logs = []
  }

  started(...args) {
    timeStamp(...args)
    if (this.uuid) timeStamp('Starting health', [this.address, this.uuid].join('/'))
    return this.ping('start', [args.join(' ')])
  }

  success(...args) {
    timeStamp(...args)
    return this.ping(undefined, [...this.logs, args.join(' ')])
  }

  failed(...args) {
    timeStamp(...args)
    return this.ping('fail', [...this.logs, args.join(' ')])
  }

  log(...args) {
    timeStamp(...args)
    this.logs = [...this.logs, args.join(' ')]
  }

  addLogs(logs) {
    this.logs = this.logs.concat(logs)
  }

  async sendLog() {
    await this.ping('log', this.logs.join("\n"))
    this.logs = []
  }

  async ping(action, logs) {
    if (!this.uuid) return
    if (this.dryRun) return timeStamp('DRYRUN: Skipping health check ping')

    let url = [this.address, this.uuid].join('/')
    let logsData = Array.isArray(logs) ? logs.join('\n') : logs;

    return axios.request({
      method: 'POST',
      url : url, 
      data: logsData
    }).catch(error => {
      timeStamp('Health ping failed', error.message)
    })
  }
}

export default Health
