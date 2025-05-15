<?php
header('Content-Type: application/json');
$data = json_decode(file_get_contents("php://input"));
$conn = new mysqli("localhost", "root", "", "book_library");
$stmt = $conn->prepare("SELECT * FROM users WHERE roll=? AND reg=?");
$stmt->bind_param("ss", $data->roll, $data->reg);
$stmt->execute();
$result = $stmt->get_result();
echo json_encode(["success" => $result->num_rows > 0]);
?>