const db = require('../database/db');

class CallbackUrl {
  // 创建Callback地址
  static create(appId, name, path) {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO callback_urls (app_id, name, path, auto_forward) VALUES (?, ?, ?, 0)`;
      
      db.getDb().run(query, [appId, name, path], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            app_id: appId,
            name,
            path,
            auto_forward: false,
            created_at: new Date().toISOString()
          });
        }
      });
    });
  }

  // 获取应用下的所有Callback地址
  static getByAppId(appId) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM callback_urls WHERE app_id = ? ORDER BY created_at DESC`;
      
      db.getDb().all(query, [appId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 根据ID获取Callback地址
  static getById(id) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM callback_urls WHERE id = ?`;
      
      db.getDb().get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 根据应用根路径和回调路径获取Callback地址
  static getByPath(appRootPath, callbackPath) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT cu.*, a.root_path 
        FROM callback_urls cu 
        JOIN applications a ON cu.app_id = a.id 
        WHERE a.root_path = ? AND cu.path = ?
      `;
      
      db.getDb().get(query, [appRootPath, callbackPath], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 更新Callback地址
  static update(id, name, path, autoForward, responseConfig = null) {
    return new Promise((resolve, reject) => {
      let query, params;
      
      console.log('CallbackUrl.update参数:', { id, name, path, autoForward, responseConfig });
      
      if (responseConfig) {
        query = `UPDATE callback_urls SET name = ?, path = ?, auto_forward = ?, response_status = ?, response_headers = ?, response_body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        params = [
          name, 
          path, 
          autoForward ? 1 : 0, 
          responseConfig.status || 200,
          JSON.stringify(responseConfig.headers || {"Content-Type": "application/json"}),
          responseConfig.body || '{"success": true, "message": "Callback接收成功"}',
          id
        ];
      } else {
        query = `UPDATE callback_urls SET name = ?, path = ?, auto_forward = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        params = [name, path, autoForward ? 1 : 0, id];
      }
      
      console.log('执行SQL:', query);
      console.log('SQL参数:', params);
      
      db.getDb().run(query, params, function(err) {
        if (err) {
          console.error('SQL执行错误:', err);
          reject(err);
        } else {
          console.log('SQL执行成功，changes:', this.changes);
          resolve({ id, name, path, auto_forward: autoForward, changes: this.changes });
        }
      });
    });
  }

  // 更新自动转发状态
  static updateAutoForward(id, autoForward) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE callback_urls SET auto_forward = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      db.getDb().run(query, [autoForward ? 1 : 0, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, auto_forward: autoForward, changes: this.changes });
        }
      });
    });
  }

  // 删除Callback地址
  static delete(id) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM callback_urls WHERE id = ?`;
      
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

module.exports = CallbackUrl;