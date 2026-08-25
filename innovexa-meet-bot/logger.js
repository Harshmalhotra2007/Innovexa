const winston = require("winston");

const logLevel = process.env.LOG_LEVEL || "info";

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "innovexa-meet-bot" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: false }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length > 0 && meta.service !== "innovexa-meet-bot" 
            ? ` ${JSON.stringify(meta)}` 
            : "";
          return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaString}`;
        })
      ),
    }),
  ],
});

module.exports = logger;
