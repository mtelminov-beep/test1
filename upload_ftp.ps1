# FTP Upload Script
# Скрипт для загрузки файлов проекта на FTP-сервер

# ПРАВИЛЬНЫЕ УЧЕТНЫЕ ДАННЫЕ
$ftpServer = "31.31.197.18"
$ftpUser = "u3330187"
$ftpPass = "tJ946sqTFelGI8TV"
$ftpPort = 21
$ftpPath = "/"

# Создаем URI для FTP
$ftpUri = "ftp://$ftpServer$ftpPath"

# Список файлов для загрузки (ВСЕ НЕОБХОДИМЫЕ ФАЙЛЫ)
$filesToUpload = @(
    "index.html",
    "history.html",
    "style.css",
    "app.js",
    "data.js",
    "logo.png",
    "api_server.py",
    "passenger_wsgi.py",
    ".htaccess",
    "requirements.txt"
)

Write-Host "Начинаю загрузку файлов на FTP-сервер..." -ForegroundColor Green
Write-Host "Сервер: $ftpServer" -ForegroundColor Cyan
Write-Host "Пользователь: $ftpUser" -ForegroundColor Cyan
Write-Host ""

$uploadedCount = 0
$failedCount = 0

foreach ($file in $filesToUpload) {
    if (Test-Path $file) {
        try {
            $fileInfo = Get-Item $file
            $fileName = $fileInfo.Name
            $filePath = $fileInfo.FullName
            $ftpFileUri = "$ftpUri$fileName"
            
            Write-Host "Загрузка: $fileName..." -ForegroundColor Yellow -NoNewline
            
            # Создаем FTP запрос
            $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpFileUri)
            $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
            $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
            $ftpRequest.UseBinary = $true
            $ftpRequest.UsePassive = $true
            $ftpRequest.KeepAlive = $false
            
            # Читаем файл и загружаем
            $fileContent = [System.IO.File]::ReadAllBytes($filePath)
            $ftpRequest.ContentLength = $fileContent.Length
            
            $requestStream = $ftpRequest.GetRequestStream()
            $requestStream.Write($fileContent, 0, $fileContent.Length)
            $requestStream.Close()
            
            # Получаем ответ
            $response = $ftpRequest.GetResponse()
            $response.Close()
            
            Write-Host " OK" -ForegroundColor Green
            $uploadedCount++
            
        } catch {
            Write-Host " ОШИБКА: $_" -ForegroundColor Red
            $failedCount++
        }
    } else {
        Write-Host "Файл не найден: $file" -ForegroundColor Red
        $failedCount++
    }
}

Write-Host ""
Write-Host "Загрузка завершена!" -ForegroundColor Green
Write-Host "Успешно загружено: $uploadedCount" -ForegroundColor Green
Write-Host "Ошибок: $failedCount" -ForegroundColor $(if ($failedCount -eq 0) { "Green" } else { "Red" })

