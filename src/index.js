import moment from "moment";
import axios from "axios";
import FormData from "form-data";

const METHODS = {
  LOG: "log",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
};
const MESSAGE_TYPES = {
  TEXT: "text",
  FILE: "file",
};
const API_URL = "https://api.telegram.org/bot";

class TelegramLogger {
  #url;
  #chatId;

  /**
   *@param {{
   *  botToken: string,
   *  chatId: string,
   *  options: {
   *    dateFormat: string,
   *    indentationSize: number,
   *    messageType: "text" | 'file',
   *  },
   *}}
   * */
  constructor({ botToken, chatId, options = {} } = {}) {
    const {
      dateFormat = "DD/MM/YYYY",
      indentationSize = 4,
      messageType = MESSAGE_TYPES.TEXT,
    } = options;
    this.#url = `${API_URL}${botToken}`;
    this.#chatId = chatId;
    this.dateFormat = dateFormat;
    this.indentationSize = indentationSize;
    this.messageType = messageType;
  }

  /** @param {FormData | Buffer | string} doc */
  async #sendDocument(message, method) {
    const title = `${method.toUpperCase()}_${moment().format("DD_MM_YYYY")}`;
    const format = "txt";

    const doc = new FormData();
    doc.append("document", Buffer.from(message), `${title}.${format}`);
    doc.append("chat_id", this.#chatId);

    return axios.post(`${this.#url}/sendDocument`, doc, {
      headers: doc.getHeaders(),
    });
  }

  async sendMessage(message, method) {
    if (this.messageType === MESSAGE_TYPES.FILE) {
      return this.#sendDocument(message, method);
    }

    const query = new URLSearchParams({
      chat_id: this.#chatId,
      text: message,
    });
    return axios.get(`${this.#url}/sendMessage?${query}`);
  }

  formatMessage(message) {
    if (message instanceof Error) {
      return message.stack;
    } else if (typeof message === "object") {
      return JSON.stringify(message, null, this.indentationSize);
    }
    return message;
  }

  createHeader(message, method) {
    const mapEmoji = {
      [METHODS.LOG]: "📝📝",
      [METHODS.INFO]: "ℹ️ℹ️",
      [METHODS.ERROR]: "🔴🔴",
      [METHODS.WARN]: "⚠️⚠️",
    };

    let header = "";
    header += mapEmoji[method];
    header += "  ";
    header += method.toUpperCase();
    header += ` at ${moment().format(this.dateFormat)}`;
    return `${header}\n\n${message}`;
  }

  log(...args) {}
  error(...args) {}
  info(...args) {}
  warn(...args) {}
}

Object.values(METHODS).forEach((method) => {
  TelegramLogger.prototype[method] = async function (...messages) {
    messages = messages.map(this.formatMessage);
    const message = this.createHeader(messages.join("\n\n"), method);
    return this.sendMessage(message, method).catch(console.log);
  };
});

export default TelegramLogger;
