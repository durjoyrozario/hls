<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents("php://input"));
$conn = new mysqli("localhost", "root", "", "book_library");
$conn->query("DELETE FROM books");
foreach ($data as $book) {
  $stmt = $conn->prepare("INSERT INTO books (serial, book_name, issue_date, return_date) VALUES (?, ?, ?, ?)");
  $stmt->bind_param("isss", $book->serial, $book->book_name, $book->issue_date, $book->return_date);
  $stmt->execute();
}
echo json_encode(["success" => true]);
?>