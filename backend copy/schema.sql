CREATE DATABASE IF NOT EXISTS pesolend
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pesolend;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  role VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loans (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  product VARCHAR(120) NOT NULL,
  principal DOUBLE NOT NULL,
  balance DOUBLE NOT NULL,
  monthly_payment DOUBLE NOT NULL,
  next_due_date DATE NOT NULL,
  paid_count INT NOT NULL,
  total_count INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_loans_user_status (user_id, status),
  CONSTRAINT fk_loans_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  input_json LONGTEXT NOT NULL,
  result_json LONGTEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_applications_user_created (user_id, created_at),
  CONSTRAINT fk_applications_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_messages (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  message LONGTEXT NOT NULL,
  topic VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_support_messages_user_created (user_id, created_at),
  CONSTRAINT fk_support_messages_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
