/**
 * Google Apps Script Backend for XpenseFlow Premium
 * UPDATED: Added Comment column support and region fix
 */

var DRIVE_FOLDER_ID = 'ВАШ_ID_ПАПКИ_DRIVE'; // ID папки для чеков

function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        var now = new Date();
        var sheetName = (now.getMonth() + 1) + "-" + now.getFullYear();

        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName(sheetName);

        // 1. Создание листа для текущего месяца, если его нет
        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            sheet.appendRow(["Дата/Час", "Тип", "Регіон", "ПІБ", "Категорія/Програма", "Сума", "Компенсація", "Деталі/Коментар", "Посилання на PDF"]);
            // Закрепить верхнюю строку
            sheet.setFrozenRows(1);
            // Сделать заголовки жирными
            sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f3f3f3");
        }

        var fileUrl = "";

        // 2. Обработка PDF файла
        if (data.file && data.fileName) {
            try {
                var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
                var blob = Utilities.newBlob(Utilities.base64Decode(data.file), "application/pdf", data.fileName);
                var file = folder.createFile(blob);
                fileUrl = file.getUrl();
            } catch (fErr) {
                console.error("File upload failed: " + fErr);
                fileUrl = "Помилка завантаження файлу";
            }
        }

        // 3. Запись данных
        if (data.type === 'COMPENSATION') {
            sheet.appendRow([
                data.timestamp,
                "Компенсація",
                data.region,
                data.pib,
                data.program,
                data.checkAmount,
                data.compensationAmount,
                "-", // Коментар відсутній у формі компенсацій
                fileUrl
            ]);
        } else {
            sheet.appendRow([
                data.timestamp,
                "Витрати",
                data.region,
                data.name,
                data.type,
                data.amount,
                "-",
                data.comment || "-",
                "-"
            ]);
        }

        return ContentService.createTextOutput(JSON.stringify({ "status": "success", "url": fileUrl }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
