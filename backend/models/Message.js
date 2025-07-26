const db = require('../database/db');

class Message {
  // 创建消息记录
  static create(callbackUrlId, method, headers, body, queryParams, ipAddress, userAgent) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO messages (callback_url_id, method, headers, body, query_params, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.getDb().run(query, [
        callbackUrlId,
        method,
        JSON.stringify(headers),
        body,
        JSON.stringify(queryParams),
        ipAddress,
        userAgent
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            callback_url_id: callbackUrlId,
            method,
            headers,
            body,
            query_params: queryParams,
            ip_address: ipAddress,
            user_agent: userAgent,
            received_at: new Date().toISOString()
          });
        }
      });
    });
  }

  // 获取Callback地址下的所有消息
  static getByCallbackUrlId(callbackUrlId, limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM messages 
        WHERE callback_url_id = ? 
        ORDER BY received_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      db.getDb().all(query, [callbackUrlId, limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 解析JSON字段
          const messages = rows.map(row => ({
            ...row,
            headers: JSON.parse(row.headers || '{}'),
            query_params: JSON.parse(row.query_params || '{}')
          }));
          resolve(messages);
        }
      });
    });
  }

  // 获取应用下的所有消息
  static getByAppId(appId, limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT m.*, cu.name as callback_name, cu.path as callback_path 
        FROM messages m
        JOIN callback_urls cu ON m.callback_url_id = cu.id
        WHERE cu.app_id = ?
        ORDER BY m.received_at DESC 
        LIMIT ? OFFSET ?
      `;
      
      db.getDb().all(query, [appId, limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // 解析JSON字段
          const messages = rows.map(row => ({
            ...row,
            headers: JSON.parse(row.headers || '{}'),
            query_params: JSON.parse(row.query_params || '{}')
          }));
          resolve(messages);
        }
      });
    });
  }

  // 根据ID获取消息
  static getById(id) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM messages WHERE id = ?`;
      
      db.getDb().get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row) {
            row.headers = JSON.parse(row.headers || '{}');
            row.query_params = JSON.parse(row.query_params || '{}');
          }
          resolve(row);
        }
      });
    });
  }

  // 删除消息
  static delete(id) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM messages WHERE id = ?`;
      
      db.getDb().run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, changes: this.changes });
        }
      });
    });
  }

  // 清空Callback地址下的所有消息
  static clearByCallbackUrlId(callbackUrlId) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM messages WHERE callback_url_id = ?`;
      
      db.getDb().run(query, [callbackUrlId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ callback_url_id: callbackUrlId, changes: this.changes });
        }
      });
    });
  }
}

module.exports = Message;