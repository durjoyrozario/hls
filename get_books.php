<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost", "root", "", "book_library");
$result = $conn->query("SELECT * FROM books");
$books = [];
while($row = $result->fetch_assoc()) {
  $books[] = $row;
}
echo json_encode($books);
?>