const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, 'callback.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err.message);
          reject(err);
        } else {
          console.log('数据库连接成功');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const queries = [
        // 应用表
        `CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          root_path TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        
        // Callback地址表
        `CREATE TABLE IF NOT EXISTS callback_urls (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          app_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          auto_forward BOOLEAN DEFAULT 0,
          response_status INTEGER DEFAULT 200,
          response_headers TEXT DEFAULT '{"Content-Type": "application/json"}',
          response_body TEXT DEFAULT '{"success": true, "message": "Callback接收成功"}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (app_id) REFERENCES applications (id) ON DELETE CASCADE
        )`,
        
        // 转发地址表
        `CREATE TABLE IF NOT EXISTS forward_urls (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          callback_url_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          enabled BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (callback_url_id) REFERENCES callback_urls (id) ON DELETE CASCADE
        )`,
        
        // 报文记录表
        `CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          callback_url_id INTEGER NOT NULL,
          method TEXT NOT NULL,
          headers TEXT,
          body TEXT,
          query_params TEXT,
          ip_address TEXT,
          user_agent TEXT,
          received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (callback_url_id) REFERENCES callback_urls (id) ON DELETE CASCADE
        )`,
        
        // 转发记录表
        `CREATE TABLE IF NOT EXISTS forward_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id INTEGER NOT NULL,
          forward_url_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          response_code INTEGER,
          response_body TEXT,
          error_message TEXT,
          forwarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
          FOREIGN KEY (forward_url_id) REFERENCES forward_urls (id) ON DELETE CASCADE
        )`
      ];

      let completed = 0;
      queries.forEach((query, index) => {
        this.db.run(query, (err) => {
          if (err) {
            console.error(`创建表失败 (${index}):`, err.message);
            reject(err);
          } else {
            completed++;
            if (completed === queries.length) {
              console.log('数据表创建完成');
              this.migrateDatabase().then(() => {
                resolve();
              }).catch(reject);
            }
          }
        });
      });
    });
  }

  async migrateDatabase() {
    return new Promise((resolve, reject) => {
      // 检查是否需要添加响应配置字段
      this.db.all("PRAGMA table_info(callback_urls)", (err, columns) => {
        if (err) {
          console.error('检查表结构失败:', err);
          reject(err);
          return;
        }

        const hasResponseFields = columns.some(col => 
          col.name === 'response_status' || 
          col.name === 'response_headers' || 
          col.name === 'response_body'
        );

        if (!hasResponseFields) {
          console.log('开始迁移数据库，添加响应配置字段...');
          const migrations = [
            'ALTER TABLE callback_urls ADD COLUMN response_status INTEGER DEFAULT 200',
            'ALTER TABLE callback_urls ADD COLUMN response_headers TEXT DEFAULT \'{"Content-Type": "application/json"}\'',
            'ALTER TABLE callback_urls ADD COLUMN response_body TEXT DEFAULT \'{"success": true, "message": "Callback接收成功"}\''
          ];

          let migrationCompleted = 0;
          migrations.forEach((migration, index) => {
            this.db.run(migration, (err) => {
              if (err && !err.message.includes('duplicate column name')) {
                console.error(`迁移失败 (${index}):`, err.message);
                reject(err);
              } else {
                migrationCompleted++;
                if (migrationCompleted === migrations.length) {
                  console.log('数据库迁移完成');
                  resolve();
                }
              }
            });
          });
        } else {
          console.log('数据库已是最新版本');
          resolve();
        }
      });
    });
  }

  getDb() {
    return this.db;
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('关闭数据库失败:', err.message);
        } else {
          console.log('数据库连接已关闭');
        }
      });
    }
  }
}

module.exports = new Database();