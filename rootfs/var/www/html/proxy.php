<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$baseUrl = 'http://' . getenv('AIRCON_SERVER_IP') . ':' . getenv('AIRCON_SERVER_PORT');
$envPassword = getenv('AIRCON_SERVER_PASSWORD') ?: '';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? '';

// For non-login actions, authenticate first using configured password (if set)
if ($action !== 'login') {
    $pw = $envPassword ?: '';
    if ($pw !== '') {
        $loginUrl = $baseUrl . '/login?password=' . urlencode($pw);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $loginUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/xml']);
        curl_exec($ch);
        curl_close($ch);
    }
}

switch ($action) {
    case 'login':
        // Prefer configured password from environment; fall back to provided GET param if present
        $password = $envPassword ?: ($_GET['password'] ?? '');
        $url = $baseUrl . '/login?password=' . urlencode($password);
        break;
    case 'getSystemData':
        $url = $baseUrl . '/getSystemData';
        break;
    case 'getZoneData':
        $zone = $_GET['zone'] ?? '';
        $url = $baseUrl . '/getZoneData?zone=' . urlencode($zone);
        break;
    case 'setSystemData':
        $params = $_GET;
        unset($params['action']);
        $query = http_build_query($params);
        $url = $baseUrl . '/setSystemData?' . $query;
        break;
    case 'setZoneData':
        $params = $_GET;
        unset($params['action']);
        $query = http_build_query($params);
        $url = $baseUrl . '/setZoneData?' . $query;
        break;
    case 'setClock':
        $params = $_GET;
        unset($params['action']);
        $query = http_build_query($params);
        $url = $baseUrl . '/setClock?' . $query;
        break;
    case 'setZoneTimer':
        $params = $_GET;
        unset($params['action']);
        $query = http_build_query($params);
        $url = $baseUrl . '/setZoneTimer?' . $query;
        break;
    case 'getZoneTimer':
        $zone = $_GET['zone'] ?? '';
        $url = $baseUrl . '/getZoneTimer?zone=' . urlencode($zone);
        break;
    default:
        echo json_encode(['error' => 'Invalid action']);
        exit;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/xml']);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode == 200) {
    // Return the XML as is, or parse to JSON if needed
    // For simplicity, return XML wrapped in JSON
    echo json_encode(['success' => true, 'data' => $response]);
} else {
    echo json_encode(['success' => false, 'error' => 'HTTP ' . $httpCode]);
}
?>