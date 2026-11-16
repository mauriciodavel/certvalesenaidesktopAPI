export const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT, email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL, name VARCHAR(120) NOT NULL,
    role ENUM('admin','viewer') NOT NULL DEFAULT 'viewer', active BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INT NOT NULL DEFAULT 0, locked_until DATETIME NULL,
    last_login_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER active`,
  `CREATE TABLE IF NOT EXISTS dataset_versions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT, dataset_type ENUM('teorico','pratico') NOT NULL,
    filename VARCHAR(255) NOT NULL, checksum CHAR(64) NOT NULL, row_count INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE, uploaded_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_active (dataset_type,is_active), FOREIGN KEY (uploaded_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS candidate_results (
    id BIGINT PRIMARY KEY AUTO_INCREMENT, version_id BIGINT NOT NULL,
    dataset_type ENUM('teorico','pratico') NOT NULL, candidate_key VARCHAR(120) NOT NULL,
    matricula VARCHAR(60) NOT NULL, prova VARCHAR(80) NOT NULL, nome VARCHAR(255) NOT NULL,
    genero VARCHAR(40) NULL, gerencia VARCHAR(180) NULL, coordenacao VARCHAR(255) NULL,
    turno VARCHAR(80) NULL, data_aplicacao DATE NULL, nota DECIMAL(8,4) NULL,
    resultado VARCHAR(80) NULL, objects_json JSON NOT NULL, raw_json JSON NOT NULL,
    UNIQUE KEY uq_version_candidate (version_id,candidate_key),
    INDEX idx_candidate (candidate_key), FOREIGN KEY (version_id) REFERENCES dataset_versions(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS import_staging (
    id CHAR(36) PRIMARY KEY, dataset_type ENUM('teorico','pratico') NOT NULL,
    filename VARCHAR(255) NOT NULL, checksum CHAR(64) NOT NULL, payload_json JSON NOT NULL,
    comparison_json JSON NOT NULL, created_by BIGINT NOT NULL,
    expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS update_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT, dataset_type ENUM('teorico','pratico') NOT NULL,
    filename VARCHAR(255) NOT NULL, checksum CHAR(64) NOT NULL, added_count INT NOT NULL,
    changed_count INT NOT NULL, removed_count INT NOT NULL, unchanged_count INT NOT NULL,
    total_count INT NOT NULL, status ENUM('success','failed') NOT NULL,
    detail VARCHAR(500) NULL, performed_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id), INDEX idx_log_created (created_at)
  )`
];
