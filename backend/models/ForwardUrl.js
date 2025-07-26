const db = require('../database/db');

class ForwardUrl {
  // 创建转发地址
  static create(callbackUrlId, name, url) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO forward_urls (callback_url_id, name, url, enabled) VALUES (?, ?, ?, 1)`;
      
      db.getDb().run(query, [callbackUrlId, name, url], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            callback_url_id: callbackUrlId,
            name,
            url,
            enabled: true,
            created_at: new Date().toISOString()
          });
        }
      });
    });
  }

  // 获取Callback地址下的所有转发地址
  static getByCallbackUrlId(callbackUrlId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM forward_urls WHERE callback_url_id = ? ORDER BY created_at DESC`;
      
      db.getDb().all(query, [callbackUrlId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 获取启用状态的转发地址
  static getEnabledByCallbackUrlId(callbackUrlId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM forward_urls WHERE callback_url_id = ? AND enabled = 1 ORDER BY created_at DESC`;
      
      db.getDb().all(query, [callbackUrlId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 根据ID获取转发地址
  static getById(id) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM forward_urls WHERE id = ?`;
      
      db.getDb().get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 更新转发地址
  static update(id, name, url, enabled) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE forward_urls SET name = ?, url = ?, enabled = ? WHERE id = ?`;
      
      db.getDb().run(query, [name, url, enabled ? 1 : 0, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, name, url, enabled, changes: this.changes });
        }
      });
    });
  }

  // 更新启用状态
  static updateEnabled(id, enabled) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE forward_urls SET enabled = ? WHERE id = ?`;
      
      db.getDb().run(query, [enabled ? 1 : 0, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, enabled, changes: this.changes });
        }
      });
    });
  }

  // 删除转发地址
  static delete(id) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM forward_urls WHERE id = ?`;
      
      db.getDb().run(query, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, changes: this.changes });
        }
      });
    });
  }
}

module.exports = ForwardUrl;