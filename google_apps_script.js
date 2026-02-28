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

        if (!sheet) {
            sheet = ss.insertSheet(monthYear);
            // Оновлений заголовок з колонкою "Коментар"
            sheet.appendRow(["Дата/Час", "Тип", "Регіон", "ПІБ", "Категорія/Програма", "Сума чек", "До виплати", "Коментар", "Посилання на PDF"]);
            sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f3f3f3");
            // Закріпити верхній рядок
            sheet.setFrozenRows(1);
        }

        var fileUrl = "-";
        if (data.file && data.fileName) {
            // 1. Отримуємо кореневу папку проекту
            var rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

            // 2. Шукаємо або створюємо папку місяця (напр. "2-2026")
            var monthFolders = rootFolder.getFoldersByName(monthYear);
            var monthFolder = monthFolders.hasNext() ? monthFolders.next() : rootFolder.createFolder(monthYear);

            // 3. Шукаємо або створюємо папку співробітника всередині місяця
            var userName = data.pib || data.name || "Unknown";
            var userFolders = monthFolder.getFoldersByName(userName);
            var userFolder = userFolders.hasNext() ? userFolders.next() : monthFolder.createFolder(userName);

            // 4. Зберігаємо файл у папку співробітника
            var blob = Utilities.newBlob(Utilities.base64Decode(data.file), "application/pdf", data.fileName);
            var file = userFolder.createFile(blob);
            fileUrl = file.getUrl();
        }

        // Запис у таблицю (додано data.comment)
        if (data.type === 'COMPENSATION') {
            sheet.appendRow([
                new Date(),
                "Компенсація",
                data.region,
                data.pib,
                data.program,
                data.checkAmount,
                data.compensationAmount,
                "-", // Коментар для компенсацій зазвичай порожній
                fileUrl
            ]);
        } else {
            sheet.appendRow([
                new Date(),
                "Витрати",
                data.region,
                data.name,
                data.type,
                data.amount,
                "-",
                data.comment || "-", // Ось сюди потрапляє коментар
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
