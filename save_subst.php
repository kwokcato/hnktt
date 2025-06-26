<?php
// save_subst.php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csvData = $_POST['csvData'] ?? '';
    
    if (!empty($csvData)) {
        // 保存到文件
        file_put_contents('subst.csv', $csvData);
        echo '保存成功';
    } else {
        http_response_code(400);
        echo '無效的數據';
    }
} else {
    http_response_code(405);
    echo '方法不允許';
}
?>