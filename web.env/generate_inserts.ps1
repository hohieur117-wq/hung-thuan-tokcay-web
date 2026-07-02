$content = Get-Content "c:\Users\LEGION\Desktop\web.env\san_pham.ini"

function Get-Tags {
    param([string]$Name, [string]$Desc)
    
    $tags = @()
    $text = ($Name + " " + $Desc).ToLower()
    
    if ($text -match "bánh gạo|tokbokki|topokki") { $tags += "Bánh gạo/Tokbokki" }
    if ($text -match "mì|mỳ|udon|chajang|ramen|miến") { $tags += "Mì Hàn Quốc" }
    if ($text -match "xúc xích|chả cá|chả hải sản|thanh cua|surimi|chả|naruto|chạo") { $tags += "Xúc xích & Chả cá" }
    if ($text -match "gia vị|xốt|sốt|tương|dầu|nước chấm|nước mắm|giấm|muối|đường|bột ớt|bột") { $tags += "Gia vị & Xốt" }
    if ($text -match "phô mai|mozzarella") { $tags += "Phô mai" }
    if ($text -match "viên thả lẩu|đậu hủ|cá viên|tôm viên|bò viên|cua viên|túi tiền") { $tags += "Viên thả lẩu" }
    if ($text -match "rong biển") { $tags += "Rong biển" }
    if ($text -match "gà rán|đùi gà|cánh gà|gà chiên|gà karaage|gà viên") { $tags += "Gà rán/Gà chiên" }
    if ($text -match "bánh sữa|bánh xếp|mandu|há cảo|xíu mại|bánh bao|chả giò|bánh tuyết") { $tags += "Dimsum & Bánh ăn vặt" }
    
    if ($tags.Count -eq 0) { $tags += "Khác" }
    
    $tags = $tags | Select-Object -Unique
    return $tags
}

$products = @()

foreach ($line in $content) {
    $line = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    
    # regex: \[(.*?)\]\s*(.*?)\s*-\s*Giá:\s*(.*?)\s*-\s*Mô tả:\s*(.*)
    if ($line -match "\[(.*?)\]\s*(.*?)\s*-\s*Giá:\s*(.*?)\s*-\s*Mô tả:\s*(.*)") {
        $sku = $matches[1].Trim()
        $name = $matches[2].Trim()
        $priceStr = $matches[3].Trim()
        $desc = $matches[4].Trim()
        
        $desc = $desc -replace "\[cite:\s*\d+\]", ""
        $desc = $desc.Trim()
        
        $priceClean = $priceStr -replace "[^\d]", ""
        $price = 0
        if (-not [string]::IsNullOrWhiteSpace($priceClean)) {
            $price = [int]$priceClean
        }
        
        $tags = Get-Tags -Name $name -Desc $desc
        
        $obj = New-Object PSObject -Property @{
            Sku = $sku
            Name = $name
            Price = $price
            Desc = $desc
            Tags = $tags
        }
        $products += $obj
    }
}

$chunkSize = 50
$chunkIndex = 1
$counter = 0

$sql = "INSERT INTO products (sku, name, price, description, tags, image_url) VALUES `n"
$values = @()

$utf8NoBom = New-Object System.Text.UTF8Encoding $False

foreach ($p in $products) {
    $n = $p.Name -replace "'", "''"
    $d = $p.Desc -replace "'", "''"
    
    $tagStrings = @()
    foreach ($t in $p.Tags) {
        $tagStrings += "'$t'"
    }
    $tStr = "ARRAY[" + ($tagStrings -join ", ") + "]::TEXT[]"
    
    $values += "('$($p.Sku)', '$n', $($p.Price), '$d', $tStr, NULL)"
    
    $counter++
    
    if ($counter -eq $chunkSize) {
        $sql += ($values -join ",`n") + ";"
        $outPath = "c:\Users\LEGION\Desktop\web.env\insert_chunk_$chunkIndex.sql"
        
        # If Get-Content read it as Default, it's actually UTF8 byte decoded as ANSI.
        # We need to turn the ANSI string BACK to Default bytes, then parse as UTF8 bytes!
        $bytes = [System.Text.Encoding]::Default.GetBytes($sql)
        $trueString = [System.Text.Encoding]::UTF8.GetString($bytes)
        [System.IO.File]::WriteAllText($outPath, $trueString, $utf8NoBom)
        
        $chunkIndex++
        $counter = 0
        $sql = "INSERT INTO products (sku, name, price, description, tags, image_url) VALUES `n"
        $values = @()
    }
}

if ($counter -gt 0) {
    $sql += ($values -join ",`n") + ";"
    $outPath = "c:\Users\LEGION\Desktop\web.env\insert_chunk_$chunkIndex.sql"
    
    $bytes = [System.Text.Encoding]::Default.GetBytes($sql)
    $trueString = [System.Text.Encoding]::UTF8.GetString($bytes)
    [System.IO.File]::WriteAllText($outPath, $trueString, $utf8NoBom)
}

Write-Host "Generated $chunkIndex chunk files for $($products.Count) products."
