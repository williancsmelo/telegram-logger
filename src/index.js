import moment from 'moment'
import axios from 'axios'
import FormData from 'form-data'

const METHODS = {
  LOG: 'log',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info'
}
const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file'
}
const API_URL = 'https://api.telegram.org/bot'

const printter = console

export default class TelegramLogger {
  #url
  #chatId
  #dateFormat
  #indentationSize
  #messageType
  #printConsole

  /**
   *@param {{
   *  botToken: string,
   *  chatId: string,
   *  options: {
   *    dateFormat: string,
   *    indentationSize: number,
   *    messageType: "text" | 'file',
   *    printConsole: boolean
   *  },
   *}}
   * */
  constructor({ botToken, chatId, options = {} } = {}) {
    const {
      dateFormat = 'DD/MM/YYYY',
      indentationSize = 4,
      messageType = MESSAGE_TYPES.TEXT,
      printConsole = true
    } = options
    this.#url = `${API_URL}${botToken}`
    this.#chatId = chatId
    this.#dateFormat = dateFormat
    this.#indentationSize = indentationSize
    this.#messageType = messageType
    this.#printConsole = printConsole
  }

  async #sendDocument(message, method) {
    const title = `${method.toUpperCase()}_${moment().format(
      'YYYY-MM-DD HH.mm.ss'
    )}`
    const format = 'txt'

    const doc = new FormData()
    doc.append('document', Buffer.from(message), `${title}.${format}`)
    doc.append('chat_id', this.#chatId)

    return axios.post(`${this.#url}/sendDocument`, doc, {
      headers: doc.getHeaders()
    })
  }

  async #sendText(message) {
    const query = new URLSearchParams({
      chat_id: this.#chatId,
      text: message
    })
    return axios.get(`${this.#url}/sendMessage?${query}`)
  }

  #formatMessage(message) {
    if (message instanceof Error) {
      return message.stack
    } else if (typeof message === 'object') {
      return JSON.stringify(message, null, this.#indentationSize)
    }
    return message
  }

  #createHeader(message, method) {
    const mapEmoji = {
      [METHODS.LOG]: '📝📝',
      [METHODS.INFO]: 'ℹ️ℹ️',
      [METHODS.ERROR]: '🔴🔴',
      [METHODS.WARN]: '⚠️⚠️'
    }

    let header = ''
    header += mapEmoji[method]
    header += '  '
    header += method.toUpperCase()
    header += ` at ${moment().format(this.#dateFormat)}`
    return `${header}\n\n${message}`
  }

  #sendMessage(messages, method) {
    const message = messages.map(this.#formatMessage).join('\n\n')
    const finalMessage = this.#createHeader(message, method)

    if (this.#printConsole) {
      printter[method](message)
    }

    if (this.#messageType === MESSAGE_TYPES.FILE) {
      return this.#sendDocument(finalMessage, method)
    }
    return this.#sendText(finalMessage)
  }

  log(...args) {
    return this.#sendMessage(args, METHODS.LOG)
  }
  error(...args) {
    return this.#sendMessage(args, METHODS.ERROR)
  }
  info(...args) {
    return this.#sendMessage(args, METHODS.INFO)
  }
  warn(...args) {
    return this.#sendMessage(args, METHODS.WARN)
  }
}
