var DRIVE_FOLDER_ID = '1R2hSM6ydEHmYjtT9RscEa72p8R_itBga';
var HEADERS = ["Дата/Час", "Тип", "Регіон", "ПІБ", "Категорія/Програма", "Сума чек", "До виплати", "Коментар", "Посилання на PDF", "ID", "Статус"];

function doGet(e) {
    try {
        var action = e.parameter.action;
        var name = e.parameter.name;

        if (action === "getHistory" && name) {
            return getHistory(name);
        }

        return ContentService.createTextOutput("KIVI Portal Backend: CONNECTED ✅");
    } catch (err) {
        return createResponse("error", err.toString());
    }
}

function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        var action = data.action || "ADD";

        if (action === "CANCEL") {
            return cancelEntry(data.id);
        }

        // Default ADD logic
        return addEntry(data);

    } catch (err) {
        return createResponse("error", err.toString());
    }
}

function addEntry(data) {
    var now = new Date();
    var monthYear = (now.getMonth() + 1) + "-" + now.getFullYear();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss, monthYear);

    var fileUrls = [];
    var filesToProcess = data.files || (data.file ? [{ base64: data.file, name: data.fileName, type: "application/pdf" }] : []);

    if (filesToProcess.length > 0) {
        var rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        var typeName = data.type === 'COMPENSATION' ? "Компенсації" : "Витрати";
        var typeFolder = getOrCreateFolder(rootFolder, typeName);
        var monthFolder = getOrCreateFolder(typeFolder, monthYear);
        var userName = data.pib || data.name || "Unknown";
        var userFolder = getOrCreateFolder(monthFolder, userName);

        filesToProcess.forEach(function (f) {
            var blob = Utilities.newBlob(Utilities.base64Decode(f.base64), f.type || "application/pdf", f.name);
            var file = userFolder.createFile(blob);
            fileUrls.push(file.getUrl());
        });
    }

    var fileUrl = fileUrls.length > 0 ? fileUrls.join(", ") : "-";
    var entryId = "ID-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // Prepare row data based on HEADERS
    var rowData = new Array(HEADERS.length).fill("-");
    rowData[0] = now;
    rowData[1] = data.type === 'COMPENSATION' ? "Компенсація" : "Витрати";
    rowData[2] = data.region || "-";
    rowData[3] = data.pib || data.name || "-";
    rowData[4] = data.program || data.type || "-";
    rowData[5] = data.type === 'COMPENSATION' ? data.checkAmount : data.amount;
    rowData[6] = data.type === 'COMPENSATION' ? data.compensationAmount : "-";
    rowData[7] = data.comment || "-";
    rowData[8] = fileUrl;
    rowData[9] = entryId;
    rowData[10] = "Активно";

    sheet.appendRow(rowData);
    return createResponse("success", "Entry added", { id: entryId });
}

function getHistory(userName) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var results = [];

    // Перевіряємо за останні 2 місяці
    var months = [];
    var now = new Date();
    for (var i = 0; i < 2; i++) {
        var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push((d.getMonth() + 1) + "-" + d.getFullYear());
    }

    months.forEach(function (m) {
        var sheet = ss.getSheetByName(m);
        if (sheet) {
            var data = sheet.getDataRange().getValues();
            var headers = data[0];
            var nameIdx = headers.indexOf("ПІБ");

            for (var r = 1; r < data.length; r++) {
                if (data[r][nameIdx] === userName) {
                    var entry = {};
                    headers.forEach(function (h, idx) {
                        entry[h] = data[r][idx];
                    });
                    results.push(entry);
                }
            }
        }
    });

    // Сортування по даті (нові зверху)
    results.sort(function (a, b) { return new Date(b["Дата/Час"]) - new Date(a["Дата/Час"]); });

    return createResponse("success", "History fetched", results);
}

function cancelEntry(id) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();

    for (var i = 0; i < sheets.length; i++) {
        var sheet = sheets[i];
        var data = sheet.getDataRange().getValues();
        var headers = data[0];
        var idIdx = headers.indexOf("ID");
        var statusIdx = headers.indexOf("Статус");

        if (idIdx === -1 || statusIdx === -1) continue;

        for (var r = 1; r < data.length; r++) {
            if (data[r][idIdx] === id) {
                sheet.getRange(r + 1, statusIdx + 1).setValue("Скасовано (Користувачем)");
                return createResponse("success", "Entry cancelled");
            }
        }
    }
    return createResponse("error", "Entry not found");
}

// Helpers
function getOrCreateSheet(ss, name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
        sheet = ss.insertSheet(name);
        sheet.appendRow(HEADERS);
        sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#f3f3f3");
        sheet.setFrozenRows(1);
    } else {
        // Оновлюємо заголовки якщо вони змінилися
        var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        if (currentHeaders.length < HEADERS.length) {
            HEADERS.forEach(function (h, idx) {
                if (currentHeaders.indexOf(h) === -1) {
                    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h).setFontWeight("bold").setBackground("#f3f3f3");
                }
            });
        }
    }
    return sheet;
}

function getOrCreateFolder(parent, name) {
    var folders = parent.getFoldersByName(name);
    return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function createResponse(status, message, data) {
    var output = { status: status, message: message };
    if (data) output.data = data;
    var result = ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
    return result;
}
