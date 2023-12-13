import _ from 'lodash'
import axios from 'axios'
import { timeStamp } from '../utils/Helpers.mjs'

class Health {
  constructor(config, opts) {
    const { address, uuid, name, apiKey, timeout, gracePeriod, type } = config || {}
    const { dryRun, networkName } = opts || {}
    this.type = type || 'healthchecks';
    this.address = type === 'betterstack' ? 
      (address || 'https://uptime.betterstack.com/api/v1/heartbeat') : 
      (address || 'https://hc-ping.com')
    this.name = name || networkName
    this.gracePeriod = gracePeriod || 86400   // default 24 hours
    this.timeout = timeout || 86400           // default 24 hours
    this.uuid = uuid
    this.apiKey = apiKey
    this.dryRun = dryRun
    this.logs = []

    if (this.type === 'healthchecks') {
      this.getOrCreateHealthCheck()
    }
    
    if (address && this.type === 'healthchecks') {
      // This is necessary as the default provider - hc-ping.com - has a built in ping mechanism
      // whereas providing self-hosted addresses do NOT. 
      // https://healthchecks.selfhosted.com/ping/{uuid} rather than https://hc-ping.com/{uuid}
      this.address = this.address + "/ping"
    }
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

  async getOrCreateHealthCheck(...args) {
    if (this.apiKey && this.type === 'healthchecks') {
      let config = {
        headers: {
          "X-Api-Key": this.apiKey,
        }
      }

      let data = {
        "name": this.name, "channels": "*", "timeout": this.timeout, "grace": this.gracePeriod, "unique": ["name"]
      }

      try {
        await axios.post([this.address, 'api/v2/checks/'].join('/'), data, config).then((res) => {
          this.uuid = res.data.ping_url.split('/')[4]
        });
      } catch (error) {
        timeStamp("Health Check creation failed: " + error)
      }
    }
  }

  async sendLog() {
    await this.ping('log', this.logs.join("\n"))
    this.logs = []
  }

  async ping(action, logs) {
    if (!this.uuid) return
    if (this.dryRun) return timeStamp('DRYRUN: Skipping health check ping')

    let url = '';
    if (this.type === 'betterstack') {
      url = [this.address, this.uuid].join('/')
    } else {
      url = _.compact([this.address, this.uuid, action]).join('/')
    }

    return axios.request({
      method: 'POST',
      url : url, 
      data: logs.join("\n")
    }).catch(error => {
      timeStamp('Health ping failed', error.message)
    })
  }
}

export default Health