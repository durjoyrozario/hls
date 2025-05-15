CREATE DATABASE IF NOT EXISTS book_library;
USE book_library;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll VARCHAR(20) NOT NULL,
    reg VARCHAR(20) NOT NULL
);

INSERT INTO users (roll, reg) VALUES ('1234', '5678');

CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial INT,
    book_name VARCHAR(255),
    issue_date DATE,
    return_date DATE
);

INSERT INTO books (serial, book_name, issue_date, return_date) VALUES
(1, 'Pather Panchali', '2024-01-10', '2024-02-10'),
(2, 'Chander Pahar', '2024-01-15', '2024-02-15');