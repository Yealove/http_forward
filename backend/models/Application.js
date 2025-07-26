const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');

class Application {
  // 创建应用
  static create(name) {
    return new Promise((resolve, reject) => {
      const rootPath = uuidv4().replace(/-/g, '').substring(0, 16);
      const query = `INSERT INTO applications (name, root_path) VALUES (?, ?)`;
      
      db.getDb().run(query, [name, rootPath], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            name,
            root_path: rootPath,
            created_at: new Date().toISOString()
          });
        }
      });
    });
  }

  // 获取所有应用
  static getAll() {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM applications ORDER BY created_at DESC`;
      
      db.getDb().all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 根据ID获取应用
  static getById(id) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM applications WHERE id = ?`;
      
      db.getDb().get(query, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 根据根路径获取应用
  static getByRootPath(rootPath) {
    return new Promise((resolve, reject) => {
      const query = `SELECT * FROM applications WHERE root_path = ?`;
      
      db.getDb().get(query, [rootPath], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 更新应用
  static update(id, name) {
    return new Promise((resolve, reject) => {
      const query = `UPDATE applications SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      
      db.getDb().run(query, [name, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, name, changes: this.changes });
        }
      });
    });
  }

  // 删除应用
  static delete(id) {
    return new Promise((resolve, reject) => {
      const query = `DELETE FROM applications WHERE id = ?`;
      
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

module.exports = Application;