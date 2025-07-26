const db = require('../database/db');

class ForwardLog {
  // 创建转发记录
  static create(messageId, forwardUrlId, status, responseCode, responseBody, errorMessage) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO forward_logs (message_id, forward_url_id, status, response_code, response_body, error_message) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.getDb().run(query, [
        messageId,
        forwardUrlId,
        status,
        responseCode,
        responseBody,
        errorMessage
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            message_id: messageId,
            forward_url_id: forwardUrlId,
            status,
            response_code: responseCode,
            response_body: responseBody,
            error_message: errorMessage,
            forwarded_at: new Date().toISOString()
          });
        }
      });
    });
  }

  // 获取消息的转发记录
  static getByMessageId(messageId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT fl.*, fu.name as forward_name, fu.url as forward_url
        FROM forward_logs fl
        JOIN forward_urls fu ON fl.forward_url_id = fu.id
        WHERE fl.message_id = ?
        ORDER BY fl.forwarded_at DESC
      `;
      
      db.getDb().all(query, [messageId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 获取转发地址的转发记录
  static getByForwardUrlId(forwardUrlId, limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT fl.*, m.method, m.received_at
        FROM forward_logs fl
        JOIN messages m ON fl.message_id = m.id
        WHERE fl.forward_url_id = ?
        ORDER BY fl.forwarded_at DESC
        LIMIT ? OFFSET ?
      `;
      
      db.getDb().all(query, [forwardUrlId, limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 根据ID获取转发记录
  static getById(id) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM forward_logs WHERE id = ?`;
      
      db.getDb().get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 删除转发记录
  static delete(id) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM forward_logs WHERE id = ?`;
      
      db.getDb().run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, changes: this.changes });
        }
      });
    });
  }

  // 获取转发统计信息
  static getStatsByForwardUrlId(forwardUrlId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          COUNT(*) as total_forwards,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
          MAX(forwarded_at) as last_forward_at
        FROM forward_logs 
        WHERE forward_url_id = ?
      `;
      
      db.getDb().get(query, [forwardUrlId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}

module.exports = ForwardLog;