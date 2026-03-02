var DRIVE_FOLDER_ID = '1R2hSM6ydEHmYjtT9RscEa72p8R_itBga';

function doGet() {
    return ContentService.createTextOutput("KIVI Portal Backend: CONNECTED ✅");
}

function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        var now = new Date();
        var monthYear = (now.getMonth() + 1) + "-" + now.getFullYear();

        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName(monthYear);

        // 1. Якщо листа немає - створюємо
        if (!sheet) {
            sheet = ss.insertSheet(monthYear);
            sheet.appendRow(["Дата/Час", "Тип", "Регіон", "ПІБ", "Категорія/Програма", "Сума чек", "До виплати", "Коментар", "Посилання на PDF"]);
            sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f3f3f3");
            sheet.setFrozenRows(1);
        } else {
            // 2. Якщо лист є - перевіряємо чи є колонка "Коментар" (потрібно для переходу на нову версію)
            var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            if (headers.indexOf("Коментар") === -1) {
                // Якщо колонки немає, додаємо її перед останньою колонкою (Посилання на PDF)
                sheet.insertColumnBefore(sheet.getLastColumn());
                sheet.getRange(1, sheet.getLastColumn() - 1).setValue("Коментар").setFontWeight("bold").setBackground("#f3f3f3");
            }
        }

        // Отримуємо актуальні заголовки після перевірки
        var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var commentColIdx = currentHeaders.indexOf("Коментар") + 1;
        var pdfColIdx = currentHeaders.indexOf("Посилання на PDF") + 1;

        var fileUrls = [];
        var filesToProcess = [];

        if (data.files && Array.isArray(data.files)) {
            filesToProcess = data.files;
        } else if (data.file && data.fileName) {
            filesToProcess = [{
                base64: data.file,
                name: data.fileName,
                type: "application/pdf"
            }];
        }

        if (filesToProcess.length > 0) {
            var rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

            // Створюємо папку за типом (Витрати або Компенсації)
            var typeName = data.type === 'COMPENSATION' ? "Компенсації" : "Витрати";
            var typeFolders = rootFolder.getFoldersByName(typeName);
            var typeFolder = typeFolders.hasNext() ? typeFolders.next() : rootFolder.createFolder(typeName);

            var monthFolders = typeFolder.getFoldersByName(monthYear);
            var monthFolder = monthFolders.hasNext() ? monthFolders.next() : typeFolder.createFolder(monthYear);

            var userName = data.pib || data.name || "Unknown";
            var userFolders = monthFolder.getFoldersByName(userName);
            var userFolder = userFolders.hasNext() ? userFolders.next() : monthFolder.createFolder(userName);

            filesToProcess.forEach(function (f) {
                var mimeType = f.type || "application/pdf";
                var blob = Utilities.newBlob(Utilities.base64Decode(f.base64), mimeType, f.name);
                var file = userFolder.createFile(blob);
                fileUrls.push(file.getUrl());
            });
        }

        var fileUrl = fileUrls.length > 0 ? fileUrls.join(", ") : "-";

        // Підготовка рядка для запису
        var rowData = new Array(currentHeaders.length).fill("-");
        rowData[0] = new Date(); // Дата/Час
        rowData[1] = data.type === 'COMPENSATION' ? "Компенсація" : "Витрати";
        rowData[2] = data.region || "-";
        rowData[3] = data.pib || data.name || "-";
        rowData[4] = data.program || data.type || "-";

        if (data.type === 'COMPENSATION') {
            rowData[5] = data.checkAmount;
            rowData[6] = data.compensationAmount;
        } else {
            rowData[5] = data.amount;
            rowData[6] = "-";
        }

        if (commentColIdx > 0) rowData[commentColIdx - 1] = data.comment || "-";
        if (pdfColIdx > 0) rowData[pdfColIdx - 1] = fileUrl;

        sheet.appendRow(rowData);

        return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
